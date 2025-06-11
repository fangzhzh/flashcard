
"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Import useRouter
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PlusCircle, Loader2, Info, ShieldAlert, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Task, TimeInfo } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import TaskForm from '@/components/TaskForm';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { usePomodoroLocal } from '@/contexts/PomodoroLocalContext';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TasksClient() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, deleteTask, isLoadingTasks, isLoading: contextOverallLoading, isSeeding, getTaskById, updateTask: updateTaskInContext, addTask: addTaskInContext } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter(); // Initialize useRouter

  const pomodoroContext = usePomodoro();
  const pomodoroLocalContext = usePomodoroLocal();

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
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

  const formatTimeLabel = useCallback((timeInfo: TimeInfo): string => {
    if (!timeInfo || timeInfo.type === 'no_time' || !timeInfo.startDate || !isValid(parseISO(timeInfo.startDate))) {
      return '';
    }

    const startDate = parseISO(timeInfo.startDate);

    if (timeInfo.type === 'datetime') {
      if (isToday(startDate) && timeInfo.time) return timeInfo.time;
      if (isToday(startDate)) return t('task.display.today');
      if (isTomorrow(startDate)) return t('task.display.tomorrow');
      return timeInfo.time ? `${format(startDate, 'MMM d')} ${t('task.display.at')} ${timeInfo.time}` : format(startDate, 'MMM d');
    }

    if (timeInfo.type === 'all_day') {
      if (isToday(startDate)) return t('task.display.today');
      if (isTomorrow(startDate)) return t('task.display.tomorrow');
      return format(startDate, 'MMM d');
    }

    if (timeInfo.type === 'date_range') {
      const daysUntilStart = differenceInCalendarDays(startDate, new Date());
      if (daysUntilStart < 0) { // Started in the past
          if (timeInfo.endDate && isValid(parseISO(timeInfo.endDate))) {
              const endDate = parseISO(timeInfo.endDate);
              if (isToday(endDate)) return `${t('task.display.ends')} ${t('task.display.today').toLowerCase()}`;
              if (isTomorrow(endDate)) return `${t('task.display.ends')} ${t('task.display.tomorrow').toLowerCase()}`;
              const daysUntilEnd = differenceInCalendarDays(endDate, new Date());
              if (daysUntilEnd < 0) return t('task.display.overdue');
              return t('task.display.endsInXDays', { count: daysUntilEnd + 1 });
          }
          return t('task.display.started');
      }
      if (daysUntilStart === 0) return t('task.display.startsToday');
      return `${format(startDate, 'MMM d')} (${t('task.display.inXDays', { count: daysUntilStart })})`;
    }
    return '';
  }, [t]);

  const handleStartPomodoroForTask = (taskTitle: string) => {
    const pomodoroState = user ? pomodoroContext.sessionState : pomodoroLocalContext.sessionState;
    const startFn = user ? pomodoroContext.startPomodoro : pomodoroLocalContext.startPomodoro;
    
    const duration = pomodoroState?.userPreferredDurationMinutes || 25;

    startFn(duration, taskTitle);
    toast({ title: t('pomodoro.button.start'), description: t('task.pomodoroStartedFor', { title: taskTitle }) });
    router.push(`/${currentLocale}/`);
  };

  const effectiveLoading = authLoading || isLoadingTasks || (contextOverallLoading && user) || (isSeeding && user);

  if (effectiveLoading) {
    return (
      <div className="flex justify-center items-center mt-8 h-[calc(100vh-var(--header-height,8rem)-4rem)]">
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
  const sortedTasks = [...tasks].sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));


  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem)-4rem)]"> {/* Adjust header height var if needed and remove page padding */}
      <div className={cn("transition-all duration-300 ease-in-out overflow-y-auto py-4", showEditPanel ? "w-1/2 pr-2" : "w-full pr-4")}>
        <div className="flex justify-between items-center mb-6 px-2">
          <h1 className="text-2xl font-semibold tracking-tight">{t('tasks.title')}</h1>
          <Button onClick={handleCreateNewTask} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.button.create')}
          </Button>
        </div>

        {sortedTasks.length === 0 && !effectiveLoading && (
          <Alert className="mt-8 mx-2 border-primary/50 text-primary bg-primary/5">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">{t('tasks.list.empty.title')}</AlertTitle>
            <AlertDescription>
              {t('tasks.list.empty.description')}
            </AlertDescription>
          </Alert>
        )}

        <ul className="space-y-1 px-2">
          {sortedTasks.map((task) => (
            <li key={task.id}
                className={cn(
                    "group flex items-center justify-between p-3 rounded-md hover:bg-muted",
                    selectedTaskId === task.id && "bg-muted shadow-md"
                )}
            >
              <div className="flex-grow min-w-0 cursor-pointer" onClick={() => handleEditTask(task.id)}>
                <p className="text-base font-medium whitespace-normal break-words" title={task.title}>{task.title}</p>
                {task.timeInfo && task.timeInfo.type !== 'no_time' && task.timeInfo.startDate && (
                  <span className="text-xs text-muted-foreground">{formatTimeLabel(task.timeInfo)}</span>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="ml-2 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-8 w-8 flex-shrink-0"
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
            key={selectedTaskId || 'new-task'}
            mode={isCreatingNewTask ? 'create' : 'edit'}
            initialData={isCreatingNewTask ? { title: '', status: 'pending', repeat: 'none', timeInfo: {type: 'no_time'}, artifactLink: {type: 'none'}, reminderInfo: {type: 'none'}} : selectedTask}
            onSubmit={async (data) => {
              setIsSubmittingForm(true);
              try {
                if (isCreatingNewTask) {
                  await addTaskInContext(data); 
                  toast({ title: t('success'), description: t('toast.task.created') });
                  setIsCreatingNewTask(false); 
                } else if (selectedTask) {
                  await updateTaskInContext(selectedTask.id, data);
                  toast({ title: t('success'), description: t('toast.task.updated') });
                }
                setSelectedTaskId(null); 
              } catch (error) {
                toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
              } finally {
                setIsSubmittingForm(false);
              }
            }}
            isLoading={isSubmittingForm}
            onCancel={handleCancelEdit}
          />
        </div>
      )}
    </div>
  );
}
