
"use client";
import type { PomodoroSessionState } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp, type FieldValue } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/client';
import BreakOptionsDialog from '@/components/BreakOptionsDialog'; // Import the dialog

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
  const [restIntervalId, setRestIntervalId] = useState<NodeJS.Timeout | null>(null);
  
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalFaviconHref, setOriginalFaviconHref] = useState<string | null>(null);

  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);
  const [selectedBreakOptionId, setSelectedBreakOptionId] = useState<string>('stretch');
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

  const updateFaviconWithTime = useCallback((minutes: number | null, isRestingFavicon = false) => {
    if (typeof window === 'undefined') return;
    const faviconSize = 32;
    const canvas = document.createElement('canvas');
    canvas.width = faviconSize;
    canvas.height = faviconSize;
    const context = canvas.getContext('2d');

    if (!context) return;
    context.clearRect(0, 0, faviconSize, faviconSize);
    
    if (minutes === null || (sessionState?.status === 'idle' && !isRestingFavicon)) {
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
    context.fillStyle = isRestingFavicon 
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
  }, [originalFaviconHref, sessionState?.status]);


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
      if (restIntervalId) clearInterval(restIntervalId);
      setRestIntervalId(null);
      setIsResting(false);
      setIsBreakDialogOpen(false);
      if (typeof window !== 'undefined' && originalTitle) document.title = originalTitle;
      updateFaviconWithTime(null);
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
  }, [user, authLoading, pomodoroDocRef, originalTitle, updateFaviconWithTime]);


  // Effect for main Pomodoro timer
  useEffect(() => {
    if (pomodoroIntervalId) {
      clearInterval(pomodoroIntervalId);
      setPomodoroIntervalId(null); 
    }

    if (!sessionState || typeof window === 'undefined' || isResting || isBreakDialogOpen) {
      if (!isResting && sessionState?.status === 'idle') {
        if (originalTitle) document.title = originalTitle;
        updateFaviconWithTime(null);
        setTimeLeftSeconds((sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES) * 60);
      }
      return;
    }
    
    const currentMinutesLeftForFavicon = Math.floor(timeLeftSeconds / 60);

    if (sessionState.status === 'running') {
      document.title = `⏲️ ${formatTime(timeLeftSeconds)} - ${originalTitle}`;
      updateFaviconWithTime(currentMinutesLeftForFavicon);
    } else if (sessionState.status === 'paused') {
      document.title = `⏸️ ${formatTime(timeLeftSeconds)} - ${originalTitle}`;
      updateFaviconWithTime(currentMinutesLeftForFavicon);
    } else { // idle (but not resting or dialog open)
      document.title = originalTitle;
      updateFaviconWithTime(null);
    }

    if (sessionState.status === 'running' && sessionState.targetEndTime) {
      const updateTimer = () => {
        const currentTargetEndTime = sessionState.targetEndTime; 
        if (!currentTargetEndTime) {
          return;
        }
        const now = Date.now();
        const remaining = Math.max(0, Math.round((currentTargetEndTime - now) / 1000));
        setTimeLeftSeconds(remaining);

        if (remaining === 0) {
          if (pomodoroIntervalId) { // Clear the interval that was counting down
            clearInterval(pomodoroIntervalId);
            setPomodoroIntervalId(null);
          }
          
          const docRef = pomodoroDocRef();
          if (docRef && user?.uid && sessionState) {
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
              if (Notification.permission === "granted") {
                new Notification(t('pomodoro.notification.title'), {
                  body: t('pomodoro.notification.body'),
                  icon: '/favicon.ico'
                });
              }
            });
          } else {
            setIsBreakDialogOpen(true); // Fallback
          }
        }
      };

      updateTimer(); 
      const newInterval = setInterval(updateTimer, 1000);
      setPomodoroIntervalId(newInterval);

    } else if (sessionState.status === 'paused' && sessionState.pausedTimeLeftSeconds !== null) {
      setTimeLeftSeconds(sessionState.pausedTimeLeftSeconds);
    } else if (sessionState.status === 'idle') {
      setTimeLeftSeconds((sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES) * 60);
    }
    
    // Cleanup for this effect instance
    return () => {
      if (pomodoroIntervalId) {
         clearInterval(pomodoroIntervalId);
      }
    };
  }, [
      sessionState?.status, 
      sessionState?.targetEndTime, 
      sessionState?.userPreferredDurationMinutes, 
      sessionState?.pausedTimeLeftSeconds, 
      user?.uid, // Added user.uid as it's used in pomodoroDocRef which is used in updateTimer
      isResting, 
      isBreakDialogOpen,
      // Removed timeLeftSeconds, pomodoroIntervalId, originalTitle, updateFaviconWithTime, t, pomodoroDocRef
      // These are either managed by the effect or stable
    ]);


  // Effect for Rest Timer
  useEffect(() => {
    let currentRestInterval: NodeJS.Timeout | null = null;

    if (isResting && typeof window !== 'undefined') {
      const updateRestTimer = () => {
        setRestTimeLeftSeconds(prev => {
          if (prev <= 1) {
            if (currentRestInterval) clearInterval(currentRestInterval);
            setIsResting(false);
            if (originalTitle) document.title = originalTitle;
            updateFaviconWithTime(null);
            
            if (Notification.permission === "granted") {
              new Notification(t('pomodoro.rest.notification.title'), {
                body: t('pomodoro.rest.notification.body'),
                icon: '/favicon.ico'
              });
            }
            return 0;
          }
          return prev - 1;
        });
      };
      
      const currentRestMinutes = Math.floor(restTimeLeftSeconds / 60);
      document.title = `🧘 ${t('pomodoro.rest.titlePrefix')} ${formatTime(restTimeLeftSeconds)} - ${originalTitle}`;
      updateFaviconWithTime(currentRestMinutes, true);

      currentRestInterval = setInterval(updateRestTimer, 1000);
      setRestIntervalId(currentRestInterval); // Store for potential clearing by other effects
    }
    
    return () => {
      if (currentRestInterval) {
        clearInterval(currentRestInterval);
        setRestIntervalId(null);
      }
    };
  }, [isResting, originalTitle, t, updateFaviconWithTime]); // restTimeLeftSeconds removed to avoid loop, title updated in separate effect


  // Effect to update rest timer title/favicon based on restTimeLeftSeconds changes
  useEffect(() => {
    if (isResting && typeof window !== 'undefined') {
        const currentRestMinutes = Math.floor(restTimeLeftSeconds / 60);
        document.title = `🧘 ${t('pomodoro.rest.titlePrefix')} ${formatTime(restTimeLeftSeconds)} - ${originalTitle}`;
        updateFaviconWithTime(currentRestMinutes, true); 
    }
  }, [restTimeLeftSeconds, isResting, originalTitle, t, updateFaviconWithTime]);


  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

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
    setSelectedBreakOptionId(optionId); 
    setIsBreakDialogOpen(false);
    if (pomodoroIntervalId) { // Ensure main pomodoro timer is stopped
        clearInterval(pomodoroIntervalId);
        setPomodoroIntervalId(null);
    }
    setRestTimeLeftSeconds(DEFAULT_REST_MINUTES * 60); // Reset before starting
    setIsResting(true);
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
    }}>
      {children}
      {user && <BreakOptionsDialog
        isOpen={isBreakDialogOpen}
        onClose={() => {
            setIsBreakDialogOpen(false);
            if (originalTitle) document.title = originalTitle;
            updateFaviconWithTime(null);
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
