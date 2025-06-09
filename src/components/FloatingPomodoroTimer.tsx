
"use client";

import { useState, useEffect } from 'react'; // Added useEffect
import { usePomodoro } from '@/contexts/PomodoroContext'; // This is the Firestore-backed context
import { useAuth } from '@/contexts/AuthContext'; // To check if user is logged in
import { usePathname } from 'next/navigation';
import { useCurrentLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { Pause, Play, Coffee } from 'lucide-react';
import { cn } from '@/lib/utils';

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export default function FloatingPomodoroTimer() {
  const { user } = useAuth(); // Check for user
  const { 
    sessionState, 
    timeLeftSeconds, 
    pausePomodoro, 
    continuePomodoro, 
    isResting,
    restTimeLeftSeconds
  } = usePomodoro();
  
  const pathname = usePathname();
  const currentLocale = useCurrentLocale();
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false); // Manage visibility

  useEffect(() => {
    if (!user || !sessionState || !currentLocale) {
      setIsVisible(false);
      return;
    }

    let isMainPomodoroPage = false;
    const defaultLocale = 'en'; 
    if (pathname === '/') {
      isMainPomodoroPage = currentLocale === defaultLocale;
    } else {
      isMainPomodoroPage = pathname === `/${currentLocale}`;
    }

    if (isMainPomodoroPage) {
      setIsVisible(false);
      return;
    }

    // Conditions for visibility (user logged in, not on main page, timer active or resting)
    const timerActiveOrResting = (sessionState.status === 'running' || sessionState.status === 'paused') || isResting;
    setIsVisible(timerActiveOrResting);

  }, [user, sessionState, pathname, currentLocale, isResting]);


  if (!isVisible) { // Controlled by useEffect now
    return null;
  }
  
  // If resting, show rest timer in floating button
  if (isResting) {
    return (
      <Button
        variant="default"
        className={cn(
          "fixed bottom-6 right-6 z-50 rounded-full h-16 w-16 p-0 shadow-xl transition-all flex items-center justify-center",
          "hover:scale-105 focus:scale-105",
          "bg-accent text-accent-foreground hover:bg-accent/90"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label="Rest Timer"
        // onClick could skip rest or navigate, but for now it's display only
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
  // This part will only be reached if sessionState is not null (checked by isVisible logic)
  const isActive = sessionState!.status === 'running';
  const isPaused = sessionState!.status === 'paused';

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

    