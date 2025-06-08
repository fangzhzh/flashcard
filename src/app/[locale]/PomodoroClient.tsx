
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetTrigger, SheetClose } from '@/components/ui/sheet';
import { Play, Pause, RotateCcw, Settings2, Eraser, Loader2, NotebookPen, NotebookText, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { useAuth } from '@/contexts/AuthContext';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';

const DEFAULT_POMODORO_MINUTES_DISPLAY = 25; // For initial display before context loads

export default function PomodoroClient() {
  const t = useI18n();
  const { user, loading: authLoading } = useAuth();
  const { 
    sessionState, 
    timeLeftSeconds, 
    isLoading: pomodoroLoading, 
    startPomodoro, 
    pausePomodoro, 
    continuePomodoro, 
    giveUpPomodoro,
    updateUserPreferredDuration,
    updateNotes
  } = usePomodoro();

  const [localNotes, setLocalNotes] = useState('');
  const [isNotesSheetOpen, setIsNotesSheetOpen] = useState(false);
  const [isSettingsCardVisible, setIsSettingsCardVisible] = useState(false);
  const [durationInput, setDurationInput] = useState(
    sessionState?.userPreferredDurationMinutes || DEFAULT_POMODORO_MINUTES_DISPLAY
  );

  useEffect(() => {
    if (sessionState) {
      setLocalNotes(sessionState.notes);
      setDurationInput(sessionState.userPreferredDurationMinutes);
    }
  }, [sessionState]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!user) {
      // This should ideally be caught by the page guard below, but good to have
      return;
    }
    startPomodoro(durationInput);
    setIsSettingsCardVisible(false);
  };

  const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(e.target.value, 10);
    if (!isNaN(newDuration) && newDuration > 0 && newDuration <= 120) {
      setDurationInput(newDuration);
    } else if (e.target.value === '') {
      setDurationInput(0); // Or some placeholder / min value
    }
  };
  
  const handleDurationSettingsSave = () => {
     if (durationInput > 0 && durationInput <= 120) {
        updateUserPreferredDuration(durationInput);
     }
     // Optionally close settings card or provide feedback
  };

  const handleResetSettings = () => {
    const defaultDuration = DEFAULT_POMODORO_MINUTES_DISPLAY; // Or a constant from context/config
    setDurationInput(defaultDuration);
    updateUserPreferredDuration(defaultDuration);
  };

  const toggleSettingsVisibility = () => {
    if (sessionState?.status === 'idle') {
      setIsSettingsCardVisible(!isSettingsCardVisible);
    }
  };

  const handleNotesSheetClose = () => {
    if (sessionState && localNotes !== sessionState.notes) {
        updateNotes(localNotes);
    }
    setIsNotesSheetOpen(false);
  }
  
  if (authLoading || pomodoroLoading) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user && !authLoading) { // Ensure user is loaded and exists
    return (
       <Alert variant="destructive" className="mt-8 max-w-md mx-auto">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('pomodoro.auth.required')}</AlertDescription>
        </Alert>
    );
  }
  
  const timerIsActive = sessionState?.status === 'running' || sessionState?.status === 'paused';

  return (
    <div className="flex flex-col items-center space-y-8 relative min-h-[calc(100vh-12rem)] pb-20">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader 
          className={cn(
            "text-center",
            sessionState?.status === 'idle' && "cursor-pointer hover:bg-muted/50 rounded-t-lg transition-colors"
          )}
          onClick={toggleSettingsVisibility}
          title={sessionState?.status === 'idle' ? t('pomodoro.settings.toggleHint') : undefined}
        >
          <CardTitle className="text-6xl font-bold text-primary tabular-nums">
            {formatTime(timeLeftSeconds)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {sessionState?.status === 'idle' && (
            <Button onClick={handleStart} className="w-full text-lg py-3" size="lg" disabled={durationInput <=0 || durationInput > 120}>
              <Play className="mr-2 h-5 w-5" /> {t('pomodoro.button.start')}
            </Button>
          )}
          {sessionState?.status === 'running' && (
            <Button onClick={pausePomodoro} variant="outline" className="w-full text-lg py-3" size="lg">
              <Pause className="mr-2 h-5 w-5" /> {t('pomodoro.button.pause')}
            </Button>
          )}
          {sessionState?.status === 'paused' && (
            <div className="grid grid-cols-2 gap-4">
              <Button onClick={continuePomodoro} variant="outline" className="w-full text-lg py-3" size="lg">
                <Play className="mr-2 h-5 w-5" /> {t('pomodoro.button.continue')}
              </Button>
              <Button onClick={giveUpPomodoro} variant="destructive" className="w-full text-lg py-3" size="lg">
                <RotateCcw className="mr-2 h-5 w-5" /> {t('pomodoro.button.giveUp')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {isSettingsCardVisible && sessionState?.status === 'idle' && (
        <Card className="w-full max-w-md shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg flex items-center">
              <Settings2 className="mr-2 h-5 w-5 text-muted-foreground" />
              {t('pomodoro.settings.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Label htmlFor="pomodoroDuration">{t('pomodoro.settings.durationLabel')}</Label>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                id="pomodoroDuration"
                value={durationInput === 0 ? '' : durationInput}
                onChange={handleDurationInputChange}
                onBlur={handleDurationSettingsSave} // Save on blur or add explicit save button
                placeholder={t('pomodoro.settings.durationPlaceholder')}
                className="text-base"
                min="1"
                max="120"
                disabled={timerIsActive}
              />
              <Button onClick={handleResetSettings} variant="outline" size="icon" title={t('pomodoro.button.reset')} disabled={timerIsActive}>
                <Eraser className="h-5 w-5"/>
              </Button>
            </div>
             {durationInput <=0 || durationInput > 120 && <p className="text-sm text-destructive">{t('pomodoro.settings.durationError')}</p>}
          </CardContent>
        </Card>
      )}
      
      <Sheet open={isNotesSheetOpen} onOpenChange={(open) => {
          if (!open) handleNotesSheetClose();
          else setIsNotesSheetOpen(true);
      }}>
        <SheetTrigger asChild>
            <Button 
                variant="outline" 
                className={cn(
                    "fixed bottom-6 right-6 z-50 rounded-full h-14 w-14 p-0 shadow-lg transition-all",
                    localNotes.length > 0 ? "bg-accent text-accent-foreground hover:bg-accent/90 border-primary/30" : "bg-background/80 hover:bg-muted backdrop-blur-sm"
                )}
                title={localNotes.length > 0 ? t('pomodoro.notes.button.openWithNotes') : t('pomodoro.notes.button.open')}
            >
            {localNotes.length > 0 ? <NotebookText className="h-6 w-6" /> : <NotebookPen className="h-6 w-6" />}
            </Button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[75vh] flex flex-col">
          <SheetHeader>
            <SheetTitle>{t('pomodoro.notes.sheet.title')}</SheetTitle>
            <SheetDescription>
              {t('pomodoro.notes.sheet.description')}
            </SheetDescription>
          </SheetHeader>
          <Textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder={t('pomodoro.notes.sheet.placeholder')}
              className="flex-grow min-h-[150px] text-base my-4" 
          />
          <SheetFooter>
            <SheetClose asChild>
              <Button type="button" className="w-full sm:w-auto">{t('pomodoro.notes.sheet.button.done')}</Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>

    </div>
  );
}
