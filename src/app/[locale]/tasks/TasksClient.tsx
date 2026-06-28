
"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Info, ShieldAlert, PlayCircle, Zap, AlertTriangle, CalendarIcon, Hourglass, ListChecks, Briefcase, User, Coffee, LayoutGrid, X, Save, Link2, RotateCcw, Clock, Bell, Trash2, FilePlus, Search, Edit3, Repeat, ArrowLeft, Stamp, ChevronDown, Brain, Smile, Sparkles, BatteryCharging } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Task, TimeInfo, TaskStatus, RepeatFrequency, ReminderType, TaskType, ArtifactLink, Flashcard as FlashcardType, CheckinInfo } from '@/types';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import TaskForm, { type TaskFormData } from '@/components/TaskForm';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid, isSameYear, startOfDay, addDays, startOfWeek, endOfWeek, areIntervalsOverlapping, endOfDay, isYesterday, addWeeks, addMonths, addYears, nextSaturday, isSunday, isSaturday, formatISO as dateFnsFormatISO, type Locale } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import { zhCN } from 'date-fns/locale/zh-CN';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import TaskDurationPie from '@/components/TaskDurationPie';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { ScrollArea } from '@/components/ui/scroll-area';


type TranslationKeys = keyof typeof import('@/lib/i18n/locales/en').default;

interface FormattedTimeInfo {
  visibleLabel: string;
  tooltipLabel: string;
  timeStatus: 'upcoming' | 'active' | 'overdue' | 'none';
}

type TaskDateFilter = 'all' | 'today' | 'threeDays' | 'thisWeek' | 'twoWeeks';
type EnergyStateFilter = 'all' | 'full' | 'focus' | 'social' | 'recharge';

interface TaskTypeFilterOption {
  value: TaskType | 'all';
  labelKey: TranslationKeys;
  icon: React.ElementType;
  count: number;
}


function calculateNextOccurrence(task: Task): TimeInfo | null {
  if (task.repeat === 'none' || !task.timeInfo.startDate) {
    return null;
  }

  const currentStartDate = parseISO(task.timeInfo.startDate);
  if (!isValid(currentStartDate)) return null;

  let nextStartDate: Date;

  switch (task.repeat) {
    case 'daily':
      nextStartDate = addDays(currentStartDate, 1);
      break;
    case 'weekly':
      nextStartDate = addWeeks(currentStartDate, 1);
      break;
    case 'monthly':
      nextStartDate = addMonths(currentStartDate, 1);
      break;
    case 'annually':
      nextStartDate = addYears(currentStartDate, 1);
      break;
    case 'weekday':
      nextStartDate = addDays(currentStartDate, 1);
      while (isSaturday(nextStartDate) || isSunday(nextStartDate)) {
        nextStartDate = addDays(nextStartDate, 1);
      }
      break;
    case 'weekend':
       nextStartDate = addDays(currentStartDate, 1);
       if (!isSaturday(nextStartDate) && !isSunday(nextStartDate)) {
         nextStartDate = nextSaturday(currentStartDate);
       }
       break;
    default:
      return null;
  }

  let nextEndDate: Date | null = null;
  if (task.timeInfo.endDate && task.timeInfo.type === 'date_range') {
    const currentEndDate = parseISO(task.timeInfo.endDate);
    const duration = differenceInCalendarDays(currentEndDate, currentStartDate);
    if (isValid(currentEndDate) && duration >= 0) {
      nextEndDate = addDays(nextStartDate, duration);
    }
  }

  return {
    ...task.timeInfo,
    startDate: dateFnsFormatISO(nextStartDate, { representation: 'date' }),
    endDate: nextEndDate ? dateFnsFormatISO(nextEndDate, { representation: 'date' }) : null,
  };
}


function TasksClientContent() {
  const { user, loading: authLoading } = useAuth();
  const {
    tasks,
    isLoadingTasks,
    isLoading: contextOverallLoading,
    isSeeding,
    getTaskById,
    updateTask: updateTaskInContext,
    addTask: addTaskInContext,
    deleteTask: deleteTaskInContext,
  } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const dateFnsLocale = currentLocale === 'zh' ? zhCN : enUS;
  const today = startOfDay(new Date());

  const pomodoroContext = usePomodoro();
  const { isMobile, openMobile, toggleMobileSidebar, open: desktopOpen, toggleDesktopSidebar } = useSidebar();


  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false);
  const [activeDateFilter, setActiveDateFilter] = useState<TaskDateFilter>('all');
  const [activeTaskTypeFilter, setActiveTaskTypeFilter] = useState<TaskType | 'all'>('all');
  const [activeEnergyFilter, setActiveEnergyFilter] = useState<EnergyStateFilter>('all');
  const [draggedOverType, setDraggedOverType] = useState<TaskType | null>(null);

  const [taskCounts, setTaskCounts] = useState({ innie: 0, outie: 0, blackout: 0, all: 0 });

  const [isTaskFormDirty, setIsTaskFormDirty] = useState(false);
  const [isConfirmDiscardDialogOpen, setIsConfirmDiscardDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'filter' | 'newTask' | 'editTask', callback: () => void, descriptionKey: TranslationKeys, confirmButtonKey: TranslationKeys } | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState<Record<string, boolean>>({});
  const [isPastAndFutureAccordionOpen, setIsPastAndFutureAccordionOpen] = useState(false);

  const [randomTask, setRandomTask] = useState<Task | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

  useEffect(() => {
    setRandomTask(null);
    setShowAllTasks(false);
  }, [activeEnergyFilter]);


  useEffect(() => {
    if (tasks) {
      const counts = { innie: 0, outie: 0, blackout: 0, all: tasks.filter(task => task.status !== 'completed').length };
      tasks.forEach(task => {
        if (task.status === 'completed') return;
        if (task.type === 'innie') counts.innie++;
        else if (task.type === 'outie') counts.outie++;
        else if (task.type === 'blackout') counts.blackout++;
      });
      setTaskCounts(counts);
    }
  }, [tasks]);


  const defaultNewTaskData = useMemo(() => ({
    title: '',
    description: '',
    type: (activeTaskTypeFilter !== 'all' ? activeTaskTypeFilter : 'innie') as TaskType,
    repeat: 'none' as RepeatFrequency,
    isSilent: false,
    timeInfo: { type: 'no_time' as 'no_time', startDate: null, endDate: null, time: null },
    artifactLink: { flashcardIds: null as string[] | null },
    reminderInfo: { type: 'none' as ReminderType },
    checkinInfo: null,
  }), [activeTaskTypeFilter]);

  const selectedTask = useMemo(() => {
    if (selectedTaskId) {
      return getTaskById(selectedTaskId);
    }
    return undefined;
  }, [selectedTaskId, getTaskById]);

  const formatDateStringForDisplay = useCallback((date: Date, todayDate: Date, locale: Locale, includeYearIfDifferent = true): string => {
    const yearFormat = (includeYearIfDifferent && !isSameYear(date, todayDate)) ? 'yyyy/MM/dd' : 'MM/dd';
    return format(date, yearFormat, { locale });
  }, []);

  const formatTimeLabel = useCallback((timeInfo?: TimeInfo): FormattedTimeInfo => {
    const defaultReturn: FormattedTimeInfo = { visibleLabel: '', tooltipLabel: t('task.display.noTime'), timeStatus: 'none' };
    if (!timeInfo || !timeInfo.startDate) {
      return defaultReturn;
    }

    let parsedStartDate: Date;
    try {
      parsedStartDate = startOfDay(parseISO(timeInfo.startDate));
      if (!isValid(parsedStartDate)) return defaultReturn;
    } catch (e) { return defaultReturn; }


    let visibleLabel = '';
    let tooltipLabel = '';
    let timeStatus: FormattedTimeInfo['timeStatus'] = 'none';
    const daysToStart = differenceInCalendarDays(parsedStartDate, today);

    if (isToday(parsedStartDate)) {
      visibleLabel = t('task.display.label.today');
    } else if (isTomorrow(parsedStartDate)) {
      visibleLabel = t('task.display.label.tomorrowShort');
    } else {
      visibleLabel = formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, false);
    }

    if (timeInfo.type === 'date_range' && timeInfo.endDate) {
      let parsedEndDate: Date;
      try {
        parsedEndDate = startOfDay(parseISO(timeInfo.endDate));
        if (!isValid(parsedEndDate) || parsedEndDate < parsedStartDate) {
           tooltipLabel = `${formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true)} (${t('task.display.overdue')})`;
           timeStatus = daysToStart < 0 ? 'overdue' : 'active';
        } else {
          const duration = differenceInCalendarDays(parsedEndDate, parsedStartDate) + 1;
          const fullStartDateStr = formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true);
          const fullEndDateStr = formatDateStringForDisplay(parsedEndDate, today, dateFnsLocale, true);
          
          const durationTextKey: TranslationKeys = duration === 1 ? 'task.display.totalDurationDay' : 'task.display.totalDurationDaysPlural';
          const durationText = t(durationTextKey, { count: duration });
          tooltipLabel = `${fullStartDateStr} - ${fullEndDateStr} ${durationText}`;


          if (today > parsedEndDate) {
            timeStatus = 'overdue';
          } else if (today >= parsedStartDate && today <= parsedEndDate) {
            timeStatus = 'active';
          } else if (today < parsedStartDate) {
             timeStatus = 'upcoming';
          } else {
             timeStatus = 'active';
          }
        }
      } catch (e) {
          tooltipLabel = `${formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true)} (${t('task.display.overdue')})`;
          timeStatus = 'overdue';
      }
    } else if (timeInfo.type === 'datetime' || timeInfo.type === 'all_day' || (timeInfo.type === 'date_range' && !timeInfo.endDate) ) {
      const fullStartDateStr = formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true);
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
      tooltipLabel = formatDateStringForDisplay(parsedStartDate, today, dateFnsLocale, true);
      if (isToday(parsedStartDate)) timeStatus = 'active';
      else if (daysToStart > 0) timeStatus = 'upcoming';
      else timeStatus = 'overdue';
    } else {
       tooltipLabel = t('task.display.noTime');
       visibleLabel = '';
       timeStatus = 'none';
    }

    return { visibleLabel, tooltipLabel, timeStatus };

  }, [t, dateFnsLocale, formatDateStringForDisplay, today]);

  const filteredAndSortedTasks = useMemo(() => {
    const weekStartsOn = currentLocale === 'zh' ? 1 : 0; 

    let currentTasks = tasks.filter(task => {
        if (task.status === 'completed') return false;

        if (task.isSilent && task.timeInfo?.startDate && isValid(parseISO(task.timeInfo.startDate))) {
          if (startOfDay(parseISO(task.timeInfo.startDate)) > today) {
            return false;
          }
        }
        return true;
    });

    if (activeTaskTypeFilter !== 'all') {
      currentTasks = currentTasks.filter(task => task.type === activeTaskTypeFilter);
    }

    if (activeEnergyFilter !== 'all') {
      currentTasks = currentTasks.filter(task => {
        if (!task.energyDemand) return true; // Default fallback
        const { cognitive, emotional } = task.energyDemand;
        if (activeEnergyFilter === 'full') return cognitive === 'high' && emotional === 'high';
        if (activeEnergyFilter === 'focus') return cognitive === 'high' && emotional === 'low';
        if (activeEnergyFilter === 'social') return cognitive === 'low' && emotional === 'high';
        if (activeEnergyFilter === 'recharge') return cognitive === 'low' && emotional === 'low';
        return true;
      });
    }

    const dateFilterFn = (task: Task): boolean => {
      if (activeDateFilter === 'all') return true;

      const { timeInfo } = task;
      if (!timeInfo?.startDate || !isValid(parseISO(timeInfo.startDate))) {
        return false; 
      }
      
      const taskStartDate = startOfDay(parseISO(timeInfo.startDate));
      const taskEffectiveEndDate = timeInfo.endDate && isValid(parseISO(timeInfo.endDate)) 
                                  ? endOfDay(parseISO(timeInfo.endDate)) 
                                  : endOfDay(taskStartDate);


      let filterIntervalStart = startOfDay(today);
      let filterIntervalEnd = endOfDay(today);

      switch (activeDateFilter) {
        case 'today':
          break;
        case 'threeDays':
          filterIntervalEnd = endOfDay(addDays(today, 2));
          break;
        case 'thisWeek':
          filterIntervalStart = startOfWeek(today, { weekStartsOn });
          filterIntervalEnd = endOfWeek(today, { weekStartsOn }); 
          break;
        case 'twoWeeks': 
          filterIntervalStart = startOfWeek(today, { weekStartsOn });
          filterIntervalEnd = endOfWeek(addDays(today, 7), { weekStartsOn }); 
          break;
        default:
          return true; 
      }
      
      return areIntervalsOverlapping(
        { start: taskStartDate, end: taskEffectiveEndDate },
        {start: filterIntervalStart, end: filterIntervalEnd }
      );
    };

    currentTasks = currentTasks.filter(dateFilterFn);

    return [...currentTasks].sort((a, b) => {
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
  }, [tasks, activeDateFilter, activeTaskTypeFilter, activeEnergyFilter, today, currentLocale]);

  const aiRecommendedTask = useMemo(() => {
    if (filteredAndSortedTasks.length === 0) return null;
    
    // 1. Prioritize tasks that are overdue
    const overdue = filteredAndSortedTasks.find(t => {
      if (!t.timeInfo?.startDate || !isValid(parseISO(t.timeInfo.startDate))) return false;
      return parseISO(t.timeInfo.startDate) < today;
    });
    if (overdue) return overdue;

    // 2. Prioritize tasks with active checkin requirements
    const withCheckins = filteredAndSortedTasks.find(t => t.checkinInfo && t.checkinInfo.currentCheckins < t.checkinInfo.totalCheckinsRequired);
    if (withCheckins) return withCheckins;

    // 3. Otherwise, return the oldest created task (first in list)
    return filteredAndSortedTasks[0];
  }, [filteredAndSortedTasks, today]);
  
  const pastAndFutureTasks = useMemo(() => {
    return tasks.filter(task => {
      const isCompleted = task.status === 'completed';
      const isFutureSilent = task.isSilent && task.timeInfo?.startDate && isValid(parseISO(task.timeInfo.startDate)) && startOfDay(parseISO(task.timeInfo.startDate)) > today;
      return isCompleted || isFutureSilent;
    }).sort((a, b) => {
        const aIsCompleted = a.status === 'completed';
        const bIsCompleted = b.status === 'completed';

        if (!aIsCompleted && bIsCompleted) return -1;
        if (aIsCompleted && !bIsCompleted) return 1;

        if (!aIsCompleted && !bIsCompleted) {
            const aDate = a.timeInfo?.startDate ? parseISO(a.timeInfo.startDate) : new Date(0);
            const bDate = b.timeInfo?.startDate ? parseISO(b.timeInfo.startDate) : new Date(0);
            return aDate.getTime() - bDate.getTime();
        }

        if (aIsCompleted && bIsCompleted) {
            return (new Date(b.updatedAt).getTime()) - (new Date(a.updatedAt).getTime());
        }

        return 0;
    });
  }, [tasks, today]);

  const isLoadingAppData = (authLoading && !user) ||
                           (!authLoading && user && (isLoadingTasks || contextOverallLoading || isSeeding));

  const showSignInPrompt = !authLoading && !user;
  const showEditPanel = selectedTaskId !== null || isCreatingNewTask;

  const proceedWithPendingAction = () => {
    if (pendingAction) {
      pendingAction.callback(); 
      if (pendingAction.type === 'filter') {
        setSelectedTaskId(null);
        setIsCreatingNewTask(false);
      }
      setIsTaskFormDirty(false);
    }
    setIsConfirmDiscardDialogOpen(false);
    setPendingAction(null);
  };


  const handleActionWithDirtyCheck = (
    actionCallback: () => void,
    descriptionKey: TranslationKeys,
    confirmButtonKey: TranslationKeys,
    actionType: 'filter' | 'newTask' | 'editTask'
  ) => {
    if (showEditPanel && isTaskFormDirty) {
      setPendingAction({ type: actionType, callback: actionCallback, descriptionKey, confirmButtonKey });
      setIsConfirmDiscardDialogOpen(true);
    } else {
      actionCallback(); 
      if (actionType === 'filter') {
        setSelectedTaskId(null);
        setIsCreatingNewTask(false);
      }
      setIsTaskFormDirty(false); 
    }
  };

  const handleDateFilterChange = (newFilterValue: TaskDateFilter) => {
    const action = () => setActiveDateFilter(newFilterValue);
    handleActionWithDirtyCheck(action, 'tasks.unsavedChanges.descriptionFilter', 'tasks.unsavedChanges.button.discardAndFilter', 'filter');
  };

  const handleTaskTypeFilterChange = (newFilterValue: TaskType | 'all') => {
    const action = () => {
      setActiveTaskTypeFilter(newFilterValue);
      if (isMobile && openMobile) {
        toggleMobileSidebar();
      }
    };
    handleActionWithDirtyCheck(action, 'tasks.unsavedChanges.descriptionFilter', 'tasks.unsavedChanges.button.discardAndFilter', 'filter');
  };

  const handleEditTask = (taskId: string) => {
    const task = getTaskById(taskId);
    if (!task) return;

    if (selectedTaskId === taskId && !isCreatingNewTask) {
      const action = () => {
        setSelectedTaskId(null);
        setIsCreatingNewTask(false);
      };
      handleActionWithDirtyCheck(action, 'tasks.unsavedChanges.descriptionCancelEdit', 'tasks.unsavedChanges.button.discard', 'editTask');
      return;
    }
    
    if (task.status === 'completed' && selectedTaskId === taskId) {
        return; // Don't close if clicking already open completed task
    }

    const action = () => {
      setIsCreatingNewTask(false);
      setSelectedTaskId(taskId);
    };
    handleActionWithDirtyCheck(action, 'tasks.unsavedChanges.descriptionEditTask', 'tasks.unsavedChanges.button.discardAndEdit', 'editTask');
  };
  
  const handleCreateNewTask = () => {
    const action = () => {
      setSelectedTaskId(null);
      setIsCreatingNewTask(true);
    };
    handleActionWithDirtyCheck(action, 'tasks.unsavedChanges.descriptionNewTask', 'tasks.unsavedChanges.button.discardAndCreate', 'newTask');
  };

  const handleCancelEdit = () => {
    if (isTaskFormDirty) {
        setPendingAction({
            type: 'editTask', 
            callback: () => {
                setSelectedTaskId(null);
                setIsCreatingNewTask(false);
                setIsTaskFormDirty(false);
            },
            descriptionKey: 'tasks.unsavedChanges.descriptionCancelEdit',
            confirmButtonKey: 'tasks.unsavedChanges.button.discard'
        });
        setIsConfirmDiscardDialogOpen(true);
    } else {
        setSelectedTaskId(null);
        setIsCreatingNewTask(false);
    }
  };

  const handleToggleTaskCompletion = async (task: Task) => {
    const isCurrentlyCompleted = task.status === 'completed';
    const newStatus: TaskStatus = isCurrentlyCompleted ? 'pending' : 'completed';

    try {
      const updates: Partial<Task> = { status: newStatus, updatedAt: new Date().toISOString() };
      
      if (newStatus === 'completed' && task.repeat && task.repeat !== 'none') {
        const nextTimeInfo = calculateNextOccurrence(task);
        if (nextTimeInfo) {
          const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...taskFields } = task;
          const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
            ...taskFields,
            timeInfo: nextTimeInfo,
            status: 'pending',
            isSilent: true, 
            checkinInfo: task.checkinInfo ? { ...task.checkinInfo, currentCheckins: 0, history: [] } : null,
          };
          await addTaskInContext(newTaskData);
          toast({ title: t('toast.task.rescheduled.title'), description: t('toast.task.rescheduled.description', { title: task.title }) });
        }
      } else if (newStatus === 'pending' && isCurrentlyCompleted && task.repeat !== 'none') {
        // If an old repeating task is being un-completed, also schedule the next one.
        const nextTimeInfo = calculateNextOccurrence(task);
        if (nextTimeInfo) {
          // Check if a silent successor already exists to avoid duplicates
          const successorExists = tasks.some(
            t => t.isSilent && t.title === task.title && t.timeInfo.startDate === nextTimeInfo.startDate
          );
          if (!successorExists) {
            const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...taskFields } = task;
            const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
              ...taskFields,
              timeInfo: nextTimeInfo,
              status: 'pending',
              isSilent: true,
              checkinInfo: task.checkinInfo ? { ...task.checkinInfo, currentCheckins: 0, history: [] } : null,
            };
            await addTaskInContext(newTaskData);
            toast({ title: t('toast.task.rescheduled.title'), description: t('toast.task.rescheduled.description', { title: task.title }) });
          }
        }
      }
      
      await updateTaskInContext(task.id, updates);
      
      if (newStatus === 'completed') {
        toast({ title: t('success'), description: t('toast.task.completed', { title: task.title }) });
      } else {
         toast({ title: t('success'), description: t('toast.task.restored', { title: task.title }) });
      }
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
    }
  };

  const handleStartPomodoroForTask = (taskTitle: string) => {
    if (!user) {
        toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
        return;
    }
    const { sessionState, startPomodoro, updateCurrentTaskTitle } = pomodoroContext;

    if (sessionState?.status === 'running' || sessionState?.status === 'paused') {
      updateCurrentTaskTitle(taskTitle);
    } else { // Assumes 'idle'
      const duration = sessionState?.userPreferredDurationMinutes || 25;
      startPomodoro(duration, taskTitle);
    }
  };

  const handleMainFormSubmit = async (data: TaskFormData) => {
    setIsSubmittingForm(true);
    try {
      if (isCreatingNewTask) {
        await addTaskInContext(data);
        toast({ title: t('success'), description: t('toast.task.created') });
      } else if (selectedTask) {
        await updateTaskInContext(selectedTask.id, data);
        toast({ title: t('success'), description: t('toast.task.updated') });
      }
      setSelectedTaskId(null); 
      setIsCreatingNewTask(false);
      setIsTaskFormDirty(false); 
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
    } finally {
      setIsSubmittingForm(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask || !selectedTask.id) return;
    try {
        // If it's a repeating task, also delete all pending silent successor instances
        if (selectedTask.repeat && selectedTask.repeat !== 'none') {
          const siblingTasks = tasks.filter(
            t => t.id !== selectedTask.id && t.title === selectedTask.title && t.isSilent && t.status === 'pending'
          );
          await Promise.all(siblingTasks.map(t => deleteTaskInContext(t.id)));
        }
        await deleteTaskInContext(selectedTask.id);
        toast({ title: t('success'), description: t('toast.task.deleted') });
        setSelectedTaskId(null); 
        setIsCreatingNewTask(false);
        setIsTaskFormDirty(false);
    } catch (error) {
        toast({ title: t('error'), description: t('toast.task.error.delete'), variant: "destructive" });
    }
  };

  const taskTypeFilterOptions: TaskTypeFilterOption[] = useMemo(() => [
    { value: 'all', labelKey: 'tasks.filter.allTypes', icon: LayoutGrid, count: taskCounts.all },
    { value: 'innie', labelKey: 'task.type.innie', icon: Briefcase, count: taskCounts.innie },
    { value: 'outie', labelKey: 'task.type.outie', icon: User, count: taskCounts.outie },
    { value: 'blackout', labelKey: 'task.type.blackout', icon: Coffee, count: taskCounts.blackout },
  ], [taskCounts]);

  const handleDragStart = (event: React.DragEvent<HTMLLIElement>, taskId: string) => {
    event.dataTransfer.setData("application/task-id", taskId);
    event.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDragEnterType = (event: React.DragEvent<HTMLButtonElement>, type: TaskType | 'all') => {
    event.preventDefault();
    if (type !== 'all') {
      setDraggedOverType(type as TaskType);
    }
  };

  const handleDragLeaveType = (event: React.DragEvent<HTMLButtonElement>) => {
    event.preventDefault();
    setDraggedOverType(null);
  };

  const handleDropOnType = async (event: React.DragEvent<HTMLButtonElement>, newType: TaskType) => {
    event.preventDefault();
    setDraggedOverType(null);
    const taskId = event.dataTransfer.getData("application/task-id");
    if (taskId) {
      const task = getTaskById(taskId);
      if (task && task.type !== newType) {
        try {
          await updateTaskInContext(taskId, { type: newType });
          toast({ title: t('success'), description: t('toast.task.typeChanged', { type: t(`task.type.${newType}` as any, {}) }) });
        } catch (error) {
          toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
        }
      }
    }
  };
  
  const ActiveFilterIconComponent = useMemo(() => {
    const selectedOption = taskTypeFilterOptions.find(opt => opt.value === activeTaskTypeFilter);
    const IconComponent = selectedOption ? selectedOption.icon : LayoutGrid; 
    return <IconComponent className="h-4 w-4" />;
  }, [activeTaskTypeFilter, taskTypeFilterOptions]);

  const handleCheckIn = async (task: Task) => {
    if (!task.checkinInfo || typeof task.checkinInfo.totalCheckinsRequired !== 'number') return;
    if (task.status === 'completed' || task.checkinInfo.currentCheckins >= task.checkinInfo.totalCheckinsRequired) return;

    setIsCheckingIn(prev => ({ ...prev, [task.id]: true }));

    const newCurrentCheckins = (task.checkinInfo.currentCheckins || 0) + 1;
    const isNowCompleted = newCurrentCheckins >= task.checkinInfo.totalCheckinsRequired;
    const newHistory = [...(task.checkinInfo.history || []), new Date().toISOString()];

    try {
      const updatedCheckinInfo: CheckinInfo = { 
        ...task.checkinInfo, 
        currentCheckins: newCurrentCheckins,
        history: newHistory,
      };
      
      const updates: Partial<Task> = {
        checkinInfo: updatedCheckinInfo,
        updatedAt: new Date().toISOString(),
      };
      
      if (isNowCompleted) {
        updates.status = 'completed';
        
        if (task.repeat && task.repeat !== 'none') {
            const nextTimeInfo = calculateNextOccurrence(task);
            if (nextTimeInfo) {
              const { id: _id, userId: _uid, createdAt: _ca, updatedAt: _ua, ...taskFields } = task;
              const newTaskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'userId'> = {
                ...taskFields,
                timeInfo: nextTimeInfo,
                status: 'pending',
                isSilent: true,
                checkinInfo: task.checkinInfo ? { ...task.checkinInfo, currentCheckins: 0, history: [] } : null,
              };
              await addTaskInContext(newTaskData);
              toast({ title: t('toast.task.rescheduled.title'), description: t('toast.task.rescheduled.description', { title: task.title }) });
            }        }
      }
      
      await updateTaskInContext(task.id, updates);

      if (isNowCompleted) {
        toast({ title: t('success'), description: t('toast.task.checkInCompleted', { title: task.title }) });
      } else {
        toast({
          title: t('success'),
          description: t('toast.task.checkedIn', {
            current: newCurrentCheckins,
            total: task.checkinInfo.totalCheckinsRequired,
          }),
        });
      }

    } catch (error) {
      console.error("Error during check-in:", error);
      toast({ title: t('error'), description: t('toast.task.error.checkInFailed'), variant: "destructive" });
    } finally {
      setIsCheckingIn(prev => ({ ...prev, [task.id]: false }));
    }
  };


  if (showSignInPrompt) {
    return (
       <Alert variant="destructive" className="mt-8 max-w-md mx-auto">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
        </Alert>
    );
  }

  if (isLoadingAppData) {
     return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('tasks.list.loading')}</p>
      </div>
    );
  }

  const renderTaskListItem = (task: Task) => {
    const { visibleLabel, tooltipLabel, timeStatus } = formatTimeLabel(task.timeInfo);
    let statusIcon: React.ReactNode = null;
    let statusIconTooltipContent: React.ReactNode | null = null;
    let currentRemainingPercentage = 0;
    let totalDaysInRangeForLabel = 0;
    
    if (task.status !== 'completed') {
        if (timeStatus === 'upcoming' && task.timeInfo?.startDate) {
            const sDate = parseISO(task.timeInfo.startDate);
            if (isValid(sDate)) {
                const daysToStart = differenceInCalendarDays(sDate, today);
                let hourglassStyle: React.CSSProperties = {};
                let hourglassBaseClassName = 'h-4 w-4 mx-1 flex-shrink-0';

                if (daysToStart >= 0 && daysToStart <= 7) { 
                    hourglassStyle = { color: '#2ECC71' }; 
                } else if (daysToStart > 7 && daysToStart <= 30) { 
                    hourglassStyle = { color: '#808000' }; 
                } else { 
                    hourglassBaseClassName = cn(hourglassBaseClassName, 'text-muted-foreground');
                }
                statusIcon = <Hourglass className={hourglassBaseClassName} style={hourglassStyle} />;
                statusIconTooltipContent = <p>{t('task.display.status.upcoming')}</p>;
            }
        } else if (timeStatus === 'active' && task.timeInfo?.type === 'date_range' && task.timeInfo.startDate && task.timeInfo.endDate) {
            const sDate = parseISO(task.timeInfo.startDate);
            const eDate = parseISO(task.timeInfo.endDate);

            if (isValid(sDate) && isValid(eDate) && eDate >= sDate) {
                totalDaysInRangeForLabel = differenceInCalendarDays(eDate, sDate) + 1;
                const now = new Date();
                
                const isTaskTodayOnly = isToday(sDate) && isToday(eDate) && totalDaysInRangeForLabel === 1;
                const isTaskYesterdayToday = isYesterday(sDate) && isToday(eDate) && totalDaysInRangeForLabel === 2;
                const isTaskTodayTomorrow = isToday(sDate) && isTomorrow(eDate) && totalDaysInRangeForLabel === 2;

               if (isTaskTodayOnly || isTaskYesterdayToday || isTaskTodayTomorrow) {
                    const taskStartDateTime = startOfDay(sDate);
                    const taskEndDateTime = endOfDay(eDate);
                    const totalDurationInMs = taskEndDateTime.getTime() - taskStartDateTime.getTime();
                    
                    if (totalDurationInMs > 0) {
                        let elapsedMs = now.getTime() - taskStartDateTime.getTime();
                        elapsedMs = Math.max(0, Math.min(elapsedMs, totalDurationInMs));
                        const remainingMs = totalDurationInMs - elapsedMs;
                        currentRemainingPercentage = (remainingMs / totalDurationInMs) * 100;
                    } else {
                        currentRemainingPercentage = (now >= taskEndDateTime) ? 0 : 100;
                    }
                } else { 
                    if (now > endOfDay(eDate)) {
                        currentRemainingPercentage = 0;
                    } else if (now < startOfDay(sDate)) {
                        currentRemainingPercentage = 100;
                    } else {
                        const daysEffectivelyRemaining = differenceInCalendarDays(eDate, startOfDay(now)) + 1;
                        currentRemainingPercentage = totalDaysInRangeForLabel > 0 ? (daysEffectivelyRemaining / totalDaysInRangeForLabel) * 100 : 0;
                    }
                }
                currentRemainingPercentage = Math.max(0, Math.min(currentRemainingPercentage, 100));

                statusIcon = <TaskDurationPie
                                remainingPercentage={currentRemainingPercentage}
                                totalDurationDays={totalDaysInRangeForLabel}
                                size={16}
                                className="mx-1 flex-shrink-0"
                             />;
                const durationTextKey: TranslationKeys = totalDaysInRangeForLabel === 1 ? 'task.display.totalDurationDay' : 'task.display.totalDurationDaysPlural';
                statusIconTooltipContent = <p>{formatDateStringForDisplay(sDate, today, dateFnsLocale, true)} - {formatDateStringForDisplay(eDate, today, dateFnsLocale, true)} {t(durationTextKey, {count: totalDaysInRangeForLabel})}</p>;
            }
        } else if (timeStatus === 'active') { 
             statusIcon = <Zap className="h-4 w-4 text-green-500 mx-1 flex-shrink-0" />;
             statusIconTooltipContent = <p>{t('task.display.status.active')}</p>;
        } else if (timeStatus === 'overdue') {
            statusIcon = <AlertTriangle className="h-4 w-4 text-red-500 mx-1 flex-shrink-0" />;
            statusIconTooltipContent = <p>{t('task.display.status.overdue')}</p>;
        }
    }
    const charLimit = 40;
    const ellipsisThreshold = charLimit + 3;

    const displayTitle = isMobile && task.title.length > ellipsisThreshold 
                         ? task.title.substring(0, charLimit) + "..." 
                         : task.title;
    
    const displayDescription = task.description && isMobile && task.description.length > ellipsisThreshold 
                               ? task.description.substring(0, charLimit) + "..." 
                               : task.description;

    const isCheckInTask = task.checkinInfo && typeof task.checkinInfo.totalCheckinsRequired === 'number';
    const canCheckIn = isCheckInTask && task.status !== 'completed' && task.checkinInfo!.currentCheckins < task.checkinInfo!.totalCheckinsRequired;

    return (
      <TooltipProvider key={task.id}>
          <li
              draggable={!isMobile && !isCheckInTask && task.status !== 'completed'}
              onDragStart={!isMobile && !isCheckInTask && task.status !== 'completed' ? (e) => handleDragStart(e, task.id) : undefined}
              onClick={() => handleEditTask(task.id)}
              className={cn(
                  "group flex items-center gap-2 py-2.5 px-1 rounded-md hover:bg-muted cursor-pointer",
                  !isMobile && !isCheckInTask && "cursor-grab", 
                  selectedTaskId === task.id && "bg-muted shadow-md" 
              )}
          >
            <div className="flex-shrink-0 flex items-center justify-center pl-1 h-full">
               {isCheckInTask && task.status !== 'completed' ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 p-1"
                    onClick={(e) => { e.stopPropagation(); handleCheckIn(task); }}
                    disabled={!canCheckIn || isCheckingIn[task.id]}
                    title={t('task.item.checkInStampTitle', { title: task.title })}
                  >
                    {isCheckingIn[task.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Stamp className="h-5 w-5 text-primary" />}
                  </Button>
                ) : (
                  <div className="h-8 w-8 flex items-center justify-center">
                    <Checkbox
                      id={`task-${task.id}`}
                      checked={task.status === 'completed'}
                      onClick={(e) => { e.stopPropagation(); handleToggleTaskCompletion(task); }}
                      onCheckedChange={() => {}}
                      className="flex-shrink-0"
                      aria-label={t('task.item.toggleCompletionAria', {title: task.title})}
                    />
                  </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
              <p className={cn("text-base font-medium", task.status === 'completed' && "line-through text-muted-foreground")} title={task.title}>
                {displayTitle}
              </p>
              {displayDescription && (
                <p className={cn("text-xs text-muted-foreground", task.status === 'completed' && "line-through")} title={task.description ?? undefined}>
                  {displayDescription}
                </p>
              )}
            </div>

            <div className="flex flex-col items-end flex-shrink-0 space-y-1 ml-2 w-24">
                <div className="h-5 flex items-center justify-end w-full">
                    {isCheckInTask && task.checkinInfo && task.status !== 'completed' && (
                        <div className="flex items-center gap-2 w-full">
                            <Progress
                                value={(task.checkinInfo.currentCheckins / task.checkinInfo.totalCheckinsRequired) * 100}
                                className="h-1.5 flex-grow" 
                                aria-label={t('task.item.checkInProgressAria', {
                                    current: task.checkinInfo.currentCheckins,
                                    total: task.checkinInfo.totalCheckinsRequired
                                })}
                            />
                            <span className="text-xs text-muted-foreground">
                                {task.checkinInfo.currentCheckins}/{task.checkinInfo.totalCheckinsRequired}
                            </span>
                        </div>
                    )}
                </div>

                <div className="flex items-center space-x-0.5">
                  {visibleLabel && (
                      <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild>
                          <span className="text-xs text-muted-foreground mr-1 cursor-default">
                            {visibleLabel}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent><p>{tooltipLabel}</p></TooltipContent>
                      </Tooltip>
                    )}

                  {statusIcon && statusIconTooltipContent && (
                     <Tooltip delayDuration={300}>
                        <TooltipTrigger asChild><div className="flex items-center h-8 w-6 justify-center">{statusIcon}</div></TooltipTrigger>
                        <TooltipContent>{statusIconTooltipContent}</TooltipContent>
                    </Tooltip>
                  )}

                  {task.status !== 'completed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0"
                      onClick={(e) => { e.stopPropagation(); handleStartPomodoroForTask(task.title); }}
                      title={t('task.item.startPomodoro')}
                    >
                      <PlayCircle className="h-5 w-5 text-primary" />
                    </Button>
                  )}
                </div>
            </div>
          </li>
        </TooltipProvider>
    );
  };


  return (
    <div className="flex h-full w-full">
      <Sidebar
        collapsible="icon"
        side="left"
        variant="sidebar"
      >
      {(isMobile && openMobile) || !isMobile ? ( 
          <React.Fragment>
            <SidebarHeader className="flex-shrink-0 p-2" />
            <SidebarContent className="pt-1">
              <SidebarMenu>
                {taskTypeFilterOptions.map(typeOpt => (
                  <SidebarMenuItem key={typeOpt.value}>
                    <SidebarMenuButton
                      onClick={() => handleTaskTypeFilterChange(typeOpt.value)}
                      isActive={activeTaskTypeFilter === typeOpt.value}
                      tooltip={{ children: t(typeOpt.labelKey as any, {}), side: 'right', align: 'center' }}
                      className={cn(
                          "justify-start",
                          draggedOverType === (typeOpt.value as any) && typeOpt.value !== 'all' && "ring-2 ring-primary ring-offset-1"
                      )}
                      onDragOver={typeOpt.value !== 'all' && !isMobile ? handleDragOver : undefined}
                      onDrop={typeOpt.value !== 'all' && !isMobile ? (e) => handleDropOnType(e, typeOpt.value as TaskType) : undefined}
                      onDragEnter={typeOpt.value !== 'all' && !isMobile ? (e) => handleDragEnterType(e, typeOpt.value as TaskType | 'all') : undefined}
                      onDragLeave={typeOpt.value !== 'all' && !isMobile ? handleDragLeaveType : undefined}
                    >
                      <typeOpt.icon />
                      <span className="flex-grow">{t(typeOpt.labelKey as any, {})}</span>
                      <span className="text-xs text-muted-foreground ml-auto pr-1">{typeOpt.count}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
                <SidebarSeparator className="my-2" />
              </SidebarMenu>
            </SidebarContent>
            <SidebarFooter className="flex-shrink-0" />
          </React.Fragment>
        ) : null }
      </Sidebar>

      <SidebarInset className="flex flex-1 flex-col">
        <header className={cn(
            "flex-shrink-0 flex px-2 py-1 border-b sticky top-0 bg-background z-10 gap-1",
            "flex-col sm:flex-row sm:items-center sm:h-9" 
        )}>
            <div className="flex items-center gap-1 mb-1 sm:mb-0 self-start sm:self-center">
                <SidebarTrigger className="md:hidden h-6 w-6" onClick={toggleMobileSidebar}>
                  {openMobile ? <X className="h-4 w-4" /> : ActiveFilterIconComponent}
                </SidebarTrigger>
                <SidebarTrigger className="hidden md:inline-flex h-6 w-6" onClick={toggleDesktopSidebar}>
                  {ActiveFilterIconComponent}
                </SidebarTrigger>
            </div>
            
            <Tabs
                value={activeDateFilter}
                onValueChange={(value) => handleDateFilterChange(value as TaskDateFilter)}
                className="w-full sm:ml-1 h-auto" 
            >
                <TabsList className="flex flex-wrap w-full justify-start items-center h-auto rounded-md bg-muted p-1 text-muted-foreground gap-1">
                    <TabsTrigger value="all" className="py-1.5 text-xs px-2.5">{t('tasks.filter.all')}</TabsTrigger>
                    <TabsTrigger value="today" className="py-1.5 text-xs px-2.5">{t('tasks.filter.today')}</TabsTrigger>
                    <TabsTrigger value="threeDays" className="py-1.5 text-xs px-2.5">{t('tasks.filter.threeDays')}</TabsTrigger>
                    <TabsTrigger value="thisWeek" className="py-1.5 text-xs px-2.5">{t('tasks.filter.thisWeek')}</TabsTrigger>
                    <TabsTrigger value="twoWeeks" className="py-1.5 text-xs px-2.5">{t('tasks.filter.twoWeeks')}</TabsTrigger>
                </TabsList>
            </Tabs>
        </header>

        <div className="flex flex-1 mt-2 min-h-0"> 
          <div
            className={cn(
              "w-full flex flex-col", 
              showEditPanel ? "hidden md:block md:w-1/2" : "w-full"
            )}
          >
            {/* Energy State Landing Page or Workspace Panel */}
            {activeEnergyFilter === 'all' ? (
              // "How do you feel?" Landing Grid
              <div className="flex-grow flex flex-col items-center justify-center p-6 text-center space-y-8 max-w-4xl mx-auto my-auto min-h-[60vh]">
                <div className="space-y-3">
                  <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary via-purple-500 to-rose-500 bg-clip-text text-transparent">
                    {t('tasks.energyPortal.title')}
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">
                    {t('tasks.energyPortal.subtitle')}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  {/* Full Battery */}
                  <button
                    onClick={() => setActiveEnergyFilter('full')}
                    className="group relative flex flex-col items-start p-5 rounded-2xl border bg-card hover:bg-muted/50 hover:border-orange-500/50 hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] transition-all text-left space-y-3 scale-100 active:scale-[0.98] duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-2xl group-hover:bg-orange-500/10 transition-all duration-300" />
                    <div className="flex items-center justify-between w-full">
                      <span className="p-2.5 rounded-xl bg-orange-500/10 text-orange-500 text-lg group-hover:scale-110 transition-transform duration-300">🔥</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-orange-500 bg-orange-500/10 px-2 py-0.5 rounded-full">{t('tasks.energyPortal.full.subtitle')}</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg group-hover:text-orange-500 transition-colors">🔥 {t('tasks.energyPortal.full.title')}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('tasks.energyPortal.full.desc')}
                      </p>
                    </div>
                  </button>

                  {/* Solo Focus */}
                  <button
                    onClick={() => setActiveEnergyFilter('focus')}
                    className="group relative flex flex-col items-start p-5 rounded-2xl border bg-card hover:bg-muted/50 hover:border-purple-500/50 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all text-left space-y-3 scale-100 active:scale-[0.98] duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-all duration-300" />
                    <div className="flex items-center justify-between w-full">
                      <span className="p-2.5 rounded-xl bg-purple-500/10 text-purple-500 text-lg group-hover:scale-110 transition-transform duration-300">🧠</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-purple-500 bg-purple-500/10 px-2 py-0.5 rounded-full">{t('tasks.energyPortal.focus.subtitle')}</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg group-hover:text-purple-500 transition-colors">🧠 {t('tasks.energyPortal.focus.title')}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('tasks.energyPortal.focus.desc')}
                      </p>
                    </div>
                  </button>

                  {/* Social/Relax */}
                  <button
                    onClick={() => setActiveEnergyFilter('social')}
                    className="group relative flex flex-col items-start p-5 rounded-2xl border bg-card hover:bg-muted/50 hover:border-blue-500/50 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)] transition-all text-left space-y-3 scale-100 active:scale-[0.98] duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300" />
                    <div className="flex items-center justify-between w-full">
                      <span className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 text-lg group-hover:scale-110 transition-transform duration-300">💬</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-full">{t('tasks.energyPortal.social.subtitle')}</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg group-hover:text-blue-500 transition-colors">💬 {t('tasks.energyPortal.social.title')}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('tasks.energyPortal.social.desc')}
                      </p>
                    </div>
                  </button>

                  {/* Recharge/Rest */}
                  <button
                    onClick={() => setActiveEnergyFilter('recharge')}
                    className="group relative flex flex-col items-start p-5 rounded-2xl border bg-card hover:bg-muted/50 hover:border-teal-500/50 hover:shadow-[0_0_20px_rgba(20,184,166,0.15)] transition-all text-left space-y-3 scale-100 active:scale-[0.98] duration-300 overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-2xl group-hover:bg-teal-500/10 transition-all duration-300" />
                    <div className="flex items-center justify-between w-full">
                      <span className="p-2.5 rounded-xl bg-teal-500/10 text-teal-500 text-lg group-hover:scale-110 transition-transform duration-300">🧘</span>
                      <span className="text-[10px] uppercase font-bold tracking-widest text-teal-500 bg-teal-500/10 px-2 py-0.5 rounded-full">{t('tasks.energyPortal.recharge.subtitle')}</span>
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-bold text-lg group-hover:text-teal-500 transition-colors">🧘 {t('tasks.energyPortal.recharge.title')}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t('tasks.energyPortal.recharge.desc')}
                      </p>
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              // Energy State Selected: Workspace Panel
              <div className="flex flex-col flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between border-b pb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {activeEnergyFilter === 'full' && '🔥'}
                      {activeEnergyFilter === 'focus' && '🧠'}
                      {activeEnergyFilter === 'social' && '💬'}
                      {activeEnergyFilter === 'recharge' && '🧘'}
                    </span>
                    <div>
                      <h2 className="text-lg font-bold capitalize">
                        {activeEnergyFilter === 'full' && t('tasks.energyWorkspace.full.title')}
                        {activeEnergyFilter === 'focus' && t('tasks.energyWorkspace.focus.title')}
                        {activeEnergyFilter === 'social' && t('tasks.energyWorkspace.social.title')}
                        {activeEnergyFilter === 'recharge' && t('tasks.energyWorkspace.recharge.title')}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {t('tasks.energyWorkspace.matchingCount', { count: filteredAndSortedTasks.length, plural: filteredAndSortedTasks.length !== 1 ? 's' : '' })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveEnergyFilter('all')}
                    className="text-xs flex items-center gap-1.5"
                  >
                    ⚡ {t('tasks.energyWorkspace.changeState')}
                  </Button>
                </div>

                {filteredAndSortedTasks.length === 0 ? (
                  <div className="text-center py-12 space-y-3 bg-muted/10 rounded-2xl border border-dashed">
                    <div className="text-3xl">🎉</div>
                    <h3 className="font-bold text-sm">{t('tasks.energyWorkspace.allCaughtUp')}</h3>
                    <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                      {t('tasks.energyWorkspace.noTasksDesc')}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Interactive Hub Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* AI Optimal Selector Card */}
                      <div className="border rounded-2xl p-5 bg-card relative overflow-hidden flex flex-col justify-between min-h-[180px] shadow-sm">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full blur-xl" />
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                            <Sparkles className="h-4 w-4" /> {t('tasks.energyWorkspace.aiOptimal')}
                          </div>
                          {aiRecommendedTask ? (
                            <div className="space-y-1">
                              <h3 className="font-bold text-base leading-snug">{aiRecommendedTask.title}</h3>
                              {aiRecommendedTask.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                  {aiRecommendedTask.description}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">{t('tasks.energyWorkspace.noAiTask')}</p>
                          )}
                        </div>
                        <div className="pt-4 flex items-center gap-2">
                          {aiRecommendedTask && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedTaskId(aiRecommendedTask.id)}
                              className="text-xs flex items-center gap-1"
                            >
                              {t('tasks.energyWorkspace.startTask')}
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Randomizer Card */}
                      <div className="border rounded-2xl p-5 bg-card relative overflow-hidden flex flex-col justify-between min-h-[180px] shadow-sm">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl" />
                        <div className="space-y-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-purple-500 uppercase tracking-wider">
                            <BatteryCharging className="h-4 w-4 animate-pulse" /> {t('tasks.energyWorkspace.randomPick')}
                          </div>
                          {randomTask ? (
                            <div className="space-y-1">
                              <h3 className="font-bold text-base leading-snug">{randomTask.title}</h3>
                              {randomTask.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {randomTask.description}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="py-2">
                              <p className="text-xs text-muted-foreground">
                                {t('tasks.energyWorkspace.randomPickDesc')}
                              </p>
                            </div>
                          )}
                        </div>
                        <div className="pt-4 flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const randomIndex = Math.floor(Math.random() * filteredAndSortedTasks.length);
                              setRandomTask(filteredAndSortedTasks[randomIndex]);
                            }}
                            className="text-xs"
                          >
                            {randomTask ? `🎲 ${t('tasks.energyWorkspace.reroll')}` : `🎲 ${t('tasks.energyWorkspace.spinWheel')}`}
                          </Button>
                          {randomTask && (
                            <Button
                              size="sm"
                              onClick={() => setSelectedTaskId(randomTask.id)}
                              className="text-xs"
                            >
                              {t('tasks.energyWorkspace.startTask')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* View All Toggle Panel */}
                    <div className="border rounded-2xl overflow-hidden bg-card">
                      <button
                        onClick={() => setShowAllTasks(!showAllTasks)}
                        className="w-full flex items-center justify-between p-4 font-bold text-sm bg-muted/10 hover:bg-muted/20 transition-all border-b"
                      >
                        <div className="flex items-center gap-2">
                          <span>📋</span>
                          <span>{t('tasks.energyWorkspace.listAllTitle', { count: filteredAndSortedTasks.length })}</span>
                        </div>
                        <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-300", showAllTasks && "rotate-180")} />
                      </button>
                      
                      {showAllTasks && (
                        <div className="p-3 bg-card max-h-[400px] overflow-y-auto">
                          <ul className="space-y-1 w-full">
                            {filteredAndSortedTasks.map((task) => renderTaskListItem(task))}
                          </ul>
                          
                          <Accordion type="single" collapsible className="w-full px-1 mt-4" onValueChange={value => setIsPastAndFutureAccordionOpen(value === 'past-future-tasks')}>
                            <AccordionItem value="past-future-tasks">
                              <AccordionTrigger className="text-sm hover:no-underline">
                                <div className="flex items-center">
                                   {t('tasks.accordion.pastAndFutureTitle')}
                                   {pastAndFutureTasks.length > 0 && (
                                     <span className="ml-1 text-muted-foreground">({pastAndFutureTasks.length})</span>
                                   )}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent>
                                {pastAndFutureTasks.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-4 text-center">
                                    {t('tasks.accordion.noPastAndFutureTasks')}
                                  </p>
                                ) : (
                                  <ul className="space-y-1 w-full pt-2">
                                    {pastAndFutureTasks.map((task) => renderTaskListItem(task))}
                                  </ul>
                                )}
                              </AccordionContent>
                            </AccordionItem>
                          </Accordion>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <div
            className={cn(
              "flex flex-col bg-card shadow-md md:border-l",
              showEditPanel ? "w-full md:w-1/2 md:max-w-none" : "hidden"
            )}
          >
            {showEditPanel && (
                <TaskForm
                    key={selectedTaskId || 'new-task'} 
                    mode={isCreatingNewTask ? 'create' : 'edit'}
                    initialData={isCreatingNewTask ? defaultNewTaskData : selectedTask}
                    onSubmit={handleMainFormSubmit}
                    isLoading={isSubmittingForm}
                    onCancel={handleCancelEdit}
                    onIntermediateSave={selectedTask ? (updates: Partial<TaskFormData>) => updateTaskInContext(selectedTask.id, updates).then(() => true).catch(() => false) : undefined}
                    onDelete={selectedTask ? handleDeleteTask : undefined} 
                    onDirtyChange={setIsTaskFormDirty}
                />
            )}
          </div>
        </div>
      </SidebarInset>
      
      <AlertDialog open={isConfirmDiscardDialogOpen} onOpenChange={setIsConfirmDiscardDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>{t('tasks.unsavedChanges.title')}</AlertDialogTitle>
            <AlertDialogDescription>
                {pendingAction ? t(pendingAction.descriptionKey as any, {}) : ""}
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingAction(null)}>{t('tasks.unsavedChanges.button.stay')}</AlertDialogCancel>
            <AlertDialogAction onClick={proceedWithPendingAction}>
                {pendingAction ? t(pendingAction.confirmButtonKey as any, {}) : ""}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function TasksClient() {
  return (
    <SidebarProvider defaultOpen={false}>
      <TasksClientContent />
    </SidebarProvider>
  );
}
