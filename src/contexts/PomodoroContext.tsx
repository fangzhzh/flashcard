
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
  isResting: boolean;
  restTimeLeftSeconds: number;
  skipRest: () => void;
  // Break dialog state is now managed by this context for Firestore-backed sessions
  isBreakDialogOpen: boolean;
  setIsBreakDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleStartRestPeriod: (selectedOptionId: string) => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const t = useI18n();

  const [firestoreSessionState, setFirestoreSessionState] = useState<PomodoroSessionState | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(DEFAULT_POMODORO_MINUTES * 60);
  const [isLoading, setIsLoading] = useState(true);
  
  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalFaviconHref, setOriginalFaviconHref] = useState<string | null>(null);

  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);
  // selectedBreakOptionId is managed locally by BreakOptionsDialog or passed directly to handleStartRestPeriod
  const [isResting, setIsResting] = useState(false);
  const [restTimeLeftSeconds, setRestTimeLeftSeconds] = useState(DEFAULT_REST_MINUTES * 60);

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

  // Firestore listener for sessionState (for logged-in users)
  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!user?.uid) {
      setFirestoreSessionState(null); // Clear Firestore state if user logs out
      setTimeLeftSeconds(DEFAULT_POMODORO_MINUTES * 60);
      setIsLoading(false);
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
        pomodoroIntervalRef.current = null;
      }
      setIsResting(false);
      setIsBreakDialogOpen(false);
      return;
    }

    const docRef = pomodoroDocRef();
    if (!docRef) return;

    setIsLoading(true);
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Omit<PomodoroSessionState, 'updatedAt' | 'userId'> & { updatedAt: Timestamp | number | null, userId?: string };
        const newSessionState: PomodoroSessionState = {
          userId: data.userId || user.uid, // Should always be user.uid
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
        setFirestoreSessionState(newSessionState);
      } else { // Create default state in Firestore if it doesn't exist for the user
        const initialDefaultState: PomodoroSessionState = {
          userId: user.uid,
          status: 'idle',
          targetEndTime: null,
          pausedTimeLeftSeconds: null,
          currentSessionInitialDurationMinutes: DEFAULT_POMODORO_MINUTES,
          userPreferredDurationMinutes: DEFAULT_POMODORO_MINUTES,
          notes: '',
          updatedAt: Date.now(), // For local state before Firestore write
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
          notes: '',
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
    if (!user?.uid || !docRef) return;

    if (isResting || isBreakDialogOpen) {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
        pomodoroIntervalRef.current = null;
      }
      return;
    }

    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current);
      pomodoroIntervalRef.current = null;
    }
    
    const currentPreferredDuration = firestoreSessionState?.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES;
    const notesToPreserve = firestoreSessionState?.notes || '';
    const newState: Omit<PomodoroSessionState, 'updatedAt'> & {updatedAt: FieldValue} = {
      userId: user.uid,
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
      currentSessionInitialDurationMinutes: currentPreferredDuration,
      userPreferredDurationMinutes: currentPreferredDuration,
      notes: notesToPreserve,
      updatedAt: serverTimestamp()
    };
    
    setDoc(docRef, newState, { merge: true })
    .catch(e => console.error("Error setting Pomodoro to idle:", e))
    .finally(() => {
      setIsBreakDialogOpen(true); // Open dialog for logged-in user
      if (typeof window !== 'undefined' && Notification.permission === "granted") {
        new Notification(t('pomodoro.notification.title'), {
          body: t('pomodoro.notification.body'),
          icon: '/favicon.ico'
        });
      }
    });
  }, [user?.uid, firestoreSessionState, isResting, isBreakDialogOpen, pomodoroDocRef, t, setIsBreakDialogOpen]);

  // Effect for MAIN Pomodoro timer logic (for logged-in users)
  useEffect(() => {
    if (!user?.uid || !firestoreSessionState || isResting || isBreakDialogOpen || firestoreSessionState.status !== 'running' || !firestoreSessionState.targetEndTime) {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
        pomodoroIntervalRef.current = null;
      }
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
        pomodoroIntervalRef.current = null;
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
    
    return () => {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
        pomodoroIntervalRef.current = null;
      }
    };
  }, [user?.uid, firestoreSessionState?.status, firestoreSessionState?.targetEndTime, firestoreSessionState?.userPreferredDurationMinutes, isResting, isBreakDialogOpen, currentTimerEnds]);

  // Effect for UI updates (title and favicon) - No Firestore writes here
  useEffect(() => {
      if (typeof window === 'undefined' || !firestoreSessionState ) return;

      let currentDisplayTime = 0;
      let titlePrefix = '';
      let displayMinutesForFavicon: number | null = null;
      let useRestStylingForFavicon = false;
      let isPomodoroIdleVisual = firestoreSessionState.status === 'idle';

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
          document.title = `${titlePrefix}${formatTime(currentDisplayTime)} - ${originalTitle}`;
      } else {
          document.title = originalTitle;
      }
      updateFaviconWithTime(displayMinutesForFavicon, useRestStylingForFavicon, isPomodoroIdleVisual);

  }, [timeLeftSeconds, restTimeLeftSeconds, isResting, firestoreSessionState?.status, originalTitle, updateFaviconWithTime, t]);

  // Effect for Rest Timer
  useEffect(() => {
    if (!isResting) { // Only applies if a rest period is active
      return;
    }

    const intervalId = setInterval(() => {
      setRestTimeLeftSeconds(prevSeconds => {
        if (prevSeconds <= 1) {
          clearInterval(intervalId);
          setIsResting(false);
          if (typeof window !== 'undefined' && Notification.permission === "granted") {
            new Notification(t('pomodoro.rest.notification.title'), {
              body: t('pomodoro.rest.notification.body'),
              icon: '/favicon.ico'
            });
          }
          return 0;
        }
        return prevSeconds - 1;
      });
    }, 1000);

    return () => clearInterval(intervalId);
  }, [isResting, t]);


  const startPomodoro = async (durationMinutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return; // This context is only for logged-in users now

    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === "default") {
            try {
                const permissionResult = await Notification.requestPermission();
                if (Notification.permission === "granted") { // Check static property after request
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
    const newState: Omit<PomodoroSessionState, 'updatedAt'> & {updatedAt: FieldValue} = { 
      userId: user.uid,
      status: 'running',
      targetEndTime,
      currentSessionInitialDurationMinutes: durationMinutes,
      userPreferredDurationMinutes: firestoreSessionState?.userPreferredDurationMinutes || durationMinutes, 
      pausedTimeLeftSeconds: null,
      notes: firestoreSessionState?.notes || '', 
      updatedAt: serverTimestamp(), 
    };
    await setDoc(docRef, newState, { merge: true }).catch(e => console.error("Error starting pomodoro:", e));
  };

  const pausePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !firestoreSessionState || firestoreSessionState.status !== 'running' || !firestoreSessionState.targetEndTime || !user?.uid) return;
    
    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current);
      pomodoroIntervalRef.current = null;
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
    
    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current);
      pomodoroIntervalRef.current = null;
    }

    const updateData = { 
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
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

  const updateNotes = async (text: string) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;
    await setDoc(docRef, { notes: text, updatedAt: serverTimestamp() }, { merge: true }).catch(e => console.error("Error updating notes:", e));
  };

  const handleStartRestPeriod = (selectedOptionId: string) => {
    // This function is called by the BreakOptionsDialog when a user starts a rest.
    // selectedOptionId can be used if needed for specific rest behaviors in the future.
    setIsBreakDialogOpen(false); 
    
    if (pomodoroIntervalRef.current) { 
        clearInterval(pomodoroIntervalRef.current);
        pomodoroIntervalRef.current = null;
    }
    setRestTimeLeftSeconds(DEFAULT_REST_MINUTES * 60); 
    setIsResting(true);
  };

  const skipRest = () => {
    setIsResting(false);
    setRestTimeLeftSeconds(DEFAULT_REST_MINUTES * 60); 
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
      updateNotes,
      isResting,
      restTimeLeftSeconds,
      skipRest,
      isBreakDialogOpen,
      setIsBreakDialogOpen,
      handleStartRestPeriod,
    }}>
      {children}
      {/* BreakOptionsDialog is rendered here for logged-in users */}
      {user && !authLoading && <BreakOptionsDialog
        isOpen={isBreakDialogOpen}
        onClose={() => setIsBreakDialogOpen(false)}
        onStartRest={handleStartRestPeriod}
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

    