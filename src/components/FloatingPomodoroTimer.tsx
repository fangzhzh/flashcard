"use client";

import { useState } from 'react';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { Button } from '@/components/ui/button';
import { Pause, Play, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/lib/i18n/client';

const DEFAULT_POMODORO_MINUTES_DISPLAY = 25;

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function FloatingPomodoroTimer() {
  const {
    sessionState,
    timeLeftSeconds,
    startPomodoro,
    pausePomodoro,
    continuePomodoro,
    isResting,
    restTimeLeftSeconds
  } = usePomodoro();

  const t = useI18n();
  const [isHovered, setIsHovered] = useState(false);

  if (!sessionState) {
      return null; // Should not happen if a user is logged in
  }

  const handleInteraction = () => {
    if (sessionState.status === 'running') {
      pausePomodoro();
    } else if (sessionState.status === 'paused') {
      continuePomodoro();
    } else if (sessionState.status === 'idle' && !isResting) {
      const preferredDuration = sessionState.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES_DISPLAY;
      startPomodoro(preferredDuration);
    }
    // Clicking the rest timer will do nothing, it's just a display.
  };

  const getButtonContent = () => {
    if (isResting) {
      return isHovered ? <Coffee className="h-7 w-7" /> : <span className="text-lg font-semibold tabular-nums">{formatTime(restTimeLeftSeconds)}</span>;
    }

    switch (sessionState.status) {
      case 'running':
        return isHovered ? <Pause className="h-7 w-7" /> : <span className="text-lg font-semibold tabular-nums">{formatTime(timeLeftSeconds)}</span>;
      case 'paused':
        return isHovered ? <Play className="h-7 w-7" /> : <span className="text-lg font-semibold tabular-nums">{formatTime(timeLeftSeconds)}</span>;
      case 'idle':
      default:
        return <Play className="h-7 w-7 text-primary" />;
    }
  };
  
  const getButtonVariant = () => {
    if (isResting) return "accent";
    if (sessionState.status === 'running') return "default";
    return "outline";
  };
  
  return (
      <Button
        variant={getButtonVariant()}
        className={cn(
          "h-14 w-14 rounded-full p-0 shadow-lg flex items-center justify-center",
          "hover:scale-105 focus:scale-105",
          sessionState.status === 'paused' && "bg-amber-500 text-white hover:bg-amber-600",
          sessionState.status === 'idle' && !isResting && "bg-background text-foreground border-2 border-input hover:bg-muted"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleInteraction}
        aria-label="Pomodoro Timer Control"
      >
        {getButtonContent()}
      </Button>
  );
}
