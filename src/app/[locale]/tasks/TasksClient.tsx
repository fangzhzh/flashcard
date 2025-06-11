
"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PlusCircle, Edit3, Trash2, Loader2, Info, ShieldAlert, ListChecks, CalendarDays, Link2 as LinkIcon, Repeat, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Task, TimeInfo } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

export default function TasksClient() {
  const { user, loading: authLoading } = useAuth();
  const { tasks, deleteTask, isLoadingTasks, isLoading: contextOverallLoading, isSeeding } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDeleteTask = async (taskId: string) => {
    if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      await deleteTask(taskId);
      toast({ title: t('success'), description: t('toast.task.deleted') });
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.delete'), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimeInfo = (timeInfo: TimeInfo): string => {
    if (!timeInfo || timeInfo.type === 'no_time' || !timeInfo.startDate) {
      return t('task.display.noTime');
    }
    const startDate = parseISO(timeInfo.startDate);
    switch (timeInfo.type) {
      case 'datetime':
        return `${t('task.display.due')} ${format(startDate, 'PP')} ${t('task.display.on')} ${timeInfo.time || ''}`;
      case 'all_day':
        return `${t('task.display.allDay')} ${t('task.display.on')} ${format(startDate, 'PP')}`;
      case 'date_range':
        if (timeInfo.endDate) {
          const endDate = parseISO(timeInfo.endDate);
          return `${t('task.display.from')} ${format(startDate, 'PP')} ${t('task.display.to')} ${format(endDate, 'PP')}`;
        }
        return `${t('task.display.from')} ${format(startDate, 'PP')}`;
      default:
        return t('task.display.noTime');
    }
  };

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
       <Alert variant="destructive" className="mt-8">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
        </Alert>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('tasks.title')}</h1>
        <Link href={`/${currentLocale}/tasks/new`} passHref>
          <Button className="w-full sm:w-auto text-base py-3">
            <PlusCircle className="mr-2 h-5 w-5" /> {t('tasks.button.create')}
          </Button>
        </Link>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tasks.map((task) => (
          <Card key={task.id} className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl flex items-center flex-grow mr-2">
                  <ListChecks className="mr-2 h-5 w-5 text-primary/80 flex-shrink-0"/>
                  <span className="truncate" title={task.title}>{task.title}</span>
                </CardTitle>
                <Link href={`/${currentLocale}/tasks/${task.id}/edit`} passHref legacyBehavior>
                    <Button variant="ghost" size="icon" className="flex-shrink-0 h-7 w-7 p-1" title={t('task.item.edit')}>
                        <Edit3 className="h-4 w-4" />
                    </Button>
                </Link>
              </div>
              <Badge variant={task.status === 'completed' ? 'default' : 'secondary'} className="w-fit mt-1">
                {t(`task.item.status.${task.status}` as any)}
              </Badge>
            </CardHeader>
            <CardContent className="flex-grow space-y-3">
              {task.description && <p className="text-sm text-muted-foreground line-clamp-3">{task.description}</p>}
              
              <div className="text-xs text-muted-foreground space-y-1">
                {task.timeInfo && task.timeInfo.type !== 'no_time' && task.timeInfo.startDate && (
                  <div className="flex items-center">
                    <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
                    <span>{formatTimeInfo(task.timeInfo)}</span>
                  </div>
                )}
                {task.repeat !== 'none' && (
                  <div className="flex items-center">
                    <Repeat className="mr-1.5 h-3.5 w-3.5" />
                    <span>{t('task.form.label.repeat')}: {t(`task.form.repeat.${task.repeat}` as any)}</span>
                  </div>
                )}
                {task.artifactLink && task.artifactLink.type !== 'none' && (
                  <div className="flex items-center">
                    <LinkIcon className="mr-1.5 h-3.5 w-3.5" />
                    {task.artifactLink.type === 'url' && task.artifactLink.urlValue ? (
                      <a 
                        href={task.artifactLink.urlValue} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="hover:underline text-primary truncate"
                        title={task.artifactLink.urlValue}
                      >
                        {task.artifactLink.linkTitle || task.artifactLink.urlValue}
                      </a>
                    ) : task.artifactLink.type === 'flashcard' && task.artifactLink.flashcardId ? (
                      <span className="truncate" title={t('task.display.artifact.flashcard', { title: task.artifactLink.linkTitle || task.artifactLink.flashcardId }) as string}>
                        {t('task.display.artifact.flashcard', { title: task.artifactLink.linkTitle || task.artifactLink.flashcardId })}
                      </span>
                    ) : null}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-4 border-t">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1 sm:flex-none" disabled={isSubmitting}>
                      <Trash2 className="mr-2 h-4 w-4" /> {t('task.item.delete')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('task.item.delete.confirm.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('task.item.delete.confirm.description')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('deck.item.delete.confirm.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTask(task.id)} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('task.item.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>
    </>
  );
}
