
"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Settings2, Eraser, ShieldAlert, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const DEFAULT_POMODORO_MINUTES = 25;

export default function PomodoroClient() {
  const t = useI18n();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [pomodoroDurationMinutes, setPomodoroDurationMinutes] = useState(DEFAULT_POMODORO_MINUTES);
  const [timeLeft, setTimeLeft] = useState(DEFAULT_POMODORO_MINUTES * 60);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [notes, setNotes] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const stopTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const resetTimerState = useCallback(() => {
    stopTimer();
    setIsActive(false);
    setIsPaused(false);
    setTimeLeft(pomodoroDurationMinutes * 60);
  }, [pomodoroDurationMinutes, stopTimer]);

  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            stopTimer();
            setIsActive(false);
            toast({
              title: t('pomodoro.toast.completed'),
              description: t('pomodoro.toast.completed.description'),
            });
            // Future: Add sound notification here if desired
            return pomodoroDurationMinutes * 60; // Reset for next session
          }
          return prevTime - 1;
        });
      }, 1000);
    } else {
      stopTimer();
    }
    return () => stopTimer();
  }, [isActive, isPaused, stopTimer, pomodoroDurationMinutes, t, toast]);
  
  // Reset timeLeft when pomodoroDurationMinutes changes and timer is not active
  useEffect(() => {
    if (!isActive) {
      setTimeLeft(pomodoroDurationMinutes * 60);
    }
  }, [pomodoroDurationMinutes, isActive]);


  const handleStart = () => {
    if (!user) {
      toast({ title: t('error'), description: t('pomodoro.auth.required'), variant: "destructive" });
      return;
    }
    setTimeLeft(pomodoroDurationMinutes * 60);
    setIsActive(true);
    setIsPaused(false);
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleContinue = () => {
    setIsPaused(false);
  };

  const handleGiveUp = () => {
    resetTimerState();
  };
  
  const handleResetSettings = () => {
    setPomodoroDurationMinutes(DEFAULT_POMODORO_MINUTES);
    if (!isActive) {
       setTimeLeft(DEFAULT_POMODORO_MINUTES * 60);
    }
  }

  const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(e.target.value, 10);
    if (!isNaN(newDuration) && newDuration > 0 && newDuration <= 120) { // Max 2 hours
      setPomodoroDurationMinutes(newDuration);
    } else if (e.target.value === '') {
       setPomodoroDurationMinutes(0); // Allow empty for typing
    }
  };
  
  if (authLoading) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
       <Alert variant="destructive" className="mt-8 max-w-md mx-auto">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('pomodoro.auth.required')}</AlertDescription>
        </Alert>
    );
  }


  return (
    <div className="flex flex-col items-center space-y-8">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-6xl font-bold text-primary tabular-nums">
            {formatTime(timeLeft)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isActive ? (
            <Button onClick={handleStart} className="w-full text-lg py-3" size="lg">
              <Play className="mr-2 h-5 w-5" /> {t('pomodoro.button.start')}
            </Button>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {!isPaused ? (
                <Button onClick={handlePause} variant="outline" className="w-full text-lg py-3" size="lg">
                  <Pause className="mr-2 h-5 w-5" /> {t('pomodoro.button.pause')}
                </Button>
              ) : (
                <Button onClick={handleContinue} variant="outline" className="w-full text-lg py-3" size="lg">
                  <Play className="mr-2 h-5 w-5" /> {t('pomodoro.button.continue')}
                </Button>
              )}
              <Button onClick={handleGiveUp} variant="destructive" className="w-full text-lg py-3" size="lg">
                <RotateCcw className="mr-2 h-5 w-5" /> {t('pomodoro.button.giveUp')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Settings2 className="mr-2 h-5 w-5 text-muted-foreground" />
            {t('pomodoro.settings.durationLabel')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Input
            type="number"
            id="pomodoroDuration"
            value={pomodoroDurationMinutes === 0 && !isActive ? '' : pomodoroDurationMinutes} // Show empty if 0 and not active
            onChange={handleDurationInputChange}
            placeholder={t('pomodoro.settings.durationPlaceholder')}
            className="text-base"
            disabled={isActive}
            min="1"
            max="120"
          />
          <Button onClick={handleResetSettings} variant="outline" size="icon" title={t('pomodoro.button.reset')} disabled={isActive}>
            <Eraser className="h-5 w-5"/>
          </Button>
        </CardContent>
      </Card>
      
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
            <CardTitle className="text-lg">{t('pomodoro.notes.label')}</CardTitle>
        </CardHeader>
        <CardContent>
            <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={t('pomodoro.notes.placeholder')}
                className="min-h-[80px] text-sm" 
            />
        </CardContent>
      </Card>
    </div>
  );
}
