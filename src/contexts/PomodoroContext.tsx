
"use client";
import type { PomodoroSessionState } from '@/types';
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore';
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
  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [restIntervalId, setRestIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalFaviconHref, setOriginalFaviconHref] = useState<string | null>(null);

  // State for the break dialog and rest period
  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);
  const [selectedBreakOptionId, setSelectedBreakOptionId] = useState<string>('stretch'); // Default option
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
        ? (getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#F48FB1') // Accent for rest
        : (getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#7E57C2'); // Primary for pomodoro
    context.fill();

    context.font = `bold ${faviconSize * (String(minutes).length > 1 ? 0.5 : 0.6)}px Arial`; // Adjust font size for 1 vs 2 digits
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
      if (intervalId) clearInterval(intervalId);
      setIntervalId(null);
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
    if (intervalId) { // Clear previous interval if it exists
        clearInterval(intervalId);
        setIntervalId(null);
    }

    if (!sessionState || typeof window === 'undefined' || isResting || isBreakDialogOpen) {
        // If resting or break dialog is open, main Pomodoro timer visuals should not update or should be idle
        if (!isResting && sessionState?.status === 'idle' && originalTitle) {
             document.title = originalTitle;
             updateFaviconWithTime(null);
        }
        if (!isResting && sessionState?.status === 'idle') {
            setTimeLeftSeconds((sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES) * 60);
        }
        return;
    }
    
    const minutesLeftForFavicon = Math.floor(timeLeftSeconds / 60);

    if (sessionState.status === 'running') {
        document.title = `⏲️ ${formatTime(timeLeftSeconds)} - ${originalTitle}`;
        updateFaviconWithTime(minutesLeftForFavicon);
    } else if (sessionState.status === 'paused') {
        document.title = `⏸️ ${formatTime(timeLeftSeconds)} - ${originalTitle}`;
        updateFaviconWithTime(minutesLeftForFavicon);
    } else { // idle
        document.title = originalTitle;
        updateFaviconWithTime(null);
    }

    if (sessionState.status === 'running' && sessionState.targetEndTime) {
        const updateTimer = () => {
            const currentTargetEndTime = sessionState.targetEndTime;
            if (!currentTargetEndTime) {
                console.warn("Timer status 'running' but targetEndTime is null. Resetting.");
                // This should ideally be handled by sessionState update via Firestore
                return;
            }
            const now = Date.now();
            const remaining = Math.max(0, Math.round((currentTargetEndTime - now) / 1000));
            setTimeLeftSeconds(remaining);

            if (remaining === 0) {
                // Pomodoro session ends
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
                        notes: notesToPreserve,
                        updatedAt: serverTimestamp()
                    }, { merge: true })
                    .finally(() => {
                        setIsBreakDialogOpen(true); // Open the break dialog
                        if (Notification.permission === "granted") {
                            new Notification(t('pomodoro.notification.title'), {
                                body: t('pomodoro.notification.body'),
                                icon: '/favicon.ico'
                            });
                        }
                        // UI resets for title/favicon are best handled when sessionState.status changes to 'idle'
                        // but doing a quick one here can be good if Firestore is slow.
                        if (originalTitle) document.title = originalTitle;
                        updateFaviconWithTime(null);
                    });
                } else {
                    // Fallback if critical info is missing, still try to open dialog and reset UI
                    if (originalTitle) document.title = originalTitle;
                    updateFaviconWithTime(null);
                    setIsBreakDialogOpen(true);
                }

                // Crucially, clear the interval that was counting down
                if (intervalId) {
                    clearInterval(intervalId);
                    setIntervalId(null);
                }
            }
        };

        updateTimer(); // Initial call
        const newInterval = setInterval(updateTimer, 1000);
        setIntervalId(newInterval);

    } else if (sessionState.status === 'paused' && sessionState.pausedTimeLeftSeconds !== null) {
      setTimeLeftSeconds(sessionState.pausedTimeLeftSeconds);
    } else if (sessionState.status === 'idle') {
      setTimeLeftSeconds((sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES) * 60);
      // Title and favicon reset for idle state is handled by the initial block of this effect if !isResting
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
        // No setIntervalId(null) here, as this is a cleanup of the *current* effect's interval
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState?.status, sessionState?.targetEndTime, sessionState?.userPreferredDurationMinutes, sessionState?.pausedTimeLeftSeconds, user?.uid, pomodoroDocRef, originalTitle, updateFaviconWithTime, t, isResting, isBreakDialogOpen]);


  // Effect for Rest Timer
  useEffect(() => {
    if (restIntervalId) { // Clear previous interval if it exists
        clearInterval(restIntervalId);
        setRestIntervalId(null);
    }

    if (isResting && typeof window !== 'undefined') {
        const updateRestTimer = () => {
            setRestTimeLeftSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(newRestInterval); // Clear before state change
                    setRestIntervalId(null);
                    setIsResting(false);
                    if (originalTitle) document.title = originalTitle;
                    updateFaviconWithTime(null); // Restore original favicon
                    
                    if (Notification.permission === "granted") {
                        new Notification(t('pomodoro.rest.notification.title'), {
                            body: t('pomodoro.rest.notification.body'),
                            icon: '/favicon.ico'
                        });
                    }
                    // Pomodoro state should already be 'idle'
                    return 0;
                }
                return prev - 1;
            });
        };
        
        // Initial title/favicon update for rest period
        const currentRestMinutes = Math.floor(restTimeLeftSeconds / 60);
        document.title = `🧘 ${t('pomodoro.rest.titlePrefix')} ${formatTime(restTimeLeftSeconds)} - ${originalTitle}`;
        updateFaviconWithTime(currentRestMinutes, true);

        const newRestInterval = setInterval(updateRestTimer, 1000);
        setRestIntervalId(newRestInterval);
        
        return () => {
            if (newRestInterval) clearInterval(newRestInterval);
        };
    } else if (!isResting && restIntervalId) {
        // Clean up if isResting becomes false but interval somehow persists
        clearInterval(restIntervalId);
        setRestIntervalId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isResting, originalTitle, updateFaviconWithTime, t]);

  // Effect to update rest timer title/favicon based on restTimeLeftSeconds
  useEffect(() => {
    if (isResting && typeof window !== 'undefined') {
        const currentRestMinutes = Math.floor(restTimeLeftSeconds / 60);
        document.title = `🧘 ${t('pomodoro.rest.titlePrefix')} ${formatTime(restTimeLeftSeconds)} - ${originalTitle}`;
        updateFaviconWithTime(currentRestMinutes, true); // true for isRestingFavicon
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
    
    if (intervalId) { // Clear the interval when pausing
        clearInterval(intervalId);
        setIntervalId(null);
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
    
    if (intervalId) { // Clear the interval when giving up
        clearInterval(intervalId);
        setIntervalId(null);
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
    setSelectedBreakOptionId(optionId); // Store selected option if needed later
    setIsBreakDialogOpen(false);
    setIsResting(true);
    setRestTimeLeftSeconds(DEFAULT_REST_MINUTES * 60);
    // Main pomodoro timer should already be stopped or will stop due to status change
    if (intervalId) {
        clearInterval(intervalId);
        setIntervalId(null);
    }
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
            // If user closes dialog without starting rest, ensure main timer UI is idle.
            // The sessionState.status should already be 'idle' from Firestore.
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

