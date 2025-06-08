
"use client";
import type { PomodoroSessionState } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
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
        const data = snapshot.data() as Omit<PomodoroSessionState, 'updatedAt'> & { updatedAt: Timestamp | null };
        const newSessionState: PomodoroSessionState = {
          ...data,
          targetEndTime: data.targetEndTime || null,
          pausedTimeLeftSeconds: data.pausedTimeLeftSeconds || null,
          updatedAt: data.updatedAt ? data.updatedAt.toMillis() : serverTimestamp(), // Keep as serverTimestamp for writes, convert for reads if needed
        };
        
        // Handle targetEndTime potentially being a Firestore Timestamp on first load
        if (newSessionState.targetEndTime && typeof newSessionState.targetEndTime !== 'number' && 'toDate' in newSessionState.targetEndTime) {
            newSessionState.targetEndTime = (newSessionState.targetEndTime as unknown as Timestamp).toMillis();
        }
        setSessionState(newSessionState);

      } else {
        // No state found, create default
        const defaultState: PomodoroSessionState = {
          userId: user.uid,
          status: 'idle',
          targetEndTime: null,
          pausedTimeLeftSeconds: null,
          currentSessionInitialDurationMinutes: DEFAULT_POMODORO_MINUTES,
          userPreferredDurationMinutes: DEFAULT_POMODORO_MINUTES,
          notes: '',
          updatedAt: serverTimestamp(),
        };
        setDoc(docRef, defaultState).then(() => setSessionState(defaultState));
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching Pomodoro session state:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, pomodoroDocRef, intervalId]);


  useEffect(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null);
    }

    if (sessionState?.status === 'running' && sessionState.targetEndTime) {
      const updateTimer = () => {
        const now = Date.now();
        const remaining = Math.max(0, Math.round((sessionState.targetEndTime! - now) / 1000));
        setTimeLeftSeconds(remaining);

        if (remaining === 0) {
          if (intervalId) clearInterval(intervalId);
          setIntervalId(null);
          const docRef = pomodoroDocRef();
          if (docRef) {
            updateDoc(docRef, { 
              status: 'idle', 
              targetEndTime: null,
              updatedAt: serverTimestamp() 
            });
          }
          toast({
            title: t('pomodoro.toast.completed'),
            description: t('pomodoro.toast.completed.description'),
          });
        }
      };
      
      updateTimer(); // Initial call to set time immediately
      const newInterval = setInterval(updateTimer, 1000);
      setIntervalId(newInterval);

    } else if (sessionState?.status === 'paused' && sessionState.pausedTimeLeftSeconds !== null) {
      setTimeLeftSeconds(sessionState.pausedTimeLeftSeconds);
    } else if (sessionState?.status === 'idle') {
      setTimeLeftSeconds(sessionState.userPreferredDurationMinutes * 60);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState?.status, sessionState?.targetEndTime, sessionState?.pausedTimeLeftSeconds, sessionState?.userPreferredDurationMinutes, t, toast, pomodoroDocRef]);


  const startPomodoro = async (durationMinutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;

    const now = Date.now();
    const targetEndTime = now + durationMinutes * 60 * 1000;
    const newState: Partial<PomodoroSessionState> = {
      status: 'running',
      targetEndTime,
      currentSessionInitialDurationMinutes: durationMinutes,
      userPreferredDurationMinutes: durationMinutes, // Also update preferred duration
      pausedTimeLeftSeconds: null,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, newState).catch(e => console.error("Error starting pomodoro:", e));
  };

  const pausePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState || sessionState.status !== 'running' || !sessionState.targetEndTime) return;

    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);

    const now = Date.now();
    const pausedTimeLeft = Math.max(0, Math.round((sessionState.targetEndTime - now) / 1000));
    const newState: Partial<PomodoroSessionState> = {
      status: 'paused',
      pausedTimeLeftSeconds: pausedTimeLeft,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, newState).catch(e => console.error("Error pausing pomodoro:", e));
  };

  const continuePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState || sessionState.status !== 'paused' || sessionState.pausedTimeLeftSeconds === null) return;

    const now = Date.now();
    const newTargetEndTime = now + sessionState.pausedTimeLeftSeconds * 1000;
    const newState: Partial<PomodoroSessionState> = {
      status: 'running',
      targetEndTime: newTargetEndTime,
      pausedTimeLeftSeconds: null,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, newState).catch(e => console.error("Error continuing pomodoro:", e));
  };

  const giveUpPomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState) return;

    if (intervalId) clearInterval(intervalId);
    setIntervalId(null);
    
    const newState: Partial<PomodoroSessionState> = {
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
      // currentSessionInitialDurationMinutes remains for potential display until next start
      updatedAt: serverTimestamp(),
    };
    await updateDoc(docRef, newState).catch(e => console.error("Error giving up pomodoro:", e));
  };

  const updateUserPreferredDuration = async (minutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState) return;
    const newDuration = Math.max(1, Math.min(minutes, 120)); // Clamp between 1 and 120
    
    const updateData: Partial<PomodoroSessionState> = {
        userPreferredDurationMinutes: newDuration,
        updatedAt: serverTimestamp(),
    };
    // If idle, also update currentSessionInitialDurationMinutes to reflect this new preference immediately for the display
    if(sessionState.status === 'idle') {
        updateData.currentSessionInitialDurationMinutes = newDuration;
    }

    await updateDoc(docRef, updateData).catch(e => console.error("Error updating duration:", e));
  };

  const updateNotes = async (text: string) => {
    const docRef = pomodoroDocRef();
    if (!docRef) return;
    await updateDoc(docRef, { notes: text, updatedAt: serverTimestamp() }).catch(e => console.error("Error updating notes:", e));
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
