
"use client";

import { useState, useEffect } from 'react';
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

  // If currentLocale is not yet available, don't render.
  // This can happen during initial hydration or if context is not ready.
  if (!currentLocale) {
    return null;
  }

  // Determine if the current page is the main Pomodoro page.
  // The Pomodoro page is the root of the current locale (e.g., /en, /zh).
  // It should have exactly one path segment, which is the current locale.
  const pathSegments = pathname.split('/').filter(segment => segment.length > 0);
  const isMainPomodoroPage = pathSegments.length === 1 && pathSegments[0] === currentLocale;

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

  return (
    <Button
      variant={isActive ? "default" : "outline"}
      size="lg" 
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 p-0 shadow-xl transition-all flex items-center justify-center",
        "hover:scale-105 focus:scale-105" 
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isActive ? handlePauseClick : handleContinueClick}
      aria-label={isActive ? "Pause Pomodoro" : "Continue Pomodoro"}
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
