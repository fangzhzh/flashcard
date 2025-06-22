
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, Settings2, Eraser, Coffee, SkipForward } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { usePomodoroLocal } from '@/contexts/PomodoroLocalContext';
import { cn } from '@/lib/utils';
import BreakOptionsDialog from '@/components/BreakOptionsDialog';

const DEFAULT_POMODORO_MINUTES_DISPLAY = 25;
const DEFAULT_REST_MINUTES_DISPLAY = 5;

export default function PomodoroLocalClient() {
  const t = useI18n();
  const currentLocale = useCurrentLocale(); 
  const {
    sessionState,
    timeLeftSeconds,
    startPomodoro,
    pausePomodoro,
    continuePomodoro,
    giveUpPomodoro,
    updateUserPreferredDuration,
    updateUserPreferredRestDuration, // Added
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
  const [restDurationInput, setRestDurationInput] = useState(
    sessionState?.userPreferredRestDurationMinutes ?? DEFAULT_REST_MINUTES_DISPLAY
  );

  useEffect(() => {
    setDurationInput(
      sessionState.userPreferredDurationMinutes && sessionState.userPreferredDurationMinutes > 0
        ? sessionState.userPreferredDurationMinutes
        : DEFAULT_POMODORO_MINUTES_DISPLAY
    );
    setRestDurationInput( // Set rest duration input
      sessionState.userPreferredRestDurationMinutes && sessionState.userPreferredRestDurationMinutes > 0
        ? sessionState.userPreferredRestDurationMinutes
        : DEFAULT_REST_MINUTES_DISPLAY
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

  const handleRestDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDuration = parseInt(e.target.value, 10);
    if (!isNaN(newDuration) && newDuration > 0 && newDuration <= 60) {
      setRestDurationInput(newDuration);
    } else if (e.target.value === '') {
      setRestDurationInput(0);
    }
  };

  const handlePomodoroDurationSettingsSave = () => {
     if (durationInput > 0 && durationInput <= 120) {
        updateUserPreferredDuration(durationInput);
     }
  };

  const handleRestDurationSettingsSave = () => {
    if (restDurationInput > 0 && restDurationInput <= 60) {
       updateUserPreferredRestDuration(restDurationInput);
    }
 };

  const handleResetPomodoroSettings = () => {
    const defaultDuration = DEFAULT_POMODORO_MINUTES_DISPLAY;
    setDurationInput(defaultDuration);
    updateUserPreferredDuration(defaultDuration);
  };

  const handleResetRestSettings = () => {
    const defaultDuration = DEFAULT_REST_MINUTES_DISPLAY;
    setRestDurationInput(defaultDuration);
    updateUserPreferredRestDuration(defaultDuration);
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
  const preferredRestDuration = sessionState.userPreferredRestDurationMinutes ?? DEFAULT_REST_MINUTES_DISPLAY;


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
            <CardContent className="space-y-4"> {/* Increased space-y */}
              <div>
                <Label htmlFor="pomodoroDuration">{t('pomodoro.settings.durationLabel')}</Label>
                <div className="flex items-stretch gap-2 mt-1">
                  <Input
                    type="number"
                    id="pomodoroDuration"
                    value={durationInput === 0 ? '' : durationInput}
                    onChange={handleDurationInputChange}
                    onBlur={handlePomodoroDurationSettingsSave}
                    placeholder={t('pomodoro.settings.durationPlaceholder')}
                    className="text-base flex-grow"
                    min="1"
                    max="120"
                    disabled={timerIsActive || isResting}
                  />
                  <Button onClick={handleResetPomodoroSettings} variant="outline" size="icon" title={t('pomodoro.button.reset')} disabled={timerIsActive || isResting} className="h-auto">
                    <Eraser className="h-5 w-5"/>
                  </Button>
                </div>
                {durationInput <=0 || durationInput > 120 && <p className="text-sm text-destructive mt-1">{t('pomodoro.settings.durationError')}</p>}
              </div>

              <div>
                <Label htmlFor="restDuration">{t('pomodoro.settings.restDurationLabel')}</Label>
                <div className="flex items-stretch gap-2 mt-1">
                  <Input
                    type="number"
                    id="restDuration"
                    value={restDurationInput === 0 ? '' : restDurationInput}
                    onChange={handleRestDurationInputChange}
                    onBlur={handleRestDurationSettingsSave}
                    placeholder={t('pomodoro.settings.restDurationPlaceholder')}
                    className="text-base flex-grow"
                    min="1"
                    max="60" 
                    disabled={timerIsActive || isResting}
                  />
                  <Button onClick={handleResetRestSettings} variant="outline" size="icon" title={t('pomodoro.button.reset')} disabled={timerIsActive || isResting} className="h-auto">
                    <Eraser className="h-5 w-5"/>
                  </Button>
                </div>
                {restDurationInput <=0 || restDurationInput > 60 && <p className="text-sm text-destructive mt-1">{t('pomodoro.settings.restDurationError')}</p>}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      <BreakOptionsDialog
        isOpen={isBreakDialogOpen}
        onClose={() => setIsBreakDialogOpen(false)}
        onStartRest={handleStartRestPeriod}
        restDuration={preferredRestDuration}
      />
    </>
  );
}
