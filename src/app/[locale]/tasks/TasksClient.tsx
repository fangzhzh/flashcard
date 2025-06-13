
"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, Loader2, Info, ShieldAlert, PlayCircle, Zap, AlertTriangle, CalendarRange, Hourglass } from 'lucide-react'; // Added Hourglass
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Task, TimeInfo, TaskStatus, RepeatFrequency, ReminderType } from '@/types';
import type { default as enLocale } from '@/lib/i18n/locales/en';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import TaskForm, { type TaskFormData } from '@/components/TaskForm';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid, isSameYear, startOfDay, addDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TaskDurationPie from '@/components/TaskDurationPie';

type TranslationKeys = keyof typeof enLocale;

interface FormattedTimeInfo {
  visibleLabel: string;
  tooltipLabel: string;
  timeStatus: 'upcoming' | 'active' | 'overdue' | 'none';
}

export default function TasksClient() {
  const { user, loading: authLoading } = useAuth();
  const { 
    tasks, 
    isLoadingTasks, 
    isLoading: contextOverallLoading, 
    isSeeding, 
    getTaskById, 
    updateTask: updateTaskInContext, 
    addTask: addTaskInContext,
    deleteTask: deleteTaskInContext
  } = useFlashcards();
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

  const formatTimeLabel = useCallback((timeInfo?: TimeInfo): FormattedTimeInfo => {
    const defaultReturn: FormattedTimeInfo = { visibleLabel: '', tooltipLabel: t('task.display.noTime'), timeStatus: 'none' };
    if (!timeInfo || !timeInfo.startDate) {
      return defaultReturn;
    }

    const todayForComparison = startOfDay(new Date());
    let parsedStartDate: Date;
    try {
      parsedStartDate = startOfDay(parseISO(timeInfo.startDate));
      if (!isValid(parsedStartDate)) return defaultReturn;
    } catch (e) { return defaultReturn; }

    const formatDateDisplay = (date: Date, includeYearIfDifferent = true): string => {
      const yearFormat = (includeYearIfDifferent && !isSameYear(date, todayForComparison)) ? 'yyyy/MM/dd' : 'MM/dd';
      return format(date, yearFormat);
    };
    
    let visibleLabel = '';
    let tooltipLabel = '';
    let timeStatus: FormattedTimeInfo['timeStatus'] = 'none';
    const daysToStart = differenceInCalendarDays(parsedStartDate, todayForComparison);

    // Determine visibleLabel
    if (isToday(parsedStartDate)) {
      visibleLabel = t('task.display.label.today');
    } else if (isTomorrow(parsedStartDate)) {
      visibleLabel = t('task.display.label.tomorrowShort');
    } else {
      visibleLabel = formatDateDisplay(parsedStartDate, false); // Show MM/DD for visible, year in tooltip
    }

    // Determine tooltipLabel and timeStatus
    if (timeInfo.type === 'date_range' && timeInfo.endDate) {
      let parsedEndDate: Date;
      try {
        parsedEndDate = startOfDay(parseISO(timeInfo.endDate));
        if (!isValid(parsedEndDate) || parsedEndDate < parsedStartDate) { 
           tooltipLabel = `${formatDateDisplay(parsedStartDate, true)} (${t('task.display.overdue')})`;
           timeStatus = daysToStart < 0 ? 'overdue' : 'upcoming'; 
        } else {
          const duration = differenceInCalendarDays(parsedEndDate, parsedStartDate) + 1;
          const fullStartDateStr = formatDateDisplay(parsedStartDate, true);
          const fullEndDateStr = formatDateDisplay(parsedEndDate, true);

          if (todayForComparison > parsedEndDate) { 
            tooltipLabel = `${fullStartDateStr} - ${fullEndDateStr} (${t('task.display.ended')})`;
            timeStatus = 'overdue';
          } else if (todayForComparison >= parsedStartDate && todayForComparison <= parsedEndDate) { 
            tooltipLabel = `${fullStartDateStr} - ${fullEndDateStr} (${t('task.display.durationDays', { count: duration })})`;
            timeStatus = 'active';
          } else if (todayForComparison < parsedStartDate) { 
             tooltipLabel = `${fullStartDateStr} - ${fullEndDateStr} (${t('task.display.inXDays', { count: daysToStart })})`;
             timeStatus = 'upcoming';
          } else { 
             tooltipLabel = `${fullStartDateStr} - ${fullEndDateStr} (${t('task.display.endsInXDays', {count: differenceInCalendarDays(parsedEndDate, todayForComparison) + 1 })})`;
             timeStatus = 'active';
          }
        }
      } catch (e) { 
          tooltipLabel = `${formatDateDisplay(parsedStartDate, true)} (${t('task.display.overdue')})`;
          timeStatus = 'overdue'; 
      }
    } else if (timeInfo.type === 'datetime' || timeInfo.type === 'all_day' || (timeInfo.type === 'date_range' && !timeInfo.endDate) ) {
      const fullStartDateStr = formatDateDisplay(parsedStartDate, true);
      if (isToday(parsedStartDate)) {
        tooltipLabel = t('task.display.today');
        timeStatus = 'active';
      } else if (daysToStart > 0) {
        tooltipLabel = `${fullStartDateStr} (${t('task.display.inXDays', { count: daysToStart })})`;
        timeStatus = 'upcoming';
      } else { 
        tooltipLabel = `${fullStartDateStr} (${t('task.display.overdue')})`;
        timeStatus = 'overdue';
      }
      if (timeInfo.type === 'datetime' && timeInfo.time) {
        tooltipLabel += ` ${t('task.display.at')} ${timeInfo.time}`;
      }
    } else if (timeInfo.type === 'no_time' && timeInfo.startDate) { 
      tooltipLabel = formatDateDisplay(parsedStartDate, true); 
      if (isToday(parsedStartDate)) timeStatus = 'active';
      else if (daysToStart > 0) timeStatus = 'upcoming';
      else timeStatus = 'overdue';
    } else { 
       tooltipLabel = t('task.display.noTime');
       visibleLabel = ''; 
       timeStatus = 'none';
    }
    
    return { visibleLabel, tooltipLabel, timeStatus };

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

  const handleDeleteTask = async () => {
    if (!selectedTask || !selectedTask.id) return;
    try {
        await deleteTaskInContext(selectedTask.id);
        toast({ title: t('success'), description: t('toast.task.deleted') });
        setSelectedTaskId(null);
        setIsCreatingNewTask(false);
    } catch (error) {
        toast({ title: t('error'), description: t('toast.task.error.delete'), variant: "destructive" });
    }
  };

  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem)-4rem)]"> 
      <div className={cn(
        "transition-all duration-300 ease-in-out overflow-y-auto flex flex-col",
        showEditPanel ? "hidden md:flex md:w-1/2 md:pr-2" : "w-full pr-0"
      )}>
        <div className={cn("flex justify-between items-center mb-6", showEditPanel ? "px-1 md:px-0" : "px-1")}>
          <h1 className="text-2xl font-semibold tracking-tight">{t('tasks.title')}</h1>
          <Button onClick={handleCreateNewTask} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.button.create')}
          </Button>
        </div>

        {sortedTasks.length === 0 && !effectiveLoading && (
          <Alert className={cn("mt-8 border-primary/50 text-primary bg-primary/5", showEditPanel ? "mx-1 md:mx-0" : "mx-1")}>
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">{t('tasks.list.empty.title')}</AlertTitle>
            <AlertDescription>
              {t('tasks.list.empty.description')}
            </AlertDescription>
          </Alert>
        )}

        <ul className={cn("space-y-1 flex-grow", showEditPanel ? "px-1 md:px-0" : "px-1")}>
          {sortedTasks.map((task) => {
            const { visibleLabel, tooltipLabel, timeStatus } = formatTimeLabel(task.timeInfo);
            let statusIcon: React.ReactNode = null;
            let statusIconTooltipContent: React.ReactNode | null = null;
            const todayForComparison = startOfDay(new Date());

            if (task.status !== 'completed') {
                if (timeStatus === 'upcoming' && task.timeInfo?.startDate) {
                    const sDate = parseISO(task.timeInfo.startDate);
                    if (isValid(sDate)) {
                        const daysToStart = differenceInCalendarDays(sDate, todayForComparison);
                        let hourglassColorClass = 'text-muted-foreground'; // Default for > 30 days
                        if (daysToStart >= 0 && daysToStart <= 7) {
                            hourglassColorClass = 'text-green-600';
                        } else if (daysToStart > 7 && daysToStart <= 30) {
                            hourglassColorClass = 'text-green-400';
                        }
                        statusIcon = <Hourglass className={cn('h-4 w-4 mx-1 flex-shrink-0', hourglassColorClass)} />;
                        statusIconTooltipContent = <p>{t('task.display.status.upcoming')}</p>;
                    }
                } else if (timeStatus === 'active' && task.timeInfo?.type === 'date_range' && task.timeInfo.startDate && task.timeInfo.endDate) {
                    const sDate = parseISO(task.timeInfo.startDate);
                    const eDate = parseISO(task.timeInfo.endDate);
                    if (isValid(sDate) && isValid(eDate) && eDate >= sDate) {
                        const totalDaysInRange = differenceInCalendarDays(eDate, sDate) + 1;
                        let daysRemainingIncludingToday = differenceInCalendarDays(eDate, todayForComparison) + 1;
                        let currentRemainingPercentage = 0;
                        if (todayForComparison > eDate) { 
                            currentRemainingPercentage = 0;
                        } else if (todayForComparison < sDate) { 
                            currentRemainingPercentage = 100;
                        } else { 
                           if (totalDaysInRange > 0) {
                             currentRemainingPercentage = (daysRemainingIncludingToday / totalDaysInRange) * 100;
                           }
                        }
                        currentRemainingPercentage = Math.max(0, Math.min(currentRemainingPercentage, 100));
                        
                        statusIcon = <TaskDurationPie remainingPercentage={currentRemainingPercentage} variant="active" size={16} className="mx-1 flex-shrink-0" />;
                        statusIconTooltipContent = <p>{t('task.display.status.activeRange')}</p>;
                    }
                } else if (timeStatus === 'active') { 
                     statusIcon = <Zap className="h-4 w-4 text-green-500 mx-1 flex-shrink-0" />;
                     statusIconTooltipContent = <p>{t('task.display.status.active')}</p>;
                } else if (timeStatus === 'overdue') {
                    statusIcon = <AlertTriangle className="h-4 w-4 text-yellow-500 mx-1 flex-shrink-0" />;
                    statusIconTooltipContent = <p>{t('task.display.status.overdue')}</p>;
                }
            }

            return (
            <TooltipProvider key={task.id}>
              <li
                  className={cn(
                      "group flex items-center justify-between py-2.5 px-1 rounded-md hover:bg-muted",
                      selectedTaskId === task.id && "bg-muted shadow-md"
                  )}
              >
                <div className="flex items-center flex-grow min-w-0 mr-2"> 
                   <Checkbox
                      id={`task-${task.id}`}
                      checked={task.status === 'completed'}
                      onCheckedChange={() => handleToggleTaskCompletion(task)}
                      className="mr-2 flex-shrink-0" 
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
                  {visibleLabel && (
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <span 
                            className="text-xs text-muted-foreground mr-1 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); handleEditTask(task.id);}}
                          >
                            {visibleLabel}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{tooltipLabel}</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  
                  {task.timeInfo?.type === 'date_range' && task.status !== 'completed' && (
                    <CalendarRange className="h-4 w-4 text-muted-foreground mx-1 flex-shrink-0" />
                  )}

                  {statusIcon && statusIconTooltipContent && (
                     <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                            <div>{/* Extra div to satisfy TooltipTrigger asChild with complex icon components */}
                                {statusIcon}
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>{statusIconTooltipContent}</TooltipContent>
                    </Tooltip>
                  )}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleStartPomodoroForTask(task.title); }}
                    title={t('task.item.startPomodoro')}
                    disabled={task.status === 'completed'}
                  >
                    <PlayCircle className="h-5 w-5 text-primary" />
                  </Button>
                </div>
              </li>
            </TooltipProvider>
            );
          })}
        </ul>
      </div>

      {showEditPanel && (
        <div className={cn(
            "w-full md:w-1/2 md:border-l md:pl-4 py-4 overflow-y-auto",
            "flex flex-col" 
          )}>
           <TaskForm
            key={selectedTaskId || 'new-task'}
            mode={isCreatingNewTask ? 'create' : 'edit'}
            initialData={isCreatingNewTask ? defaultNewTaskData : selectedTask}
            onSubmit={handleMainFormSubmit}
            isLoading={isSubmittingForm}
            onCancel={handleCancelEdit}
            onIntermediateSave={selectedTask ? handleIntermediateFormSave : undefined}
            onDelete={selectedTask ? handleDeleteTask : undefined}
          />
        </div>
      )}
    </div>
  );
}
    

    













