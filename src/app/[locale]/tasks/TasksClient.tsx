
"use client";
import React, { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Info, ShieldAlert, PlayCircle, Edit } from 'lucide-react'; // Removed ListChecks, CalendarDays, LinkIcon, Repeat, Tag. Added PlayCircle, Edit
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Task, TimeInfo } from '@/types'; // Removed TaskStatus, RepeatFrequency, ArtifactLink as they are part of Task
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import TaskForm, { type TaskFormData } from '@/components/TaskForm';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { usePomodoroLocal } from '@/contexts/PomodoroLocalContext';
import { Separator } from '@/components/ui/separator';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TasksClient() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, deleteTask, isLoadingTasks, isLoading: contextOverallLoading, isSeeding, getTaskById, updateTask } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();

  const pomodoroContext = usePomodoro();
  const pomodoroLocalContext = usePomodoroLocal();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false);

  const handleEditTask = (taskId: string) => {
    setIsCreatingNewTask(false);
    setSelectedTaskId(taskId);
  };

  const handleCreateNewTask = () => {
    setSelectedTaskId(null);
    setIsCreatingNewTask(true);
  };

  const handleCancelEdit = () => {
    setSelectedTaskId(null);
    setIsCreatingNewTask(false);
  };

  const selectedTask = useMemo(() => {
    if (selectedTaskId) {
      return getTaskById(selectedTaskId);
    }
    return undefined;
  }, [selectedTaskId, getTaskById]);


  const formatTimeLabel = (timeInfo: TimeInfo): string => {
    if (!timeInfo || timeInfo.type === 'no_time' || !timeInfo.startDate || !isValid(parseISO(timeInfo.startDate))) {
      return ''; // No specific time or invalid date
    }

    const startDate = parseISO(timeInfo.startDate);

    if (timeInfo.type === 'datetime' || timeInfo.type === 'all_day') {
      if (isToday(startDate)) {
        return timeInfo.type === 'datetime' && timeInfo.time ? timeInfo.time : t('task.display.today');
      }
      if (isTomorrow(startDate)) {
        return t('task.display.tomorrow');
      }
      return format(startDate, 'MMM d');
    }

    if (timeInfo.type === 'date_range') {
      const daysUntilStart = differenceInCalendarDays(startDate, new Date());
      if (daysUntilStart < 0) { // Started in the past
          if (timeInfo.endDate && isValid(parseISO(timeInfo.endDate))) {
              const endDate = parseISO(timeInfo.endDate);
              if (isToday(endDate)) return `${t('task.display.ends')} ${t('task.display.today')}`;
              if (isTomorrow(endDate)) return `${t('task.display.ends')} ${t('task.display.tomorrow')}`;
              const daysUntilEnd = differenceInCalendarDays(endDate, new Date());
              if (daysUntilEnd < 0) return t('task.display.overdue'); // Ended in the past
              return `${t('task.display.endsInXDays', { count: daysUntilEnd + 1 })}`;
          }
          return t('task.display.started'); // No end date or invalid end date, but started
      }
      if (daysUntilStart === 0) return t('task.display.startsToday');
      return `${format(startDate, 'MMM d')} (${t('task.display.inXDays', { count: daysUntilStart })})`;
    }
    return '';
  };

  const handleStartPomodoroForTask = (taskTitle: string) => {
    console.log(`Attempting to start Pomodoro for task: "${taskTitle}"`);
    // Actual Pomodoro start logic will be integrated with PomodoroContext/PomodoroLocalContext
    // This might involve setting a 'currentTaskTitle' in the Pomodoro state.
    // For now, we just log.
    const duration = user ? pomodoroContext.sessionState?.userPreferredDurationMinutes : pomodoroLocalContext.sessionState.userPreferredDurationMinutes;
    const startFn = user ? pomodoroContext.startPomodoro : pomodoroLocalContext.startPomodoro;

    if (duration) {
      startFn(duration, taskTitle); // Pass taskTitle to the start function
      toast({ title: t('pomodoro.button.start'), description: t('task.pomodoroStartedFor', { title: taskTitle }) });
      // Potentially navigate to Pomodoro page or show floating timer more prominently
      router.push(`/${currentLocale}/`);
    } else {
      toast({ title: t('error'), description: t('pomodoro.settings.durationError'), variant: 'destructive' });
    }
  };
  const router = useRouter();


  const effectiveLoading = authLoading || isLoadingTasks || (contextOverallLoading && user) || (isSeeding && user);

  if (effectiveLoading) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('tasks.list.loading')}</p>
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
       <Alert variant="destructive" className="mt-8 max-w-md mx-auto">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
        </Alert>
    );
  }

  const showEditPanel = selectedTaskId !== null || isCreatingNewTask;

  return (
    <div className="flex h-[calc(100vh-var(--header-height,8rem))]"> {/* Adjust header height var if needed */}
      <div className={cn("transition-all duration-300 ease-in-out py-4 pr-4 overflow-y-auto", showEditPanel ? "w-1/2" : "w-full")}>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">{t('tasks.title')}</h1>
          <Button onClick={handleCreateNewTask} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.button.create')}
          </Button>
        </div>

        {tasks.length === 0 && !effectiveLoading && (
          <Alert className="mt-8 border-primary/50 text-primary bg-primary/5">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">{t('tasks.list.empty.title')}</AlertTitle>
            <AlertDescription>
              {t('tasks.list.empty.description')}
            </AlertDescription>
          </Alert>
        )}

        <ul className="space-y-1">
          {tasks.map((task) => (
            <li key={task.id}
                className={cn(
                    "group flex items-center justify-between p-3 rounded-md hover:bg-muted cursor-pointer",
                    selectedTaskId === task.id && "bg-muted"
                )}
            >
              <div className="flex-grow min-w-0" onClick={() => handleEditTask(task.id)}>
                <p className="text-base font-medium truncate" title={task.title}>{task.title}</p>
                {task.timeInfo && task.timeInfo.type !== 'no_time' && task.timeInfo.startDate && (
                  <span className="text-xs text-muted-foreground">{formatTimeLabel(task.timeInfo)}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-8 w-8"
                onClick={(e) => { e.stopPropagation(); handleStartPomodoroForTask(task.title); }}
                title={t('task.item.startPomodoro')}
              >
                <PlayCircle className="h-5 w-5 text-primary" />
              </Button>
            </li>
          ))}
        </ul>
      </div>

      {showEditPanel && (
        <div className="w-1/2 border-l pl-4 py-4 overflow-y-auto">
           <TaskForm
            key={selectedTaskId || 'new-task'} // Re-mount form when task changes
            mode={isCreatingNewTask ? 'create' : 'edit'}
            initialData={isCreatingNewTask ? { status: 'pending', repeat: 'none', timeInfo: {type: 'no_time'}, artifactLink: {type: 'none'}, reminderInfo: {type: 'none'}} : selectedTask}
            onSubmit={async (data) => {
              setIsSubmitting(true);
              try {
                if (isCreatingNewTask) {
                  await useFlashcards().addTask(data); // Directly call from hook
                  toast({ title: t('success'), description: t('toast.task.created') });
                  setIsCreatingNewTask(false);
                } else if (selectedTask) {
                  await updateTask(selectedTask.id, data);
                  toast({ title: t('success'), description: t('toast.task.updated') });
                }
                setSelectedTaskId(null); // Close panel after save
              } catch (error) {
                toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
              } finally {
                setIsSubmitting(false);
              }
            }}
            isLoading={isSubmitting}
            onCancel={handleCancelEdit}
          />
        </div>
      )}
    </div>
  );
}
