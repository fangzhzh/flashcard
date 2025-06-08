
"use client";
import type { PomodoroSessionState } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore'; // Removed updateDoc
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/client';

const DEFAULT_POMODORO_MINUTES = 25;

interface PomodoroContextType {
  sessionState: PomodoroSessionState | null;
  timeLeftSeconds: number;
  isLoading: boolean;
  startPomodoro: (durationMinutes: number) => Promise<void>;
  pausePomodoro: () => Promise<void>;
  continuePomodoro: () => Promise<void>;
  giveUpPomodoro: () => Promise<void>;
  updateUserPreferredDuration: (minutes: number) => Promise<void>;
  updateNotes: (text: string) => Promise<void>;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const t = useI18n();

  const [sessionState, setSessionState] = useState<PomodoroSessionState | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(DEFAULT_POMODORO_MINUTES * 60);
  const [isLoading, setIsLoading] = useState(true);
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);

  const pomodoroDocRef = useCallback(() => {
    if (!user?.uid) return null;
    return doc(db, 'users', user.uid, 'pomodoro', 'state');
  }, [user?.uid]);

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!user?.uid) {
      setSessionState(null);
      setTimeLeftSeconds(DEFAULT_POMODORO_MINUTES * 60);
      setIsLoading(false);
      if (intervalId) clearInterval(intervalId);
      setIntervalId(null);
      return;
    }

    const docRef = pomodoroDocRef();
    if (!docRef) return;

    setIsLoading(true);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Omit<PomodoroSessionState, 'updatedAt' | 'userId'> & { updatedAt: Timestamp | number | null, userId: string };
        const newSessionState: PomodoroSessionState = {
          userId: data.userId || user.uid,
          status: data.status,
          targetEndTime: data.targetEndTime as number | null, // Firestore Timestamps are converted to numbers by SDK or by our logic
          pausedTimeLeftSeconds: data.pausedTimeLeftSeconds || null,
          currentSessionInitialDurationMinutes: data.currentSessionInitialDurationMinutes,
          userPreferredDurationMinutes: data.userPreferredDurationMinutes,
          notes: data.notes || '',
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (typeof data.updatedAt === 'number' ? data.updatedAt : Date.now()),
        };
        
        // Ensure targetEndTime is a number (ms) if it was stored as Firestore Timestamp and not yet converted
        if (newSessionState.targetEndTime && typeof newSessionState.targetEndTime !== 'number' && 'toDate' in (newSessionState.targetEndTime as any)) {
            newSessionState.targetEndTime = ((newSessionState.targetEndTime as any) as Timestamp).toMillis();
        }

        setSessionState(newSessionState);
        setIsLoading(false);
      } else {
        const initialDefaultState: PomodoroSessionState = {
          userId: user.uid,
          status: 'idle',
          targetEndTime: null,
          pausedTimeLeftSeconds: null,
          currentSessionInitialDurationMinutes: DEFAULT_POMODORO_MINUTES,
          userPreferredDurationMinutes: DEFAULT_POMODORO_MINUTES,
          notes: '',
          updatedAt: Date.now(),
        };
        setSessionState(initialDefaultState); 
        setIsLoading(false);

        const firestoreWriteState: Omit<PomodoroSessionState, 'updatedAt'> & {updatedAt: FieldValue} = {
            ...initialDefaultState,
            updatedAt: serverTimestamp() 
        };
        setDoc(docRef, firestoreWriteState).catch(error => {
          console.error("Error creating default pomodoro state in Firestore:", error);
        });
      }
    }, (error) => {
      console.error("Error fetching Pomodoro session state:", error);
       const fallbackState: PomodoroSessionState = {
          userId: user.uid,
          status: 'idle',
          targetEndTime: null,
          pausedTimeLeftSeconds: null,
          currentSessionInitialDurationMinutes: DEFAULT_POMODORO_MINUTES,
          userPreferredDurationMinutes: DEFAULT_POMODORO_MINUTES,
          notes: '',
          updatedAt: Date.now(),
      };
      setSessionState(fallbackState);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, pomodoroDocRef, intervalId]);


  useEffect(() => {
    // Clear existing interval if one exists from a previous state
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null); 
    }

    if (sessionState?.status === 'running' && sessionState.targetEndTime) {
      const updateTimer = () => {
        const currentTargetEndTime = sessionState.targetEndTime; // Use value from current sessionState
        if (!currentTargetEndTime) {
            console.warn("Timer status is 'running' but targetEndTime is null. Resetting to idle.");
            const docRef = pomodoroDocRef();
            if (docRef) setDoc(docRef, { status: 'idle', targetEndTime: null, pausedTimeLeftSeconds: null, updatedAt: serverTimestamp() }, { merge: true });
            return;
        }
        const now = Date.now();
        const remaining = Math.max(0, Math.round((currentTargetEndTime - now) / 1000));
        setTimeLeftSeconds(remaining);

        if (remaining === 0) {
          // Interval will be cleared at the top of the next effect run or on component unmount
          const docRef = pomodoroDocRef();
          if (docRef) {
            const currentPreferredDuration = sessionState?.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES;
            setDoc(docRef, { 
              status: 'idle', 
              targetEndTime: null,
              pausedTimeLeftSeconds: null,
              currentSessionInitialDurationMinutes: currentPreferredDuration,
              updatedAt: serverTimestamp() 
            }, { merge: true });
          }
          toast({
            title: t('pomodoro.toast.completed'),
            description: t('pomodoro.toast.completed.description'),
          });
        }
      };
      
      updateTimer(); 
      const newInterval = setInterval(updateTimer, 1000);
      setIntervalId(newInterval);

    } else if (sessionState?.status === 'paused' && sessionState.pausedTimeLeftSeconds !== null) {
      setTimeLeftSeconds(sessionState.pausedTimeLeftSeconds);
    } else if (sessionState?.status === 'idle' && sessionState.userPreferredDurationMinutes) {
      setTimeLeftSeconds(sessionState.userPreferredDurationMinutes * 60);
    } else if (sessionState?.status === 'idle' && !sessionState.userPreferredDurationMinutes) {
      setTimeLeftSeconds(DEFAULT_POMODORO_MINUTES * 60);
    }

    return () => {
      // This cleanup function uses the intervalId from the closure of when this effect ran.
      // This ensures it clears the correct interval.
      if (intervalId) { 
        clearInterval(intervalId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState?.status, sessionState?.targetEndTime, sessionState?.pausedTimeLeftSeconds, sessionState?.userPreferredDurationMinutes, t, toast]);
  // Removed pomodoroDocRef from deps here as it's called directly inside if needed and doesn't drive the timer logic itself.

  const startPomodoro = async (durationMinutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;

    const now = Date.now();
    const targetEndTime = now + durationMinutes * 60 * 1000;
    const newState: Partial<Omit<PomodoroSessionState, 'userId' | 'updatedAt'>> & {updatedAt: FieldValue; userId: string} = {
      userId: user.uid, // Ensure userId is always part of the update
      status: 'running',
      targetEndTime,
      currentSessionInitialDurationMinutes: durationMinutes,
      userPreferredDurationMinutes: durationMinutes, 
      pausedTimeLeftSeconds: null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, newState, { merge: true }).catch(e => console.error("Error starting pomodoro:", e));
  };

  const pausePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState || sessionState.status !== 'running' || !sessionState.targetEndTime) return;

    // No need to clear intervalId here, the useEffect will handle it when status changes
    
    const now = Date.now();
    const pausedTimeLeft = Math.max(0, Math.round((sessionState.targetEndTime - now) / 1000));
    const newState: Partial<Omit<PomodoroSessionState, 'userId' | 'updatedAt'>> & {updatedAt: FieldValue; userId: string} = {
      userId: user!.uid,
      status: 'paused',
      pausedTimeLeftSeconds: pausedTimeLeft,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, newState, { merge: true }).catch(e => console.error("Error pausing pomodoro:", e));
  };

  const continuePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState || sessionState.status !== 'paused' || sessionState.pausedTimeLeftSeconds === null) return;

    const now = Date.now();
    const newTargetEndTime = now + sessionState.pausedTimeLeftSeconds * 1000;
    const newState: Partial<Omit<PomodoroSessionState, 'userId' | 'updatedAt'>> & {updatedAt: FieldValue; userId: string} = {
      userId: user!.uid,
      status: 'running',
      targetEndTime: newTargetEndTime,
      pausedTimeLeftSeconds: null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, newState, { merge: true }).catch(e => console.error("Error continuing pomodoro:", e));
  };

  const giveUpPomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState) return;
    
    const newState: Partial<Omit<PomodoroSessionState, 'userId' | 'updatedAt'>> & {updatedAt: FieldValue; userId: string} = {
      userId: user!.uid,
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, newState, { merge: true }).catch(e => console.error("Error giving up pomodoro:", e));
  };

  const updateUserPreferredDuration = async (minutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState || !user?.uid) return;
    const newDuration = Math.max(1, Math.min(minutes, 120)); 
    
    const updateData: Partial<Omit<PomodoroSessionState, 'userId' | 'updatedAt'>> & {updatedAt: FieldValue; userId: string} = {
        userId: user.uid,
        userPreferredDurationMinutes: newDuration,
        updatedAt: serverTimestamp(),
    };
    if(sessionState.status === 'idle') {
        updateData.currentSessionInitialDurationMinutes = newDuration;
    }

    await setDoc(docRef, updateData, { merge: true }).catch(e => console.error("Error updating duration:", e));
  };

  const updateNotes = async (text: string) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;
    await setDoc(docRef, { userId: user.uid, notes: text, updatedAt: serverTimestamp() }, { merge: true }).catch(e => console.error("Error updating notes:", e));
  };

  return (
    <PomodoroContext.Provider value={{ 
      sessionState, 
      timeLeftSeconds, 
      isLoading: isLoading || authLoading, 
      startPomodoro, 
      pausePomodoro, 
      continuePomodoro, 
      giveUpPomodoro,
      updateUserPreferredDuration,
      updateNotes
    }}>
      {children}
    </PomodoroContext.Provider>
  );
};

export const usePomodoro = () => {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
};

