
"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import TaskForm, { type TaskFormData } from '@/components/TaskForm'; // Import TaskFormData
import PageContainer from '@/components/PageContainer';
import type { Task, TaskStatus, RepeatFrequency, TimeInfo, ArtifactLink, TaskType } from '@/types'; // Added TaskType
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from 'lucide-react';

interface TaskFormPageProps {
  mode: 'create' | 'edit';
}

export default function TaskFormPage({ mode }: TaskFormPageProps) {
  const router = useRouter();
  const params = useParams();
  const searchParamsHook = useSearchParams(); // Renamed to avoid conflict with searchParams in useEffect
  const { user, loading: authLoading } = useAuth();
  const { 
    addTask, 
    updateTask, 
    getTaskById, 
    isLoadingTasks, 
    isLoading: contextOverallLoading 
  } = useFlashcards();
  
  const [initialData, setInitialData] = useState<Partial<Task> | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const t = useI18n();

  const taskId = mode === 'edit' ? (params.id as string) : undefined;

  useEffect(() => {
    // Use searchParamsHook here for reading initial deckId or other params for creation
    const deckIdFromQuery = searchParamsHook.get('deckId'); // Example, if needed

    if (mode === 'edit' && taskId && !isLoadingTasks && user) {
      const task = getTaskById(taskId);
      if (task) {
        setInitialData(task);
      } else {
        toast({ title: t('error'), description: t('toast.task.notFound'), variant: "destructive" });
        router.push(`/${params.locale}/tasks`);
      }
    } else if (mode === 'create' && !taskId) {
      setInitialData({
        title: '',
        description: '',
        type: 'innie', // Default type
        repeat: 'none',
        timeInfo: { type: 'no_time' },
        artifactLink: { flashcardId: null },
        reminderInfo: { type: 'none' },
        // If deckIdFromQuery is relevant for new tasks, incorporate it here
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, taskId, getTaskById, router, toast, isLoadingTasks, user, params.locale, searchParamsHook]);

  const handleSubmit = async (data: TaskFormData) => { 
    if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await addTask(data); 
        toast({ title: t('success'), description: t('toast.task.created') });
      } else if (taskId) {
        await updateTask(taskId, data); 
        toast({ title: t('success'), description: t('toast.task.updated') });
      }

      const returnToPath = searchParamsHook.get('returnTo');
      if (returnToPath) {
        router.push(`/${params.locale}${returnToPath}`);
      } else {
        router.push(`/${params.locale}/tasks`); // Default fallback
      }

    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.save'), variant: "destructive" });
      console.error("Failed to save task:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const effectiveLoading = authLoading || (isLoadingTasks && user) || (contextOverallLoading && user);

  if (effectiveLoading && mode === 'edit' && !initialData) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center mt-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">{t('flashcard.form.page.loadingSpecific')}</p>
        </div>
      </PageContainer>
    );
  }
  
  if (!user && !authLoading) {
    return (
      <PageContainer>
        <Alert variant="destructive" className="mt-8">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  if (!initialData && (mode === 'create' || (mode === 'edit' && !effectiveLoading))) {
     return (
      <PageContainer>
        <div className="flex justify-center items-center mt-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }


  return (
    <PageContainer>
      <div className="flex justify-between items-center mb-6">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('flashcard.form.page.button.back')}
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight">
          {mode === 'edit' ? t('task.form.page.title.edit') : t('task.form.page.title.create')}
        </h2>
        <div /> {/* Spacer */}
      </div>

      {initialData && (
        <TaskForm
          onSubmit={handleSubmit}
          initialData={initialData} 
          isLoading={isSubmitting}
          mode={mode}
        />
      )}
    </PageContainer>
  );
}
