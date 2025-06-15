
"use client";

import { useState, useEffect } from 'react';
// Link and ClipboardPlus are no longer needed here
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Settings2, Eraser, Coffee, SkipForward, Save } from 'lucide-react'; // Removed ClipboardPlus, Added Save
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { usePomodoroLocal } from '@/contexts/PomodoroLocalContext';
import { cn } from '@/lib/utils';
import BreakOptionsDialog from '@/components/BreakOptionsDialog';

const DEFAULT_POMODORO_MINUTES_DISPLAY = 25;

export default function PomodoroLocalClient() {
  const t = useI18n();
  const currentLocale = useCurrentLocale(); // currentLocale is not used, but kept for consistency with other client components
  const {
    sessionState,
    timeLeftSeconds,
    startPomodoro,
    pausePomodoro,
    continuePomodoro,
    giveUpPomodoro,
    updateUserPreferredDuration,
    isResting,
    restTimeLeftSeconds,
    skipRest,
    isBreakDialogOpen,
    setIsBreakDialogOpen,
    handleStartRestPeriod,
  } = usePomodoroLocal();

  const [isSettingsCardVisible, setIsSettingsCardVisible] = useState(false);

  const [durationInput, setDurationInput] = useState(
    sessionState?.userPreferredDurationMinutes ?? DEFAULT_POMODORO_MINUTES_DISPLAY
  );

  useEffect(() => {
    setDurationInput(
      sessionState.userPreferredDurationMinutes && sessionState.userPreferredDurationMinutes > 0
        ? sessionState.userPreferredDurationMinutes
        : DEFAULT_POMODORO_MINUTES_DISPLAY
    );
  }, [sessionState]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    const validDuration = durationInput > 0 && durationInput <= 120 ? durationInput : DEFAULT_POMODORO_MINUTES_DISPLAY;
    startPomodoro(validDuration, sessionState?.currentTaskTitle || undefined);
    setIsSettingsCardVisible(false);
  };

  const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(e.target.value, 10);
    if (!isNaN(newDuration) && newDuration > 0 && newDuration <= 120) {
      setDurationInput(newDuration);
    } else if (e.target.value === '') {
      setDurationInput(0);
    }
  };

  const handleDurationSettingsSave = () => {
     if (durationInput > 0 && durationInput <= 120) {
        updateUserPreferredDuration(durationInput);
     }
  };

  const handleResetSettings = () => {
    const defaultDuration = DEFAULT_POMODORO_MINUTES_DISPLAY;
    setDurationInput(defaultDuration);
    updateUserPreferredDuration(defaultDuration);
  };

  const toggleSettingsVisibility = () => {
    if (isResting) return;
    if (sessionState?.status === 'idle') {
      setIsSettingsCardVisible(!isSettingsCardVisible);
    }
  };

  const timerIsActive = sessionState?.status === 'running' || sessionState?.status === 'paused';
  const timerIsIdle = sessionState?.status === 'idle';
  const displayTime = isResting ? restTimeLeftSeconds : timeLeftSeconds;
  const currentTaskTitle = sessionState?.currentTaskTitle;

  return (
    <>
      <div className="flex flex-col items-center space-y-6 relative min-h-[calc(100vh-12rem)] pb-20">
        {currentTaskTitle && (
          <div className="w-full max-w-md text-center p-2 bg-muted rounded-md shadow">
            <p className="text-sm font-medium text-muted-foreground">{t('task.currentTaskLabel')}</p>
            <p className="text-lg font-semibold text-foreground truncate" title={currentTaskTitle}>{currentTaskTitle}</p>
          </div>
        )}
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader
            className={cn(
              "text-center transition-colors duration-300",
              isResting ? "bg-accent text-accent-foreground rounded-t-lg"
                        : (timerIsIdle && !isResting ? "cursor-pointer hover:bg-muted/50 rounded-t-lg"
                                                   : "bg-card text-card-foreground rounded-t-lg")
            )}
            onClick={toggleSettingsVisibility}
            title={timerIsIdle && !isResting ? t('pomodoro.settings.toggleHint') : undefined}
          >
            <CardTitle className={cn(
              "text-6xl font-bold tabular-nums",
              isResting ? "text-accent-foreground" : "text-primary"
            )}>
              {formatTime(displayTime)}
            </CardTitle>
            {isResting && <p className="text-sm font-medium">{t('pomodoro.rest.stateIndicator')}</p>}
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {isResting ? (
              <Button onClick={skipRest} className="w-full text-lg py-3" size="lg" variant="outline">
                <SkipForward className="mr-2 h-5 w-5" /> {t('pomodoro.rest.button.skip')}
              </Button>
            ) : (
              <>
                {timerIsIdle && (
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
              </>
            )}
          </CardContent>
        </Card>

        {isSettingsCardVisible && timerIsIdle && !isResting && (
          <Card className="w-full max-w-md shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Settings2 className="mr-2 h-5 w-5 text-muted-foreground" />
                {t('pomodoro.settings.title')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Label htmlFor="pomodoroDuration">{t('pomodoro.settings.durationLabel')}</Label>
              <div className="flex items-stretch gap-2"> {/* Changed to items-stretch */}
                <Input
                  type="number"
                  id="pomodoroDuration"
                  value={durationInput === 0 ? '' : durationInput}
                  onChange={handleDurationInputChange}
                  placeholder={t('pomodoro.settings.durationPlaceholder')}
                  className="text-base flex-grow" /* Added flex-grow */
                  min="1"
                  max="120"
                  disabled={timerIsActive || isResting}
                />
                <Button 
                  onClick={handleDurationSettingsSave} 
                  variant="outline" 
                  size="default" /* Changed from icon to allow text */
                  title={t('pomodoro.settings.button.saveDuration')}
                  disabled={timerIsActive || isResting || durationInput <= 0 || durationInput > 120 || durationInput === (sessionState?.userPreferredDurationMinutes ?? DEFAULT_POMODORO_MINUTES_DISPLAY)}
                  className="h-auto" /* Ensure button height matches input */
                >
                  <Save className="mr-2 h-4 w-4"/> {/* Icon for save button */}
                  {t('pomodoro.settings.button.saveDuration')}
                </Button>
                <Button onClick={handleResetSettings} variant="outline" size="icon" title={t('pomodoro.button.reset')} disabled={timerIsActive || isResting} className="h-auto"> {/* Ensure button height matches input */}
                  <Eraser className="h-5 w-5"/>
                </Button>
              </div>
              {durationInput <=0 || durationInput > 120 && <p className="text-sm text-destructive">{t('pomodoro.settings.durationError')}</p>}
            </CardContent>
          </Card>
        )}
        {/* Removed the Link and Button for "Create Task" FAB for local client */}
      </div>
      <BreakOptionsDialog
        isOpen={isBreakDialogOpen}
        onClose={() => setIsBreakDialogOpen(false)}
        onStartRest={handleStartRestPeriod}
      />
    </>
  );
}
    
