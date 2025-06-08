
"use client";

import { useState } from 'react';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { usePathname } from 'next/navigation';
import { useCurrentLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Pause, Play } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function FloatingPomodoroTimer() {
  const { sessionState, timeLeftSeconds, pausePomodoro, continuePomodoro } = usePomodoro();
  const pathname = usePathname();
  const currentLocale = useCurrentLocale();
  const [isHovered, setIsHovered] = useState(false);

  if (!currentLocale) {
    return null;
  }

  let isMainPomodoroPage = false;
  const defaultLocale = 'en'; 

  if (pathname === '/') {
    isMainPomodoroPage = currentLocale === defaultLocale;
  } else {
    isMainPomodoroPage = pathname === `/${currentLocale}`;
  }


  if (!sessionState || (sessionState.status !== 'running' && sessionState.status !== 'paused') || isMainPomodoroPage) {
    return null;
  }

  const handlePauseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    pausePomodoro();
  };

  const handleContinueClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    continuePomodoro();
  };

  const isActive = sessionState.status === 'running';
  const isPaused = sessionState.status === 'paused';

  return (
    <Button
      variant={isActive ? "default" : "outline"} // 'outline' provides border for paused state
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 p-0 shadow-xl transition-all flex items-center justify-center",
        "hover:scale-105 focus:scale-105",
        // If paused, override 'outline' variant's default bg, text, and hover with accent colors
        isPaused && "bg-accent text-accent-foreground hover:bg-accent/90"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isActive ? handlePauseClick : handleContinueClick}
      aria-label={isActive ? "Pause Pomodoro" : (isPaused ? "Continue Pomodoro" : "Pomodoro Timer")}
    >
      {isHovered ? (
        isActive ? (
          <Pause className="h-7 w-7" />
        ) : (
          // isPaused will also be true here if !isActive
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

