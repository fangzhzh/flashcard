
"use client";
import type { PomodoroSessionState } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore';
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
        const data = snapshot.data() as Omit<PomodoroSessionState, 'updatedAt' | 'userId'> & { updatedAt: Timestamp | number | null, userId?: string }; // userId might be missing in old docs
        const newSessionState: PomodoroSessionState = {
          userId: data.userId || user.uid, // Ensure userId is always present
          status: data.status,
          targetEndTime: data.targetEndTime as number | null,
          pausedTimeLeftSeconds: data.pausedTimeLeftSeconds || null,
          currentSessionInitialDurationMinutes: data.currentSessionInitialDurationMinutes,
          userPreferredDurationMinutes: data.userPreferredDurationMinutes,
          notes: data.notes || '',
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (typeof data.updatedAt === 'number' ? data.updatedAt : Date.now()),
        };
        
        if (newSessionState.targetEndTime && typeof newSessionState.targetEndTime !== 'number' && 'toDate' in (newSessionState.targetEndTime as any)) {
            newSessionState.targetEndTime = ((newSessionState.targetEndTime as any) as Timestamp).toMillis();
        }
        setSessionState(newSessionState);
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
        const firestoreWriteState: Omit<PomodoroSessionState, 'updatedAt'> & {updatedAt: FieldValue} = {
            ...initialDefaultState,
            updatedAt: serverTimestamp() 
        };
        setDoc(docRef, firestoreWriteState).catch(error => {
          console.error("Error creating default pomodoro state in Firestore:", error);
        });
      }
      setIsLoading(false);
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
  }, [user, authLoading, pomodoroDocRef]);


  useEffect(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null); 
    }

    if (!sessionState) return; // Guard against null sessionState

    if (sessionState.status === 'running' && sessionState.targetEndTime) {
      const updateTimer = () => {
        const currentTargetEndTime = sessionState.targetEndTime; 
        if (!currentTargetEndTime) {
            console.warn("Timer status is 'running' but targetEndTime is null. Resetting to idle.");
            const docRef = pomodoroDocRef();
            if (docRef && user?.uid) {
                setDoc(docRef, { userId: user.uid, status: 'idle', targetEndTime: null, pausedTimeLeftSeconds: null, updatedAt: serverTimestamp() }, { merge: true });
            }
            return;
        }
        const now = Date.now();
        const remaining = Math.max(0, Math.round((currentTargetEndTime - now) / 1000));
        setTimeLeftSeconds(remaining);

        if (remaining === 0) {
          const docRef = pomodoroDocRef();
          if (docRef && user?.uid) {
            const currentPreferredDuration = sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES;
            setDoc(docRef, { 
              userId: user.uid,
              status: 'idle', 
              targetEndTime: null,
              pausedTimeLeftSeconds: null,
              currentSessionInitialDurationMinutes: currentPreferredDuration, // Reset to preferred
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

    } else if (sessionState.status === 'paused' && sessionState.pausedTimeLeftSeconds !== null) {
      setTimeLeftSeconds(sessionState.pausedTimeLeftSeconds);
    } else if (sessionState.status === 'idle') {
      setTimeLeftSeconds((sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES) * 60);
    }

    return () => {
      if (intervalId) { 
        clearInterval(intervalId);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, pomodoroDocRef, user?.uid, t, toast]); // Rely on sessionState object itself

  const startPomodoro = async (durationMinutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;

    const now = Date.now();
    const targetEndTime = now + durationMinutes * 60 * 1000;
    const newState: PomodoroSessionState = { // Construct a full state object
      userId: user.uid,
      status: 'running',
      targetEndTime,
      currentSessionInitialDurationMinutes: durationMinutes,
      userPreferredDurationMinutes: durationMinutes, 
      pausedTimeLeftSeconds: null,
      notes: sessionState?.notes || '', // Preserve existing notes
      updatedAt: serverTimestamp(), // This will be FieldValue for Firestore
    };
    await setDoc(docRef, newState, { merge: true }).catch(e => console.error("Error starting pomodoro:", e));
  };

  const pausePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState || sessionState.status !== 'running' || !sessionState.targetEndTime || !user?.uid) return;
    
    const now = Date.now();
    const pausedTimeLeft = Math.max(0, Math.round((sessionState.targetEndTime - now) / 1000));
    const updateData = {
      userId: user.uid,
      status: 'paused',
      pausedTimeLeftSeconds: pausedTimeLeft,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, updateData, { merge: true }).catch(e => console.error("Error pausing pomodoro:", e));
  };

  const continuePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState || sessionState.status !== 'paused' || sessionState.pausedTimeLeftSeconds === null || !user?.uid) return;

    const now = Date.now();
    const newTargetEndTime = now + sessionState.pausedTimeLeftSeconds * 1000;
    const updateData = {
      userId: user.uid,
      status: 'running',
      targetEndTime: newTargetEndTime,
      pausedTimeLeftSeconds: null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, updateData, { merge: true }).catch(e => console.error("Error continuing pomodoro:", e));
  };

  const giveUpPomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return; // Check user.uid here directly
    
    const updateData = {
      userId: user.uid,
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
      // currentSessionInitialDurationMinutes might remain or be reset to userPreferred, depends on desired logic
      // userPreferredDurationMinutes remains as is
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, updateData, { merge: true }).catch(e => console.error("Error giving up pomodoro:", e));
  };

  const updateUserPreferredDuration = async (minutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid ) return; // Removed sessionState check, can update even if sessionState is briefly null
    const newDuration = Math.max(1, Math.min(minutes, 120)); 
    
    const updateData: Partial<PomodoroSessionState> & {userId: string, updatedAt: FieldValue} = {
        userId: user.uid,
        userPreferredDurationMinutes: newDuration,
        updatedAt: serverTimestamp(),
    };
    // Only update currentSessionInitialDurationMinutes if currently idle
    if(sessionState?.status === 'idle') {
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

