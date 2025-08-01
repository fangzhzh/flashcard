
"use client";
import type { PomodoroSessionState } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp, type FieldValue } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/client';
import BreakOptionsDialog from '@/components/BreakOptionsDialog';

const DEFAULT_POMODORO_MINUTES = 25;
const DEFAULT_REST_MINUTES = 5;

const POMODORO_COMPLETE_SOUND = '/sounds/pomodoro_complete.mp3';
const BREAK_COMPLETE_SOUND = '/sounds/break_complete.mp3';

interface PomodoroContextType {
  sessionState: PomodoroSessionState | null;
  timeLeftSeconds: number;
  isLoading: boolean;
  startPomodoro: (durationMinutes: number, taskTitle?: string) => Promise<void>;
  pausePomodoro: () => Promise<void>;
  continuePomodoro: () => Promise<void>;
  giveUpPomodoro: () => Promise<void>;
  updateUserPreferredDuration: (minutes: number) => Promise<void>;
  updateUserPreferredRestDuration: (minutes: number) => Promise<void>;
  updateNotes: (text: string) => Promise<void>;
  updateCurrentTaskTitle: (taskTitle: string | null) => Promise<void>;
  isResting: boolean;
  restTimeLeftSeconds: number;
  skipRest: () => void;
  isBreakDialogOpen: boolean;
  setIsBreakDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleStartRestPeriod: (selectedOptionId: string) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

const playSound = (soundUrl: string) => {
  if (typeof window !== 'undefined') {
    try {
      const audio = new Audio(soundUrl);
      audio.play().catch(error => console.warn(`Error playing sound ${soundUrl}:`, error));
    } catch (error) {
      console.warn(`Could not create audio element for ${soundUrl}:`, error);
    }
  }
};

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const t = useI18n();

  const [firestoreSessionState, setFirestoreSessionState] = useState<PomodoroSessionState | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(DEFAULT_POMODORO_MINUTES * 60);
  const [isLoading, setIsLoading] = useState(true);
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeftSeconds, setRestTimeLeftSeconds] = useState(DEFAULT_REST_MINUTES * 60);

  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const restIntervalRef = useRef<NodeJS.Timeout | null>(null);


  const [originalTitle, setOriginalTitle] = useState('');
  const [originalFaviconHref, setOriginalFaviconHref] = useState<string | null>(null);

  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginalTitle(document.title);
      const faviconElement = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (faviconElement) {
        setOriginalFaviconHref(faviconElement.href);
      }
    }
  }, []);

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
      setFirestoreSessionState(null);
      setTimeLeftSeconds(DEFAULT_POMODORO_MINUTES * 60);
      setIsLoading(false);
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
      if (restIntervalRef.current) clearInterval(restIntervalRef.current);
      setIsResting(false);
      setIsBreakDialogOpen(false);
      return;
    }

    const docRef = pomodoroDocRef();
    if (!docRef) return;

    setIsLoading(true);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const newSessionState: PomodoroSessionState = {
          userId: data.userId || user.uid,
          status: data.status,
          targetEndTime: data.targetEndTime || null,
          restTargetEndTime: data.restTargetEndTime || null, // Read rest end time
          pausedTimeLeftSeconds: data.pausedTimeLeftSeconds || null,
          currentSessionInitialDurationMinutes: data.currentSessionInitialDurationMinutes,
          userPreferredDurationMinutes: data.userPreferredDurationMinutes,
          userPreferredRestDurationMinutes: data.userPreferredRestDurationMinutes,
          notes: data.notes || '',
          currentTaskTitle: data.currentTaskTitle || null,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toMillis() : (typeof data.updatedAt === 'number' ? data.updatedAt : Date.now()),
        };
        setFirestoreSessionState(newSessionState);
        setIsResting(!!newSessionState.restTargetEndTime && newSessionState.restTargetEndTime > Date.now());
      } else {
        const initialDefaultState: PomodoroSessionState = {
          userId: user.uid,
          status: 'idle',
          targetEndTime: null,
          pausedTimeLeftSeconds: null,
          currentSessionInitialDurationMinutes: DEFAULT_POMODORO_MINUTES,
          userPreferredDurationMinutes: DEFAULT_POMODORO_MINUTES,
          userPreferredRestDurationMinutes: DEFAULT_REST_MINUTES,
          restTargetEndTime: null,
          notes: '',
          currentTaskTitle: null,
          updatedAt: Date.now(),
        };
        setFirestoreSessionState(initialDefaultState);
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
          userPreferredRestDurationMinutes: DEFAULT_REST_MINUTES,
          restTargetEndTime: null,
          notes: '',
          currentTaskTitle: null,
          updatedAt: Date.now(),
      };
      setFirestoreSessionState(fallbackState);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, pomodoroDocRef]);


  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const updateFaviconWithTime = useCallback((minutes: number | null, useRestStyling: boolean, isPomodoroIdle: boolean) => {
    if (typeof window === 'undefined') return;
    const faviconSize = 32;
    const canvas = document.createElement('canvas');
    canvas.width = faviconSize;
    canvas.height = faviconSize;
    const context = canvas.getContext('2d');

    if (!context) return;
    context.clearRect(0, 0, faviconSize, faviconSize);

    if (minutes === null || (isPomodoroIdle && !useRestStyling)) {
        if (originalFaviconHref) {
             const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
             link.type = 'image/x-icon';
             link.rel = 'shortcut icon';
             link.href = originalFaviconHref;
             if(!link.parentNode) document.getElementsByTagName('head')[0].appendChild(link);
        }
        return;
    }

    context.beginPath();
    context.arc(faviconSize / 2, faviconSize / 2, faviconSize / 2, 0, 2 * Math.PI);
    context.fillStyle = useRestStyling
        ? (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#F48FB1')
        : (getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#7E57C2');
    context.fill();

    context.font = `bold ${faviconSize * (String(minutes).length > 1 ? 0.5 : 0.6)}px Arial`;
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground').trim() || '#FFFFFF';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(minutes), faviconSize / 2, faviconSize / 2 + faviconSize * 0.05);

    const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = canvas.toDataURL('image/png');
    if (!link.parentNode) {
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [originalFaviconHref]);

  const currentTimerEnds = useCallback(() => {
    const docRef = pomodoroDocRef();
    if (!user?.uid || !docRef || isResting || isBreakDialogOpen) return;

    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current);
      pomodoroIntervalRef.current = null;
    }

    playSound(POMODORO_COMPLETE_SOUND); 

    const newState: Partial<PomodoroSessionState> & { updatedAt: FieldValue } = {
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
      currentTaskTitle: null,
      updatedAt: serverTimestamp()
    };

    setDoc(docRef, newState, { merge: true })
    .catch(e => console.error("Error setting Pomodoro to idle:", e))
    .finally(() => {
      setIsBreakDialogOpen(true);
      if (typeof window !== 'undefined' && Notification.permission === "granted") {
        new Notification(t('pomodoro.notification.title'), {
          body: t('pomodoro.notification.body'),
          icon: '/favicon.ico'
        });
      }
    });
  }, [user?.uid, isResting, isBreakDialogOpen, pomodoroDocRef, t]);

  useEffect(() => {
    if (!user?.uid || !firestoreSessionState || isResting || isBreakDialogOpen || firestoreSessionState.status !== 'running' || !firestoreSessionState.targetEndTime) {
      if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
      if (firestoreSessionState?.status === 'paused' && firestoreSessionState.pausedTimeLeftSeconds !== null) {
        setTimeLeftSeconds(firestoreSessionState.pausedTimeLeftSeconds);
      } else if (firestoreSessionState?.status === 'idle') {
         setTimeLeftSeconds((firestoreSessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES) * 60);
      }
      return;
    }

    const updateTimer = () => {
      const currentTargetEndTime = firestoreSessionState.targetEndTime;
      if (!currentTargetEndTime) {
        if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
        return;
      }
      const now = Date.now();
      const remaining = Math.max(0, Math.round((currentTargetEndTime - now) / 1000));
      setTimeLeftSeconds(remaining);
      if (remaining === 0) {
        currentTimerEnds();
      }
    };

    if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    updateTimer();
    pomodoroIntervalRef.current = setInterval(updateTimer, 1000);

    return () => { if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current); };
  }, [user?.uid, firestoreSessionState?.status, firestoreSessionState?.targetEndTime, firestoreSessionState?.userPreferredDurationMinutes, isResting, isBreakDialogOpen, currentTimerEnds]);

  const restTimerEnds = useCallback(async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;

    if (restIntervalRef.current) {
        clearInterval(restIntervalRef.current);
        restIntervalRef.current = null;
    }

    playSound(BREAK_COMPLETE_SOUND);
    if (typeof window !== 'undefined' && Notification.permission === "granted") {
        new Notification(t('pomodoro.rest.notification.title'), {
            body: t('pomodoro.rest.notification.body'),
            icon: '/favicon.ico'
        });
    }

    await setDoc(docRef, { restTargetEndTime: null }, { merge: true });
    setIsResting(false); // This will also be updated by onSnapshot, but immediate feedback is good
  }, [pomodoroDocRef, t, user?.uid]);


  useEffect(() => {
    if (!isResting || !firestoreSessionState?.restTargetEndTime) {
        if (restIntervalRef.current) clearInterval(restIntervalRef.current);
        return;
    }

    const updateRestTimer = () => {
        const remaining = Math.max(0, Math.round((firestoreSessionState.restTargetEndTime! - Date.now()) / 1000));
        setRestTimeLeftSeconds(remaining);
        if (remaining === 0) {
            restTimerEnds();
        }
    };

    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    updateRestTimer();
    restIntervalRef.current = setInterval(updateRestTimer, 1000);

    return () => { if (restIntervalRef.current) clearInterval(restIntervalRef.current); };
  }, [isResting, firestoreSessionState?.restTargetEndTime, restTimerEnds]);


  useEffect(() => {
      if (typeof window === 'undefined' || !firestoreSessionState ) return;

      let currentDisplayTime = 0;
      let titlePrefix = '';
      let displayMinutesForFavicon: number | null = null;
      let useRestStylingForFavicon = false;
      let isPomodoroIdleVisual = firestoreSessionState.status === 'idle' && !isResting;
      let taskTitleSegment = firestoreSessionState.currentTaskTitle ? `(${firestoreSessionState.currentTaskTitle}) ` : '';


      if (isResting) {
          currentDisplayTime = restTimeLeftSeconds;
          titlePrefix = `🧘 ${t('pomodoro.rest.titlePrefix')} `;
          displayMinutesForFavicon = Math.max(0, Math.floor(currentDisplayTime / 60));
          useRestStylingForFavicon = true;
          isPomodoroIdleVisual = false;
      } else {
          currentDisplayTime = timeLeftSeconds;
          if (firestoreSessionState.status === 'running') {
              titlePrefix = '⏲️ ';
              displayMinutesForFavicon = Math.max(0, Math.floor(currentDisplayTime / 60));
          } else if (firestoreSessionState.status === 'paused') {
              titlePrefix = '⏸️ ';
              displayMinutesForFavicon = Math.max(0, Math.floor(currentDisplayTime / 60));
          }
      }

      if (titlePrefix) {
          document.title = `${titlePrefix}${taskTitleSegment}${formatTime(currentDisplayTime)} - ${originalTitle}`;
      } else {
          document.title = originalTitle;
      }
      updateFaviconWithTime(displayMinutesForFavicon, useRestStylingForFavicon, isPomodoroIdleVisual);

  }, [timeLeftSeconds, restTimeLeftSeconds, isResting, firestoreSessionState?.status, firestoreSessionState?.currentTaskTitle, originalTitle, updateFaviconWithTime, t]);


  const startPomodoro = async (durationMinutes: number, taskTitle?: string) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === "default") {
            try {
                const permissionResult = await Notification.requestPermission();
                if (Notification.permission === "granted") {
                    toast({ title: t('notifications.enabled.title'), description: t('notifications.enabled.description') });
                } else if (permissionResult === "denied" || Notification.permission === "denied") {
                    toast({ title: t('notifications.denied.title'), description: t('notifications.denied.description'), variant: "destructive" });
                }
            } catch (error) {
                 console.error("Error requesting notification permission:", error);
                 toast({ title: t('notifications.error.title'), description: t('notifications.error.description'), variant: "destructive" });
            }
        }
    }

    const now = Date.now();
    const targetEndTime = now + durationMinutes * 60 * 1000;
    const newState: Partial<PomodoroSessionState> & {updatedAt: FieldValue} = {
      status: 'running',
      targetEndTime,
      currentSessionInitialDurationMinutes: durationMinutes,
      pausedTimeLeftSeconds: null,
      currentTaskTitle: taskTitle || null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, newState, { merge: true }).catch(e => console.error("Error starting pomodoro:", e));
  };

  const pausePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !firestoreSessionState || firestoreSessionState.status !== 'running' || !firestoreSessionState.targetEndTime || !user?.uid) return;

    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current);
    }

    const now = Date.now();
    const pausedTimeLeft = Math.max(0, Math.round((firestoreSessionState.targetEndTime - now) / 1000));
    const updateData = {
      status: 'paused',
      pausedTimeLeftSeconds: pausedTimeLeft,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, updateData, { merge: true }).catch(e => console.error("Error pausing pomodoro:", e));
  };

  const continuePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !firestoreSessionState || firestoreSessionState.status !== 'paused' || firestoreSessionState.pausedTimeLeftSeconds === null || !user?.uid) return;

    const now = Date.now();
    const newTargetEndTime = now + firestoreSessionState.pausedTimeLeftSeconds * 1000;
    const updateData = {
      status: 'running',
      targetEndTime: newTargetEndTime,
      pausedTimeLeftSeconds: null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, updateData, { merge: true }).catch(e => console.error("Error continuing pomodoro:", e));
  };

  const giveUpPomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;

    if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);
    
    const updateData = {
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
      currentTaskTitle: null,
      updatedAt: serverTimestamp(),
    };
    await setDoc(docRef, updateData, { merge: true }).catch(e => console.error("Error giving up pomodoro:", e));
  };

  const updateUserPreferredDuration = async (minutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid ) return;
    const newDuration = Math.max(1, Math.min(minutes, 120));

    const updateData: Partial<Omit<PomodoroSessionState, 'userId' | 'updatedAt'>> & {updatedAt: FieldValue} = {
        userPreferredDurationMinutes: newDuration,
        updatedAt: serverTimestamp(),
    };
    if(firestoreSessionState?.status === 'idle') {
        updateData.currentSessionInitialDurationMinutes = newDuration;
    }

    await setDoc(docRef, updateData, { merge: true }).catch(e => console.error("Error updating duration:", e));
  };

  const updateUserPreferredRestDuration = async (minutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;
    const newRestDuration = Math.max(1, Math.min(minutes, 60)); // Example range 1-60 min
    await setDoc(docRef, { userPreferredRestDurationMinutes: newRestDuration, updatedAt: serverTimestamp() }, { merge: true })
      .catch(e => console.error("Error updating rest duration:", e));
  };

  const updateNotes = async (text: string) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;
    await setDoc(docRef, { notes: text, updatedAt: serverTimestamp() }, { merge: true }).catch(e => console.error("Error updating notes:", e));
  };

  const updateCurrentTaskTitle = async (taskTitle: string | null) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;
    await setDoc(docRef, { currentTaskTitle: taskTitle, updatedAt: serverTimestamp() }, { merge: true })
      .catch(e => console.error("Error updating pomodoro task title:", e));
  };

  const handleStartRestPeriod = async (selectedOptionId: string) => {
    const docRef = pomodoroDocRef();
    if (!docRef) return;
    setIsBreakDialogOpen(false);
    if (pomodoroIntervalRef.current) clearInterval(pomodoroIntervalRef.current);

    const restDurationMinutes = firestoreSessionState?.userPreferredRestDurationMinutes || DEFAULT_REST_MINUTES;
    const restTargetEndTime = Date.now() + restDurationMinutes * 60 * 1000;
    
    await setDoc(docRef, { restTargetEndTime }, { merge: true });
    // isResting state will be updated via the onSnapshot listener
  };

  const skipRest = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef) return;
    if (restIntervalRef.current) clearInterval(restIntervalRef.current);
    
    await setDoc(docRef, { restTargetEndTime: null }, { merge: true });
    // isResting state will be updated via the onSnapshot listener
  };


  return (
    <PomodoroContext.Provider value={{
      sessionState: firestoreSessionState,
      timeLeftSeconds,
      isLoading: isLoading || authLoading,
      startPomodoro,
      pausePomodoro,
      continuePomodoro,
      giveUpPomodoro,
      updateUserPreferredDuration,
      updateUserPreferredRestDuration,
      updateNotes,
      updateCurrentTaskTitle,
      isResting,
      restTimeLeftSeconds,
      skipRest,
      isBreakDialogOpen,
      setIsBreakDialogOpen,
      handleStartRestPeriod,
    }}>
      {children}
      {user && !authLoading && <BreakOptionsDialog
        isOpen={isBreakDialogOpen}
        onClose={() => setIsBreakDialogOpen(false)}
        onStartRest={handleStartRestPeriod}
        restDuration={firestoreSessionState?.userPreferredRestDurationMinutes || DEFAULT_REST_MINUTES}
      />}
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
