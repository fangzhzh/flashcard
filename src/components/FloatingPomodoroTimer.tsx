
"use client";

import { useState, useEffect } from 'react';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { useAuth } from '@/contexts/AuthContext';
import { usePathname, useRouter } from 'next/navigation';
import { useCurrentLocale, useI18n } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Pause, Play, Coffee, TimerIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function FloatingPomodoroTimer() {
  const { user } = useAuth();
  const {
    sessionState,
    timeLeftSeconds,
    pausePomodoro,
    continuePomodoro,
    isResting,
    restTimeLeftSeconds
  } = usePomodoro();

  const t = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const currentLocale = useCurrentLocale();
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!user || !sessionState || !currentLocale) {
      setIsVisible(false);
      return;
    }

    let isMainTimerPage = false;
    if (pathname === `/${currentLocale}/timer` || pathname === `/${currentLocale}`) {
        isMainTimerPage = true;
    }
     // Handle root path specifically, as it also acts as a timer page (local)
    if (pathname === '/') {
        isMainTimerPage = true;
    }


    if (isMainTimerPage) {
      setIsVisible(false);
      return;
    }

    // Show if user is logged in, not on a main timer page, AND
    // (timer is running/paused OR is resting OR is idle)
    const timerActiveOrResting = (sessionState.status === 'running' || sessionState.status === 'paused') || isResting;
    const timerIsIdleAndNotResting = sessionState.status === 'idle' && !isResting;

    setIsVisible(timerActiveOrResting || timerIsIdleAndNotResting);

  }, [user, sessionState, pathname, currentLocale, isResting]);


  if (!isVisible) {
    return null;
  }

  const handleIdleClick = () => {
    router.push(`/${currentLocale}/timer`);
  };

  // Idle State
  if (sessionState!.status === 'idle' && !isResting) {
    const preferredDuration = sessionState!.userPreferredDurationMinutes || 25;
    return (
      <Button
        variant="outline"
        className={cn(
          "fixed bottom-[6.5rem] right-6 z-50 rounded-full h-16 w-16 p-0 shadow-xl transition-all flex items-center justify-center",
          "hover:scale-105 focus:scale-105",
          "bg-background hover:bg-muted"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleIdleClick}
        aria-label={t('pomodoro.button.start')}
      >
        {isHovered ? (
          <span className="text-lg font-semibold tabular-nums">
            {formatTime(preferredDuration * 60)}
          </span>
        ) : (
          <TimerIcon className="h-7 w-7 text-primary" />
        )}
      </Button>
    );
  }


  // Resting State
  if (isResting) {
    return (
      <Button
        variant="default"
        className={cn(
          "fixed bottom-[6.5rem] right-6 z-50 rounded-full h-16 w-16 p-0 shadow-xl transition-all flex items-center justify-center",
          "hover:scale-105 focus:scale-105",
          "bg-accent text-accent-foreground hover:bg-accent/90"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Rest Timer"
      >
        {isHovered ? (
            <Coffee className="h-7 w-7" />
        ) : (
            <span className="text-lg font-semibold tabular-nums">
            {formatTime(restTimeLeftSeconds)}
            </span>
        )}
      </Button>
    );
  }

  // Pomodoro Running/Paused State (sessionState is guaranteed to be non-null here due to isVisible logic)
  const isActive = sessionState!.status === 'running';
  const isPaused = sessionState!.status === 'paused';

  return (
    <Button
      variant={isActive ? "default" : "outline"}
      className={cn(
        "fixed bottom-[6.5rem] right-6 z-50 rounded-full h-16 w-16 p-0 shadow-xl transition-all flex items-center justify-center",
        "hover:scale-105 focus:scale-105",
        isPaused && "bg-accent text-accent-foreground hover:bg-accent/90"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isActive ? (e) => { e.stopPropagation(); pausePomodoro(); }
                       : (e) => { e.stopPropagation(); continuePomodoro(); }}
      aria-label={isActive ? t('pomodoro.button.pause') : (isPaused ? t('pomodoro.button.continue') : "Pomodoro Timer")}
    >
      {isHovered ? (
        isActive ? (
          <Pause className="h-7 w-7" />
        ) : (
          <Play className="h-7 w-7" />
        )
      ) : (
        <span className="text-lg font-semibold tabular-nums">
          {formatTime(timeLeftSeconds)}
        </span>
      )}
    </Button>
  );
}
