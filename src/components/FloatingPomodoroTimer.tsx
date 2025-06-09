
"use client";

import { useState } from 'react';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { usePathname } from 'next/navigation';
import { useCurrentLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Pause, Play, Coffee } from 'lucide-react'; // Added Coffee
import { cn } from '@/lib/utils';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function FloatingPomodoroTimer() {
  const { 
    sessionState, 
    timeLeftSeconds, 
    pausePomodoro, 
    continuePomodoro, 
    isResting,        // Added
    restTimeLeftSeconds // Added
  } = usePomodoro();
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

  if (!sessionState || isMainPomodoroPage) {
    return null;
  }

  // If resting, show rest timer in floating button
  if (isResting) {
    return (
      <Button
        variant="default" // Using default as it will be styled with accent below
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 p-0 shadow-xl transition-all flex items-center justify-center",
          "hover:scale-105 focus:scale-105",
          "bg-accent text-accent-foreground hover:bg-accent/90" // Accent style for rest
        )}
        // onClick could skip rest in future, or navigate to main timer page
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

  // Existing logic for Pomodoro running/paused (if not resting)
  if (sessionState.status !== 'running' && sessionState.status !== 'paused') {
    return null;
  }

  const isActive = sessionState.status === 'running';
  const isPaused = sessionState.status === 'paused';

  return (
    <Button
      variant={isActive ? "default" : "outline"} 
      className={cn(
        "fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 p-0 shadow-xl transition-all flex items-center justify-center",
        "hover:scale-105 focus:scale-105",
        isPaused && "bg-accent text-accent-foreground hover:bg-accent/90"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={isActive ? (e) => { e.stopPropagation(); pausePomodoro(); } 
                       : (e) => { e.stopPropagation(); continuePomodoro(); }}
      aria-label={isActive ? "Pause Pomodoro" : (isPaused ? "Continue Pomodoro" : "Pomodoro Timer")}
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
