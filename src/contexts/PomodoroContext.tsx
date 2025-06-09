
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
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalFaviconHref, setOriginalFaviconHref] = useState<string | null>(null);


  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOriginalTitle(document.title);
      const faviconElement = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
      if (faviconElement) {
        setOriginalFaviconHref(faviconElement.href);
      }
    }
  }, []);

  const updateFaviconWithTime = useCallback((minutes: number | null) => {
    if (typeof window === 'undefined') return;
    const faviconSize = 32;
    const canvas = document.createElement('canvas');
    canvas.width = faviconSize;
    canvas.height = faviconSize;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Clear canvas
    context.clearRect(0, 0, faviconSize, faviconSize);
    
    if (minutes === null || sessionState?.status === 'idle') { // Restore original or clear
        if (originalFaviconHref) {
             const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
             link.type = 'image/x-icon';
             link.rel = 'shortcut icon';
             link.href = originalFaviconHref;
             document.getElementsByTagName('head')[0].appendChild(link);
        }
        return;
    }

    // Draw background circle (optional, adjust color as needed)
    context.beginPath();
    context.arc(faviconSize / 2, faviconSize / 2, faviconSize / 2, 0, 2 * Math.PI);
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#7E57C2'; // Use theme primary
    context.fill();

    // Draw text (minutes)
    context.font = `bold ${faviconSize * 0.6}px Arial`;
    context.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-foreground').trim() || '#FFFFFF'; // Use theme primary foreground
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(String(minutes), faviconSize / 2, faviconSize / 2 + faviconSize * 0.05); // Slight Y offset for better centering

    // Update favicon link
    const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/png'; // Use PNG for canvas generated favicons
    link.rel = 'icon'; // 'icon' is more standard for dynamic favicons
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
      if (typeof window !== 'undefined') document.title = originalTitle;
      updateFaviconWithTime(null);
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
  }, [user, authLoading, pomodoroDocRef, originalTitle, updateFaviconWithTime]);


  useEffect(() => {
    if (intervalId) {
      clearInterval(intervalId);
      setIntervalId(null); 
    }

    if (!sessionState || typeof window === 'undefined') {
      if (originalTitle) document.title = originalTitle;
      updateFaviconWithTime(null);
      return;
    }

    const minutesLeft = Math.floor(timeLeftSeconds / 60);

    if (sessionState.status === 'running') {
        document.title = `⏲️ ${formatTime(timeLeftSeconds)} - ${originalTitle}`;
        updateFaviconWithTime(minutesLeft);
    } else if (sessionState.status === 'paused') {
        document.title = `⏸️ ${formatTime(timeLeftSeconds)} - ${originalTitle}`;
        updateFaviconWithTime(minutesLeft); // Show paused time on favicon too
    } else { // idle
        document.title = originalTitle;
        updateFaviconWithTime(null); // Restore original favicon
    }

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
              currentSessionInitialDurationMinutes: currentPreferredDuration, 
              updatedAt: serverTimestamp() 
            }, { merge: true });
          }
          toast({
            title: t('pomodoro.toast.completed'),
            description: t('pomodoro.toast.completed.description'),
          });
          if (Notification.permission === "granted") {
            new Notification(t('pomodoro.notification.title'), {
              body: t('pomodoro.notification.body'),
              icon: '/favicon.ico' // Optional: use your app's icon
            });
          }
          document.title = originalTitle; // Restore title immediately on completion
          updateFaviconWithTime(null); // Restore favicon
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
  }, [sessionState, pomodoroDocRef, user?.uid, t, toast, originalTitle, updateFaviconWithTime]); 

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
