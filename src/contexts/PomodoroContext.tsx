
"use client";
import type { PomodoroSessionState } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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
  isBreakDialogOpen: boolean;
  setIsBreakDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  handleStartRestPeriod: (selectedOptionId: string) => void;
  isResting: boolean;
  restTimeLeftSeconds: number;
  skipRest: () => void;
}

const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export const PomodoroProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const t = useI18n();

  const [sessionState, setSessionState] = useState<PomodoroSessionState | null>(null);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(DEFAULT_POMODORO_MINUTES * 60);
  const [isLoading, setIsLoading] = useState(true);
  
  const [pomodoroIntervalId, setPomodoroIntervalId] = useState<NodeJS.Timeout | null>(null);
  
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalFaviconHref, setOriginalFaviconHref] = useState<string | null>(null);

  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);
  const [selectedBreakOptionId, setSelectedBreakOptionId] = useState<string>('stretch'); // Default break option
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

  useEffect(() => {
    if (authLoading) {
      setIsLoading(true);
      return;
    }
    if (!user?.uid) {
      setSessionState(null);
      setTimeLeftSeconds(DEFAULT_POMODORO_MINUTES * 60);
      setIsLoading(false);
      if (pomodoroIntervalId) clearInterval(pomodoroIntervalId);
      setPomodoroIntervalId(null);
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
          userId: data.userId || user.uid,
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
  }, [user, authLoading, pomodoroDocRef, pomodoroIntervalId]);


  // Effect for main Pomodoro timer logic (setting interval, handling completion)
  useEffect(() => {
    if (isResting || isBreakDialogOpen || !user?.uid || !sessionState) {
      if (pomodoroIntervalId) {
        clearInterval(pomodoroIntervalId);
        setPomodoroIntervalId(null);
      }
      return; 
    }

    const docRef = pomodoroDocRef();

    const currentTimerEnds = () => {
      // Explicit guard: If we are already resting or the break dialog is meant to be open,
      // do not proceed with ending a Pomodoro session again.
      if (isResting || isBreakDialogOpen) {
        if (pomodoroIntervalId) { 
          clearInterval(pomodoroIntervalId);
          setPomodoroIntervalId(null);
        }
        return; 
      }

      if (pomodoroIntervalId) {
        clearInterval(pomodoroIntervalId);
        setPomodoroIntervalId(null);
      }
      
      if (docRef && sessionState && user?.uid) {
        const currentPreferredDuration = sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES;
        const notesToPreserve = sessionState.notes || '';
        setDoc(docRef, {
          userId: user.uid,
          status: 'idle',
          targetEndTime: null,
          pausedTimeLeftSeconds: null,
          currentSessionInitialDurationMinutes: currentPreferredDuration, 
          userPreferredDurationMinutes: currentPreferredDuration,
          notes: notesToPreserve,
          updatedAt: serverTimestamp()
        }, { merge: true })
        .finally(() => {
          setIsBreakDialogOpen(true);
          if (typeof window !== 'undefined' && Notification.permission === "granted") {
            new Notification(t('pomodoro.notification.title'), {
              body: t('pomodoro.notification.body'),
              icon: '/favicon.ico'
            });
          }
        });
      } else {
        if (!isResting && !isBreakDialogOpen) {
             setIsBreakDialogOpen(true); 
        }
      }
    };

    if (sessionState.status === 'running' && sessionState.targetEndTime) {
      const updateTimer = () => {
        const currentTargetEndTime = sessionState.targetEndTime; 
        if (!currentTargetEndTime) {
          if (pomodoroIntervalId) clearInterval(pomodoroIntervalId);
          setPomodoroIntervalId(null);
          return;
        }

        const now = Date.now();
        const remaining = Math.max(0, Math.round((currentTargetEndTime - now) / 1000));
        setTimeLeftSeconds(remaining);

        if (remaining === 0) {
          currentTimerEnds();
        }
      };

      updateTimer(); 
      const newInterval = setInterval(updateTimer, 1000);
      setPomodoroIntervalId(newInterval); 

    } else if (sessionState.status === 'paused' && sessionState.pausedTimeLeftSeconds !== null) {
      setTimeLeftSeconds(sessionState.pausedTimeLeftSeconds);
      if (pomodoroIntervalId) { 
        clearInterval(pomodoroIntervalId);
        setPomodoroIntervalId(null);
      }
    } else if (sessionState.status === 'idle') {
      setTimeLeftSeconds((sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES) * 60);
      if (pomodoroIntervalId) { 
        clearInterval(pomodoroIntervalId);
        setPomodoroIntervalId(null);
      }
    }
    
    return () => {
      if (pomodoroIntervalId) {
         clearInterval(pomodoroIntervalId);
      }
    };
  }, [ 
    sessionState?.status, 
    sessionState?.targetEndTime, 
    sessionState?.pausedTimeLeftSeconds,
    sessionState?.userPreferredDurationMinutes,
    sessionState?.notes,
    user?.uid, 
    isResting, 
    isBreakDialogOpen,
    pomodoroDocRef, 
    t,
    sessionState // Added sessionState as a whole to ensure re-evaluation if any part changes. Fine-tuning might be needed if this causes issues.
  ]);


  // Effect for Rest Timer
  useEffect(() => {
    if (!isResting) {
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

    return () => {
      clearInterval(intervalId);
    };
  }, [isResting, t]); 


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
    
    if (minutes === null || (isPomodoroIdle && !useRestStyling)) { // Revert to original if idle and not resting
        if (originalFaviconHref) {
             const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
             link.type = 'image/x-icon'; // Or image/png if original was png
             link.rel = 'shortcut icon'; // Or 'icon'
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
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground').trim() || '#FFFFFF'; // Ensure text is visible
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(minutes), faviconSize / 2, faviconSize / 2 + faviconSize * 0.05); // Slight vertical adjustment

    const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = canvas.toDataURL('image/png');
    if (!link.parentNode) {
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [originalFaviconHref]);


  // Effect for UI updates (title and favicon) - No Firestore writes here
  useEffect(() => {
      if (typeof window === 'undefined' || !sessionState) return;

      let currentDisplayTime = 0;
      let titlePrefix = '';
      let displayMinutesForFavicon: number | null = null;
      let useRestStylingForFavicon = false;
      let isPomodoroIdleVisual = sessionState.status === 'idle';


      if (isResting) {
          currentDisplayTime = restTimeLeftSeconds;
          titlePrefix = `🧘 ${t('pomodoro.rest.titlePrefix')} `;
          displayMinutesForFavicon = Math.max(0, Math.floor(currentDisplayTime / 60));
          useRestStylingForFavicon = true;
          isPomodoroIdleVisual = false; 
      } else { 
          currentDisplayTime = timeLeftSeconds;
          if (sessionState.status === 'running') {
              titlePrefix = '⏲️ ';
              displayMinutesForFavicon = Math.max(0, Math.floor(currentDisplayTime / 60));
          } else if (sessionState.status === 'paused') {
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

  }, [
      timeLeftSeconds, 
      restTimeLeftSeconds, 
      isResting, 
      sessionState?.status,
      originalTitle, 
      updateFaviconWithTime, 
      t 
  ]);


  const startPomodoro = async (durationMinutes: number) => {
    const docRef = pomodoroDocRef();
    if (!docRef || !user?.uid) return;

    if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === "default") {
            try {
                const permission = await Notification.requestPermission();
                if (permission === "granted") {
                    toast({ title: t('notifications.enabled.title'), description: t('notifications.enabled.description') });
                } else {
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
      userPreferredDurationMinutes: sessionState?.userPreferredDurationMinutes || durationMinutes, 
      pausedTimeLeftSeconds: null,
      notes: sessionState?.notes || '', 
      updatedAt: serverTimestamp(), 
    };
    await setDoc(docRef, newState, { merge: true }).catch(e => console.error("Error starting pomodoro:", e));
  };

  const pausePomodoro = async () => {
    const docRef = pomodoroDocRef();
    if (!docRef || !sessionState || sessionState.status !== 'running' || !sessionState.targetEndTime || !user?.uid) return;
    
    if (pomodoroIntervalId) {
      clearInterval(pomodoroIntervalId);
      setPomodoroIntervalId(null);
    }

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
    if (!docRef || !user?.uid) return; 
    
    if (pomodoroIntervalId) {
      clearInterval(pomodoroIntervalId);
      setPomodoroIntervalId(null);
    }

    const updateData = { 
      userId: user.uid,
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
    
    const updateData: Partial<PomodoroSessionState> & {userId: string, updatedAt: FieldValue} = { 
        userId: user.uid,
        userPreferredDurationMinutes: newDuration,
        updatedAt: serverTimestamp(),
    };
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

  const handleStartRestPeriod = (optionId: string) => {
    setIsBreakDialogOpen(false); 
    setSelectedBreakOptionId(optionId); 
    
    if (pomodoroIntervalId) { 
        clearInterval(pomodoroIntervalId);
        setPomodoroIntervalId(null);
    }
    setRestTimeLeftSeconds(DEFAULT_REST_MINUTES * 60); 
    setIsResting(true);
  };

  const skipRest = () => {
    setIsResting(false);
    // No Firestore write needed here, rest is client-side
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
      updateNotes,
      isBreakDialogOpen,
      setIsBreakDialogOpen,
      handleStartRestPeriod,
      isResting,
      restTimeLeftSeconds,
      skipRest,
    }}>
      {children}
      {user && <BreakOptionsDialog
        isOpen={isBreakDialogOpen}
        onClose={() => {
            setIsBreakDialogOpen(false);
            // Optionally, if skipping break from dialog 'X' or 'Skip' button
            // setIsResting(false); // If skipping means no rest at all
        }}
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
