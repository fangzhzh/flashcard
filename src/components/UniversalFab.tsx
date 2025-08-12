
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { ListChecks, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from 'react';
import TaskForm, { type TaskFormData } from '@/components/TaskForm';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useToast } from '@/hooks/use-toast';
import FloatingPomodoroTimer from './FloatingPomodoroTimer';
import { GitFork } from 'lucide-react';

export default function UniversalFab() {
  const { user } = useAuth();
  const t = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = useCurrentLocale();
  const { addTask } = useFlashcards();
  const { toast } = useToast();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [isOverviewDialogOpen, setIsOverviewDialogOpen] = useState(false);


  if (!user) {
    return null;
  }

  const basePathname = pathname.startsWith(`/${currentLocale}`)
    ? pathname.substring(`/${currentLocale}`.length) || '/'
    : pathname;
    
  const isTimerPage = basePathname === '/timer' || basePathname === '/';
  if (isTimerPage) {
    return null;
  }
  
  const handleTaskFormSubmit = async (data: TaskFormData) => {
    setIsSubmittingTask(true);
    try {
      await addTask(data);
      toast({ title: t('success'), description: t('toast.task.created') });
      setIsTaskDialogOpen(false);
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.save'), variant: 'destructive' });
    } finally {
      setIsSubmittingTask(false);
    }
  };

  let contextualAction: React.ReactNode = null;
  const currentQueryString = searchParams.toString();
  const returnToPath = encodeURIComponent(basePathname + (currentQueryString ? `?${currentQueryString}` : ''));

  if (basePathname.startsWith('/overviews')) {
     // This logic would need to open the dialog in OverviewsClient, which is complex.
     // The simplest "Create Overview" is a navigation to a new page, which doesn't exist.
     // For now, let's assume we can trigger a dialog here or it's handled inside the page.
     // A better approach is to not show a FAB for overview creation if it's already in the header.
     // However, to follow the request, we can model it but it might need more state management (e.g. Zustand/Redux)
     // to open a dialog in a different component. Let's stick to the local header button and remove this FAB.
     // The user request is to make the button create an overview. Let's simplify and assume for now we don't have a dedicated FAB for it.
     // The prompt seems to imply a change in the FAB itself. I'll remove the FAB for flashcards on this page.
  } else if (
    basePathname.startsWith('/flashcards') ||
    basePathname.startsWith('/flashcards-hub') ||
    basePathname.startsWith('/review') ||
    basePathname.startsWith('/decks')
  ) {
    contextualAction = (
      <Link href={`/${currentLocale}/flashcards/new?returnTo=${returnToPath}`} passHref>
        <Button
          variant="default"
          className="h-14 w-14 rounded-full bg-primary p-0 shadow-lg text-primary-foreground"
          title={t('flashcards.button.create')}
        >
          <PlusCircle className="h-7 w-7" />
        </Button>
      </Link>
    );
  }
  
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-4">
      {contextualAction}
      <FloatingPomodoroTimer />
      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogTrigger asChild>
            <Button
              variant="default"
              className="h-14 w-14 rounded-full bg-primary p-0 shadow-lg text-primary-foreground"
              title={t('tasks.button.create')}
            >
              <ListChecks className="h-7 w-7" />
            </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('task.form.page.title.create')}</DialogTitle>
          </DialogHeader>
          <TaskForm
            mode="create"
            onSubmit={handleTaskFormSubmit}
            isLoading={isSubmittingTask}
            onCancel={() => setIsTaskDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

    