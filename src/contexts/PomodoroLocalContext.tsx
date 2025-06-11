
"use client";
import type { PomodoroSessionState as PomodoroStateStructure } from '@/types'; // Renaming to avoid conflict if used locally
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n/client';

const DEFAULT_POMODORO_MINUTES = 25;
const DEFAULT_REST_MINUTES = 5;

interface LocalPomodoroSessionState extends Omit<PomodoroStateStructure, 'userId' | 'updatedAt'> {
  updatedAt: number;
  currentTaskTitle?: string | null;
}

interface PomodoroLocalContextType {
  sessionState: LocalPomodoroSessionState;
  timeLeftSeconds: number;
  startPomodoro: (durationMinutes: number, taskTitle?: string) => Promise<void>; // Added taskTitle
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

const PomodoroLocalContext = createContext<PomodoroLocalContextType | undefined>(undefined);

export const PomodoroLocalProvider = ({ children }: { children: ReactNode }) => {
  const { toast } = useToast();
  const t = useI18n();

  const initialSessionState: LocalPomodoroSessionState = {
    status: 'idle',
    targetEndTime: null,
    pausedTimeLeftSeconds: null,
    currentSessionInitialDurationMinutes: DEFAULT_POMODORO_MINUTES,
    userPreferredDurationMinutes: DEFAULT_POMODORO_MINUTES,
    notes: '',
    currentTaskTitle: null,
    updatedAt: Date.now(),
  };

  const [sessionState, setSessionState] = useState<LocalPomodoroSessionState>(initialSessionState);
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(DEFAULT_POMODORO_MINUTES * 60);

  const pomodoroIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [originalTitle, setOriginalTitle] = useState('');
  const [originalFaviconHref, setOriginalFaviconHref] = useState<string | null>(null);

  const [isBreakDialogOpen, setIsBreakDialogOpen] = useState(false);
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

    const currentPreferredDuration = sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES;
    const notesToPreserve = sessionState.notes || '';
    setSessionState(prev => ({
      ...prev,
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
      currentSessionInitialDurationMinutes: currentPreferredDuration,
      notes: notesToPreserve,
      currentTaskTitle: null, // Clear task title
      updatedAt: Date.now()
    }));

    setIsBreakDialogOpen(true);
    if (typeof window !== 'undefined' && Notification.permission === "granted") {
      new Notification(t('pomodoro.notification.title'), {
        body: t('pomodoro.notification.body'),
        icon: '/favicon.ico'
      });
    }
  }, [isResting, isBreakDialogOpen, sessionState.userPreferredDurationMinutes, sessionState.notes, t, setSessionState, setIsBreakDialogOpen]);

  useEffect(() => {
    if (isResting || isBreakDialogOpen || sessionState.status !== 'running' || !sessionState.targetEndTime) {
      if (pomodoroIntervalRef.current) {
        clearInterval(pomodoroIntervalRef.current);
        pomodoroIntervalRef.current = null;
      }
      if (sessionState.status === 'paused' && sessionState.pausedTimeLeftSeconds !== null) {
        setTimeLeftSeconds(sessionState.pausedTimeLeftSeconds);
      } else if (sessionState.status === 'idle') {
         setTimeLeftSeconds((sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES) * 60);
      }
      return;
    }

    const updateTimer = () => {
      const currentTargetEndTime = sessionState.targetEndTime;
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
  }, [sessionState.status, sessionState.targetEndTime, sessionState.userPreferredDurationMinutes, isResting, isBreakDialogOpen, currentTimerEnds]);

  useEffect(() => {
      if (typeof window === 'undefined') return;

      let currentDisplayTime = 0;
      let titlePrefix = '';
      let displayMinutesForFavicon: number | null = null;
      let useRestStylingForFavicon = false;
      let isPomodoroIdleVisual = sessionState.status === 'idle';
      let taskTitleSegment = sessionState.currentTaskTitle ? `(${sessionState.currentTaskTitle}) ` : '';

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
          document.title = `${titlePrefix}${taskTitleSegment}${formatTime(currentDisplayTime)} - ${originalTitle}`;
      } else {
          document.title = originalTitle;
      }
      updateFaviconWithTime(displayMinutesForFavicon, useRestStylingForFavicon, isPomodoroIdleVisual);

  }, [timeLeftSeconds, restTimeLeftSeconds, isResting, sessionState.status, sessionState.currentTaskTitle, originalTitle, updateFaviconWithTime, t]);

  useEffect(() => {
    if (!isResting) return;

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

  const startPomodoro = async (durationMinutes: number, taskTitle?: string) => {
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
    setSessionState(prev => ({
      ...prev,
      status: 'running',
      targetEndTime,
      currentSessionInitialDurationMinutes: durationMinutes,
      userPreferredDurationMinutes: prev.userPreferredDurationMinutes || durationMinutes,
      pausedTimeLeftSeconds: null,
      currentTaskTitle: taskTitle || null, // Set task title
      updatedAt: Date.now(),
    }));
  };

  const pausePomodoro = async () => {
    if (sessionState.status !== 'running' || !sessionState.targetEndTime) return;
    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current);
      pomodoroIntervalRef.current = null;
    }
    const now = Date.now();
    const pausedTimeLeft = Math.max(0, Math.round((sessionState.targetEndTime - now) / 1000));
    setSessionState(prev => ({
      ...prev,
      status: 'paused',
      pausedTimeLeftSeconds: pausedTimeLeft,
      updatedAt: Date.now(),
    }));
  };

  const continuePomodoro = async () => {
    if (sessionState.status !== 'paused' || sessionState.pausedTimeLeftSeconds === null) return;
    const now = Date.now();
    const newTargetEndTime = now + sessionState.pausedTimeLeftSeconds * 1000;
    setSessionState(prev => ({
      ...prev,
      status: 'running',
      targetEndTime: newTargetEndTime,
      pausedTimeLeftSeconds: null,
      updatedAt: Date.now(),
    }));
  };

  const giveUpPomodoro = async () => {
    if (pomodoroIntervalRef.current) {
      clearInterval(pomodoroIntervalRef.current);
      pomodoroIntervalRef.current = null;
    }
    setSessionState(prev => ({
      ...prev,
      status: 'idle',
      targetEndTime: null,
      pausedTimeLeftSeconds: null,
      currentTaskTitle: null, // Clear task title
      updatedAt: Date.now(),
    }));
  };

  const updateUserPreferredDuration = async (minutes: number) => {
    const newDuration = Math.max(1, Math.min(minutes, 120));
    setSessionState(prev => {
        const newState = {
            ...prev,
            userPreferredDurationMinutes: newDuration,
            updatedAt: Date.now(),
        };
        if (prev.status === 'idle') {
            newState.currentSessionInitialDurationMinutes = newDuration;
            setTimeLeftSeconds(newDuration * 60);
        }
        return newState;
    });
  };

  const updateNotes = async (text: string) => {
    setSessionState(prev => ({ ...prev, notes: text, updatedAt: Date.now() }));
  };

  const handleStartRestPeriod = (selectedOptionId: string) => {
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
    <PomodoroLocalContext.Provider value={{
      sessionState,
      timeLeftSeconds,
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
    </PomodoroLocalContext.Provider>
  );
};

export const usePomodoroLocal = () => {
  const context = useContext(PomodoroLocalContext);
  if (context === undefined) {
    throw new Error('usePomodoroLocal must be used within a PomodoroLocalProvider');
  }
  return context;
};
