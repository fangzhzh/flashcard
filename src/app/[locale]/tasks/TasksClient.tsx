
"use client";
import React, { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox'; // Import Checkbox
import { PlusCircle, Loader2, Info, ShieldAlert, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Task, TimeInfo, TaskStatus } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import TaskForm from '@/components/TaskForm';
import { usePomodoro } from '@/contexts/PomodoroContext';
import { format, parseISO, differenceInCalendarDays, isToday, isTomorrow, isValid, isSameYear } from 'date-fns';
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
      // Optionally, show a toast message
      // toast({ title: t('success'), description: newStatus === 'completed' ? t('toast.task.markedComplete') : t('toast.task.markedPending') });
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
    }
  };

  const formatTimeLabel = useCallback((timeInfo: TimeInfo): string => {
    if (!timeInfo || timeInfo.type === 'no_time' || !timeInfo.startDate || !isValid(parseISO(timeInfo.startDate))) {
      return ''; // Return empty for no date or invalid date
    }

    const startDate = parseISO(timeInfo.startDate);
    const currentDate = new Date();

    if (isToday(startDate)) return t('task.display.label.today');
    if (isTomorrow(startDate)) return t('task.display.label.tomorrowShort');
    
    if (isSameYear(startDate, currentDate)) {
      return format(startDate, 'MM/dd');
    }
    return format(startDate, 'yyyy/MM/dd');

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
    
    const aDate = a.timeInfo?.startDate ? parseISO(a.timeInfo.startDate) : null;
    const bDate = b.timeInfo?.startDate ? parseISO(b.timeInfo.startDate) : null;

    if (aDate && bDate) {
        if (aDate < bDate) return -1;
        if (aDate > bDate) return 1;
    } else if (aDate) { // a has date, b does not
        return -1; 
    } else if (bDate) { // b has date, a does not
        return 1;
    }
    // Fallback to createdAt if dates are same or not present
    return (b.createdAt && a.createdAt) ? (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : 0;
  });


  return (
    <div className="flex h-[calc(100vh-var(--header-height,4rem)-4rem)]"> 
      <div className={cn("transition-all duration-300 ease-in-out overflow-y-auto py-4 flex flex-col", showEditPanel ? "w-1/2 pr-2" : "w-full pr-0")}>
        <div className="flex justify-between items-center mb-6 px-4">
          <h1 className="text-2xl font-semibold tracking-tight">{t('tasks.title')}</h1>
          <Button onClick={handleCreateNewTask} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> {t('tasks.button.create')}
          </Button>
        </div>

        {sortedTasks.length === 0 && !effectiveLoading && (
          <Alert className="mt-8 mx-4 border-primary/50 text-primary bg-primary/5">
            <Info className="h-5 w-5 text-primary" />
            <AlertTitle className="font-semibold text-primary">{t('tasks.list.empty.title')}</AlertTitle>
            <AlertDescription>
              {t('tasks.list.empty.description')}
            </AlertDescription>
          </Alert>
        )}

        <ul className="space-y-1 px-4 flex-grow">
          {sortedTasks.map((task) => (
            <li key={task.id}
                className={cn(
                    "group flex items-center justify-between p-3 rounded-md hover:bg-muted cursor-pointer",
                    selectedTaskId === task.id && "bg-muted shadow-md"
                )}
                 onClick={() => handleEditTask(task.id)}
            >
              <div className="flex items-center flex-grow min-w-0 mr-4">
                 <Checkbox
                    id={`task-${task.id}`}
                    checked={task.status === 'completed'}
                    onCheckedChange={(checked) => {
                        // Prevent panel opening when checkbox is clicked directly
                        event?.stopPropagation(); 
                        handleToggleTaskCompletion(task);
                    }}
                    className="mr-3 flex-shrink-0"
                    aria-label={t('task.item.toggleCompletionAria', {title: task.title})}
                  />
                <div className="min-w-0">
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
                <span className="text-xs text-muted-foreground mr-2">{formatTimeLabel(task.timeInfo)}</span>
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
