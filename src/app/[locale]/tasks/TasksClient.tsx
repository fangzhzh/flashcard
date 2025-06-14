
"use client";
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Info, ShieldAlert, PlayCircle, Zap, AlertTriangle, CalendarIcon, Hourglass, ListChecks, PanelLeft, Briefcase, User, Coffee, LayoutGrid, X, Save, Link2, RotateCcw, Clock, Bell, Trash2, FilePlus, Search, Edit3, Repeat } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Task, TimeInfo, TaskStatus, RepeatFrequency, ReminderType, TaskType, ArtifactLink, Flashcard as FlashcardType } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import TaskForm, { type TaskFormData } from '@/components/TaskForm';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid, isSameYear, startOfDay, addDays, startOfWeek, endOfWeek, areIntervalsOverlapping } from 'date-fns';
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


type TranslationKeys = keyof typeof import('@/lib/i18n/locales/en').default;

interface FormattedTimeInfo {
  visibleLabel: string;
  tooltipLabel: string;
  timeStatus: 'upcoming' | 'active' | 'overdue' | 'none';
}

type TaskDateFilter = 'all' | 'today' | 'threeDays' | 'thisWeek' | 'twoWeeks';

interface TaskTypeFilterOption {
  value: TaskType | 'all';
  labelKey: TranslationKeys;
  icon: React.ElementType;
  count: number;
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
    deleteTask: deleteTaskInContext
  } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const dateFnsLocale = currentLocale === 'zh' ? zhCN : enUS;
  const today = startOfDay(new Date());

  const pomodoroContext = usePomodoro();
  const { toggleSidebar, isMobile } = useSidebar();


  const [isSubmittingForm, setIsSubmittingForm] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isCreatingNewTask, setIsCreatingNewTask] = useState(false);
  const [activeDateFilter, setActiveDateFilter] = useState<TaskDateFilter>('all');
  const [activeTaskTypeFilter, setActiveTaskTypeFilter] = useState<TaskType | 'all'>('all');
  const [draggedOverType, setDraggedOverType] = useState<TaskType | null>(null);

  const [taskCounts, setTaskCounts] = useState({ innie: 0, outie: 0, blackout: 0, all: 0 });


  useEffect(() => {
    if (tasks) {
      const counts = { innie: 0, outie: 0, blackout: 0, all: tasks.length };
      tasks.forEach(task => {
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
    timeInfo: { type: 'no_time' as 'no_time', startDate: null, endDate: null, time: null },
    artifactLink: { flashcardId: null as string | null },
    reminderInfo: { type: 'none' as ReminderType },
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
    const weekStartsOn = currentLocale === 'zh' ? 1 : 0; // Monday for Chinese, Sunday for English

    let currentTasks = tasks;

    // 1. Filter by Task Type
    if (activeTaskTypeFilter !== 'all') {
      currentTasks = currentTasks.filter(task => task.type === activeTaskTypeFilter);
    }

    // 2. Filter by Date Range
    const dateFilterFn = (task: Task): boolean => {
      if (activeDateFilter === 'all') return true;

      const { timeInfo } = task;
      if (!timeInfo?.startDate || !isValid(parseISO(timeInfo.startDate))) {
        return activeDateFilter === 'all';
      }
      const taskStartDate = startOfDay(parseISO(timeInfo.startDate));
      const taskEndDate = timeInfo.endDate && isValid(parseISO(timeInfo.endDate)) ? startOfDay(parseISO(timeInfo.endDate)) : taskStartDate;

      let filterIntervalStart = today;
      let filterIntervalEnd = today;

      switch (activeDateFilter) {
        case 'today':
          // filterIntervalStart and filterIntervalEnd are already 'today'
          break;
        case 'threeDays':
          filterIntervalEnd = addDays(today, 2); // Today, Tomorrow, Day after tomorrow
          break;
        case 'thisWeek':
          filterIntervalStart = startOfWeek(today, { weekStartsOn });
          filterIntervalEnd = endOfWeek(today, { weekStartsOn });
          break;
        case 'twoWeeks': 
          // The twoWeeks filter should cover the current week and the next week.
          filterIntervalStart = startOfWeek(today, { weekStartsOn }); // Start of current week
          filterIntervalEnd = endOfWeek(addDays(today, 7), { weekStartsOn }); // End of next week
          break;
        default:
          return true; 
      }
      
      return areIntervalsOverlapping(
        { start: taskStartDate, end: taskEndDate },
        {start: filterIntervalStart, end: filterIntervalEnd }
      );
    };

    currentTasks = currentTasks.filter(dateFilterFn);

    // 3. Sort
    return [...currentTasks].sort((a, b) => {
      // Completed tasks to the bottom
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;

      // Sort by start date (earliest first)
      const aDate = a.timeInfo?.startDate && isValid(parseISO(a.timeInfo.startDate)) ? parseISO(a.timeInfo.startDate) : null;
      const bDate = b.timeInfo?.startDate && isValid(parseISO(b.timeInfo.startDate)) ? parseISO(b.timeInfo.startDate) : null;

      if (aDate && bDate) {
          if (aDate < bDate) return -1;
          if (aDate > bDate) return 1;
      } else if (aDate) { // Tasks with dates before tasks without dates
          return -1;
      } else if (bDate) {
          return 1;
      }
      // Fallback to creation date if dates are the same or both null (newest first)
      return (b.createdAt && a.createdAt) ? (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : 0;
    });
  }, [tasks, activeDateFilter, activeTaskTypeFilter, today, currentLocale]);

  const isLoadingAppData = (authLoading && !user) ||
                           (!authLoading && user && (isLoadingTasks || contextOverallLoading || isSeeding));

  const showSignInPrompt = !authLoading && !user;

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

  const handleToggleTaskCompletion = async (task: Task) => {
    const newStatus: TaskStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await updateTaskInContext(task.id, { status: newStatus });
      // Optionally, toast for success
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
    }
  };

  const handleStartPomodoroForTask = (taskTitle: string) => {
    if (!user) {
        toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
        return;
    }
    const pomodoroState = pomodoroContext.sessionState;
    const startFn = pomodoroContext.startPomodoro;
    // Use user's preferred duration if available, otherwise default to 25
    const duration = pomodoroState?.userPreferredDurationMinutes || 25;
    startFn(duration, taskTitle); // Pass task title
    toast({ title: t('pomodoro.button.start'), description: t('task.pomodoroStartedFor', { title: taskTitle }) });
    // Navigate to pomodoro page
    router.push(`/${currentLocale}/timer`);
  };

  // Main form submission (create new or update existing)
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
        setSelectedTaskId(null); 
      }
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

  const taskTypeFilterOptions: TaskTypeFilterOption[] = useMemo(() => [
    { value: 'all', labelKey: 'tasks.filter.allTypes', icon: LayoutGrid, count: taskCounts.all },
    { value: 'innie', labelKey: 'task.type.innie', icon: Briefcase, count: taskCounts.innie },
    { value: 'outie', labelKey: 'task.type.outie', icon: User, count: taskCounts.outie },
    { value: 'blackout', labelKey: 'task.type.blackout', icon: Coffee, count: taskCounts.blackout },
  ], [t, taskCounts]);

  // Drag and Drop Handlers
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
          toast({ title: t('success'), description: t('toast.task.typeChanged', { type: t(`task.type.${newType}` as any) }) });
        } catch (error) {
          toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
        }
      }
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

  const showEditPanel = selectedTaskId !== null || isCreatingNewTask;

  return (
    <div className="flex h-full">
      <Sidebar
        collapsible="icon"
        side="left"
        variant="sidebar"
      >
        <div className={cn("flex flex-col", !isMobile && "h-full overflow-hidden pt-16")}>
          <SidebarHeader className="flex-shrink-0">
          </SidebarHeader>
          <SidebarContent className="pt-1"> 
            <SidebarMenu>
              {taskTypeFilterOptions.map(typeOpt => (
                <SidebarMenuItem key={typeOpt.value}>
                  <SidebarMenuButton
                    onClick={() => setActiveTaskTypeFilter(typeOpt.value as TaskType | 'all')}
                    isActive={activeTaskTypeFilter === typeOpt.value}
                    tooltip={{ children: t(typeOpt.labelKey), side: 'right', align: 'center' }}
                    className={cn(
                        "justify-start",
                        draggedOverType === typeOpt.value && typeOpt.value !== 'all' && "ring-2 ring-primary ring-offset-1"
                    )}
                    onDragOver={typeOpt.value !== 'all' ? handleDragOver : undefined}
                    onDrop={typeOpt.value !== 'all' ? (e) => handleDropOnType(e, typeOpt.value as TaskType) : undefined}
                    onDragEnter={typeOpt.value !== 'all' ? (e) => handleDragEnterType(e, typeOpt.value as TaskType | 'all') : undefined}
                    onDragLeave={typeOpt.value !== 'all' ? handleDragLeaveType : undefined}
                  >
                    <typeOpt.icon />
                    <span className="flex-grow">{t(typeOpt.labelKey)}</span>
                    <span className="text-xs text-muted-foreground ml-auto pr-1">{typeOpt.count}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              <SidebarSeparator className="my-2" />
            </SidebarMenu>
          </SidebarContent>
          <SidebarFooter className="flex-shrink-0">
          </SidebarFooter>
        </div>
      </Sidebar>

      <SidebarInset className="flex flex-1 flex-col overflow-hidden">
        <header className="flex-shrink-0 flex items-center justify-start px-2 py-1 border-b sticky top-0 bg-background z-10 h-9 gap-1">
          <div className="flex items-center gap-1">
             <SidebarTrigger className="md:hidden h-6 w-6" onClick={toggleSidebar} />
             <SidebarTrigger className="hidden md:inline-flex h-6 w-6" onClick={toggleSidebar} />
          </div>
          {/* Desktop Date Filters */}
          <div className="hidden sm:block ml-1">
            <Tabs
              value={activeDateFilter}
              onValueChange={(value) => setActiveDateFilter(value as TaskDateFilter)}
              className="h-6"
            >
              <TabsList className="grid grid-cols-5 h-full">
                <TabsTrigger value="all" className="py-0.5 text-xs">{t('tasks.filter.all')}</TabsTrigger>
                <TabsTrigger value="today" className="py-0.5 text-xs">{t('tasks.filter.today')}</TabsTrigger>
                <TabsTrigger value="threeDays" className="py-0.5 text-xs">{t('tasks.filter.threeDays')}</TabsTrigger>
                <TabsTrigger value="thisWeek" className="py-0.5 text-xs">{t('tasks.filter.thisWeek')}</TabsTrigger>
                <TabsTrigger value="twoWeeks" className="py-0.5 text-xs">{t('tasks.filter.twoWeeks')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </header>

        {/* Mobile Date Filters */}
        <div className="sm:hidden px-2 py-1 border-b flex-shrink-0">
            <Tabs
              value={activeDateFilter}
              onValueChange={(value) => setActiveDateFilter(value as TaskDateFilter)}
            >
              <TabsList className="flex flex-wrap w-full justify-start items-center h-auto rounded-md bg-muted p-1 text-muted-foreground gap-1">
                <TabsTrigger value="all" className="py-1.5 text-xs px-2.5">{t('tasks.filter.all')}</TabsTrigger>
                <TabsTrigger value="today" className="py-1.5 text-xs px-2.5">{t('tasks.filter.today')}</TabsTrigger>
                <TabsTrigger value="threeDays" className="py-1.5 text-xs px-2.5">{t('tasks.filter.threeDays')}</TabsTrigger>
                <TabsTrigger value="thisWeek" className="py-1.5 text-xs px-2.5">{t('tasks.filter.thisWeek')}</TabsTrigger>
                <TabsTrigger value="twoWeeks" className="py-1.5 text-xs px-2.5">{t('tasks.filter.twoWeeks')}</TabsTrigger>
              </TabsList>
            </Tabs>
        </div>

        {/* Content area: list + optional panel */}
        <div className="flex flex-1 overflow-hidden mt-2"> {/* PARENT FLEX CONTAINER for list and edit panel */}
          {/* Task List Area Wrapper */}
          <div
            className={cn(
              "h-full overflow-y-auto",
              showEditPanel ? "hidden md:block md:w-1/2 p-1 md:pr-0" : "w-full p-1"
            )}
          >
            {filteredAndSortedTasks.length === 0 && !showEditPanel && (
              <Alert className={cn("mt-4 border-primary/50 text-primary bg-primary/5 mx-1")}>
                <Info className="h-5 w-5 text-primary" />
                <AlertTitle className="font-semibold text-primary">{t('tasks.list.empty.title')}</AlertTitle>
                <AlertDescription>
                  {t('tasks.list.empty.description')}
                </AlertDescription>
              </Alert>
            )}
            <ul className="space-y-1 w-full pb-20">
              {filteredAndSortedTasks.map((task) => {
                const { visibleLabel, tooltipLabel, timeStatus } = formatTimeLabel(task.timeInfo);
                let statusIcon: React.ReactNode = null;
                let statusIconTooltipContent: React.ReactNode | null = null;
                
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
                            const totalDaysInRange = differenceInCalendarDays(eDate, sDate) + 1;
                            let daysRemainingIncludingToday = differenceInCalendarDays(eDate, today) + 1;
                            let currentRemainingPercentage = 0;

                            if (today > eDate) { 
                                currentRemainingPercentage = 0;
                            } else if (today < sDate) { 
                                currentRemainingPercentage = 100;
                            } else { 
                               if (totalDaysInRange > 0) {
                                 currentRemainingPercentage = (daysRemainingIncludingToday / totalDaysInRange) * 100;
                               }
                            }
                            currentRemainingPercentage = Math.max(0, Math.min(currentRemainingPercentage, 100));

                            statusIcon = <TaskDurationPie
                                            remainingPercentage={currentRemainingPercentage}
                                            totalDurationDays={totalDaysInRange}
                                            variant="active"
                                            size={16}
                                            className="mx-1 flex-shrink-0"
                                         />;
                            const durationTextKey: TranslationKeys = totalDaysInRange === 1 ? 'task.display.totalDurationDay' : 'task.display.totalDurationDaysPlural';
                            statusIconTooltipContent = <p>{formatDateStringForDisplay(sDate, today, dateFnsLocale, true)} - {formatDateStringForDisplay(eDate, today, dateFnsLocale, true)} ({t(durationTextKey, {count: totalDaysInRange})})</p>;
                        }
                    } else if (timeStatus === 'active') { 
                         statusIcon = <Zap className="h-4 w-4 text-green-500 mx-1 flex-shrink-0" />;
                         statusIconTooltipContent = <p>{t('task.display.status.active')}</p>;
                    } else if (timeStatus === 'overdue') {
                        statusIcon = <AlertTriangle className="h-4 w-4 text-yellow-500 mx-1 flex-shrink-0" />;
                        statusIconTooltipContent = <p>{t('task.display.status.overdue')}</p>;
                    }
                }
                const displayTitle = isMobile && task.title.length > 60 ? task.title.substring(0, 57) + "..." : task.title;
                const displayDescription = task.description && isMobile && task.description.length > 100 ? task.description.substring(0, 97) + "..." : task.description;


                return (
                <TooltipProvider key={task.id}>
                  <li
                      draggable="true"
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className={cn(
                          "group flex items-center justify-between py-2.5 px-1 rounded-md hover:bg-muted cursor-grab",
                          selectedTaskId === task.id && "bg-muted shadow-md" 
                      )}
                  >
                    <div className="flex items-center flex-1 min-w-0 mr-2">
                       <Checkbox
                          id={`task-${task.id}`}
                          checked={task.status === 'completed'}
                          onCheckedChange={() => handleToggleTaskCompletion(task)}
                          className="mr-2 flex-shrink-0"
                          aria-label={t('task.item.toggleCompletionAria', {title: task.title})}
                        />
                      <div className="flex-1 min-w-0 cursor-pointer overflow-hidden" onClick={() => handleEditTask(task.id)}>
                        <p className={cn(
                            "text-base font-medium", 
                            task.status === 'completed' && "line-through text-muted-foreground"
                          )} title={task.title}>
                          {displayTitle}
                        </p>
                        {displayDescription && (
                          <p className={cn(
                              "text-xs text-muted-foreground", 
                              task.status === 'completed' && "line-through"
                            )} title={task.description ?? undefined}>
                            {displayDescription}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center flex-shrink-0"> 
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

                      {statusIcon && statusIconTooltipContent && (
                         <Tooltip delayDuration={300}>
                            <TooltipTrigger asChild>
                                <div className="flex items-center"> 
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
          {/* Edit Panel Area Wrapper */}
          {showEditPanel && (
            <div className={cn(
                "bg-card flex flex-col h-full shadow-md", 
                "w-full md:w-1/2 md:border-l" 
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
      </SidebarInset>
      
      <Button
        variant="default"
        className="fixed bottom-[6.5rem] right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
        onClick={handleCreateNewTask}
        title={t('tasks.button.create')}
      >
        <ListChecks className="h-7 w-7" /> 
      </Button>
    </div>
  );
}

// Default export that wraps TasksClientContent with SidebarProvider
export default function TasksClient() {
  return (
    <SidebarProvider defaultOpen={false}>
      <TasksClientContent />
    </SidebarProvider>
  );
}
    

    