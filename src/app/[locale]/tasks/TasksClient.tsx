
"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Loader2, Info, ShieldAlert, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Task, TimeInfo, TaskStatus, RepeatFrequency, ReminderType } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import TaskForm, { type TaskFormData } from '@/components/TaskForm';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid, isSameYear, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils';

export default function TasksClient() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, isLoadingTasks, isLoading: contextOverallLoading, isSeeding, getTaskById, updateTask: updateTaskInContext, addTask: addTaskInContext } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter();

  const pomodoroContext = usePomodoro();

  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false);

  const defaultNewTaskData = useMemo(() => ({
    title: '',
    description: '',
    repeat: 'none' as RepeatFrequency,
    timeInfo: { type: 'no_time' as 'no_time', startDate: null, endDate: null, time: null },
    artifactLink: { flashcardId: null as string | null },
    reminderInfo: { type: 'none' as ReminderType },
  }), []);


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

  const handleToggleTaskCompletion = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTaskInContext(task.id, { status: newStatus });
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
    }
  };

  const formatTimeLabel = useCallback((timeInfo?: TimeInfo): string => {
    if (!timeInfo || timeInfo.type === 'no_time' || !timeInfo.startDate) {
      return '';
    }

    const todayForComparison = startOfDay(new Date());

    let parsedStartDate: Date;
    try {
      // Ensure time part is ignored for day-level comparisons by using startOfDay
      parsedStartDate = startOfDay(parseISO(timeInfo.startDate));
      if (!isValid(parsedStartDate)) return '';
    } catch (e) {
      return ''; // Invalid date string
    }

    let parsedEndDate: Date | null = null;
    if (timeInfo.endDate) {
      try {
        parsedEndDate = startOfDay(parseISO(timeInfo.endDate));
        if (!isValid(parsedEndDate)) parsedEndDate = null;
      } catch (e) {
        parsedEndDate = null;
      }
    }

    const formatDateDisplay = (date: Date): string => {
      if (isSameYear(date, todayForComparison)) {
        return format(date, 'MM/dd');
      }
      return format(date, 'yyyy/MM/dd');
    };

    // Part 1: Determine the primary label for the start date
    let primaryStartLabel = '';
    if (isToday(parsedStartDate)) {
      primaryStartLabel = t('task.display.today');
    } else if (isTomorrow(parsedStartDate)) {
      primaryStartLabel = t('task.display.tomorrowShort');
    } else if (parsedStartDate < todayForComparison) {
      primaryStartLabel = formatDateDisplay(parsedStartDate);
    } else { // Start date is in the future (and not tomorrow)
      const daysToStart = differenceInCalendarDays(parsedStartDate, todayForComparison);
      primaryStartLabel = `${formatDateDisplay(parsedStartDate)} (${t('task.display.inXDays', { count: daysToStart })})`;
    }

    // Part 2: Handle date ranges and single dates
    if (timeInfo.type === 'date_range' && parsedEndDate && parsedEndDate >= parsedStartDate) {
      if (isToday(parsedStartDate)) {
        const durationDays = differenceInCalendarDays(parsedEndDate, parsedStartDate);
        return `${primaryStartLabel}(${t('task.display.inXDays', { count: durationDays })})`;
      } else {
        // If start date is not today (future or past), the label focuses only on the start date's relation to today.
        return primaryStartLabel;
      }
    } else if (timeInfo.type === 'datetime' || timeInfo.type === 'all_day') {
      // Single date task
      if (parsedStartDate < todayForComparison && (!parsedEndDate || parsedEndDate < todayForComparison)) { // Check if overdue
        return `${primaryStartLabel} (${t('task.display.overdue')})`;
      }
      // If start date is today, tomorrow, or future (not overdue), primaryStartLabel is already correct.
      return primaryStartLabel;
    }
    
    // Fallback if type is not explicitly handled after 'date_range', 'datetime', 'all_day'
    // or if it's a date_range with invalid/missing endDate.
    // This primarily covers cases where only startDate is relevant or where range is invalid.
    if (parsedStartDate < todayForComparison) {
       return `${primaryStartLabel} (${t('task.display.overdue')})`;
    }
    return primaryStartLabel;

  }, [t]);

  const handleStartPomodoroForTask = (taskTitle: string) => {
    if (!user) { 
        toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
        return;
    }
    const pomodoroState = pomodoroContext.sessionState;
    const startFn = pomodoroContext.startPomodoro;
    
    const duration = pomodoroState?.userPreferredDurationMinutes || 25;

    startFn(duration, taskTitle);
    toast({ title: t('pomodoro.button.start'), description: t('task.pomodoroStartedFor', { title: taskTitle }) });
    router.push(`/${currentLocale}/`);
  };

  const effectiveLoading = authLoading || isLoadingTasks || (contextOverallLoading && user) || (isSeeding && user);

  if (authLoading) { 
    return (
      <div className="flex justify-center items-center mt-8 h-[calc(100vh-var(--header-height,8rem)-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) { 
    return (
       <Alert variant="destructive" className="mt-8 max-w-md mx-auto">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
        </Alert>
    );
  }
  
  if (effectiveLoading && user) {
     return (
      <div className="flex justify-center items-center mt-8 h-[calc(100vh-var(--header-height,8rem)-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('tasks.list.loading')}</p>
      </div>
    );
  }

  const showEditPanel = selectedTaskId !== null || isCreatingNewTask;
  
  const sortedTasks = [...tasks].sort((a, b) => {
    if (a.status === 'completed' && b.status !== 'completed') return 1;
    if (a.status !== 'completed' && b.status === 'completed') return -1;
    
    const aDate = a.timeInfo?.startDate && isValid(parseISO(a.timeInfo.startDate)) ? parseISO(a.timeInfo.startDate) : null;
    const bDate = b.timeInfo?.startDate && isValid(parseISO(b.timeInfo.startDate)) ? parseISO(b.timeInfo.startDate) : null;

    if (aDate && bDate) {
        if (aDate < bDate) return -1;
        if (aDate > bDate) return 1;
    } else if (aDate) { 
        return -1; 
    } else if (bDate) { 
        return 1;
    }
    return (b.createdAt && a.createdAt) ? (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : 0;
  });

  const handleMainFormSubmit = async (data: TaskFormData) => {
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
  };

  const handleIntermediateFormSave = async (updates: Partial<TaskFormData>): Promise<boolean> => {
    if (selectedTask?.id) {
        try {
            await updateTaskInContext(selectedTask.id, updates);
            return true;
        } catch (error) {
            console.error("Intermediate save failed:", error);
            return false;
        }
    }
    return false;
  };


  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem)-4rem)]"> 
      <div className={cn("transition-all duration-300 ease-in-out overflow-y-auto flex flex-col", showEditPanel ? "w-1/2 pr-2" : "w-full pr-0")}>
        <div className={cn("flex justify-between items-center mb-6", showEditPanel ? "px-2" : "px-4")}>
          <h1 className="text-2xl font-semibold tracking-tight">{t('tasks.title')}</h1>
          <Button onClick={handleCreateNewTask} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.button.create')}
          </Button>
        </div>

        {sortedTasks.length === 0 && !effectiveLoading && (
          <Alert className={cn("mt-8 border-primary/50 text-primary bg-primary/5", showEditPanel ? "mx-2" : "mx-4")}>
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">{t('tasks.list.empty.title')}</AlertTitle>
            <AlertDescription>
              {t('tasks.list.empty.description')}
            </AlertDescription>
          </Alert>
        )}

        <ul className={cn("space-y-1 flex-grow", showEditPanel ? "px-2" : "px-4")}>
          {sortedTasks.map((task) => (
            <li key={task.id}
                className={cn(
                    "group flex items-center justify-between p-3 rounded-md hover:bg-muted",
                    selectedTaskId === task.id && "bg-muted shadow-md"
                )}
            >
              <div className="flex items-center flex-grow min-w-0 mr-4">
                 <Checkbox
                    id={`task-${task.id}`}
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => {
                        event?.stopPropagation(); 
                        handleToggleTaskCompletion(task);
                    }}
                    className="mr-3 flex-shrink-0"
                    aria-label={t('task.item.toggleCompletionAria', {title: task.title})}
                  />
                <div className="min-w-0 cursor-pointer flex-grow" onClick={() => handleEditTask(task.id)}>
                  <p className={cn(
                      "text-base font-medium truncate",
                      task.status === 'completed' && "line-through text-muted-foreground"
                    )} title={task.title}>
                    {task.title}
                  </p>
                  {task.description && (
                    <p className={cn(
                        "text-xs text-muted-foreground truncate",
                        task.status === 'completed' && "line-through"
                      )} title={task.description}>
                      {task.description}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center flex-shrink-0 ml-auto">
                <span className="text-xs text-muted-foreground mr-2 cursor-pointer" onClick={() => handleEditTask(task.id)}>
                    {formatTimeLabel(task.timeInfo)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity h-8 w-8 flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); handleStartPomodoroForTask(task.title); }}
                  title={t('task.item.startPomodoro')}
                >
                  <PlayCircle className="h-5 w-5 text-primary" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {showEditPanel && (
        <div className="w-1/2 border-l pl-4 py-4 overflow-y-auto">
           <TaskForm
            key={selectedTaskId || 'new-task'}
            mode={isCreatingNewTask ? 'create' : 'edit'}
            initialData={isCreatingNewTask ? defaultNewTaskData : selectedTask}
            onSubmit={handleMainFormSubmit}
            isLoading={isSubmittingForm}
            onCancel={handleCancelEdit}
            onIntermediateSave={handleIntermediateFormSave}
          />
        </div>
      )}
    </div>
  );
}
    
