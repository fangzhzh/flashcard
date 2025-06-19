
"use client";
import { useState } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription as UiDialogDescription, // Renamed to avoid conflict if DialogDescription is used from AlertDialog
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger, // Added AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { PlusCircle, Edit3, Trash2, Loader2, Info, ShieldAlert, GitFork, Eye, FolderKanban } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Overview } from '@/types';
import { Alert, AlertTitle, AlertDescription as UiAlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function OverviewsClient() {
  const { user, loading: authLoading } = useAuth();
  const { overviews, addOverview, updateOverview, deleteOverview, isLoadingOverviews, isSeeding, tasks } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentOverview, setCurrentOverview] = useState<Partial<Overview> | null>(null);
  const [overviewTitle, setOverviewTitle] = useState('');
  const [overviewDescription, setOverviewDescription] = useState('');
  const [isSubmittingOverview, setIsSubmittingOverview] = useState(false);

  const openNewOverviewDialog = () => {
    setCurrentOverview(null);
    setOverviewTitle('');
    setOverviewDescription('');
    setIsDialogOpen(true);
  };

  const openEditOverviewDialog = (overview: Overview) => {
    setCurrentOverview(overview);
    setOverviewTitle(overview.title);
    setOverviewDescription(overview.description || '');
    setIsDialogOpen(true);
  };

  const handleOverviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overviewTitle.trim()) {
      toast({ title: t('error'), description: t('toast.overview.error.titleRequired'), variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }

    setIsSubmittingOverview(true);
    const dataToSave = { title: overviewTitle, description: overviewDescription.trim() || null };
    try {
      if (currentOverview && currentOverview.id) {
        await updateOverview(currentOverview.id, dataToSave);
        toast({ title: t('success'), description: t('toast.overview.updated') });
      } else {
        await addOverview(dataToSave);
        toast({ title: t('success'), description: t('toast.overview.created') });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: t('error'), description: t('toast.overview.error.save'), variant: "destructive" });
    } finally {
      setIsSubmittingOverview(false);
    }
  };

  const handleDeleteOverview = async (overviewId: string) => {
     if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }
    setIsSubmittingOverview(true);
    try {
      await deleteOverview(overviewId);
      toast({ title: t('success'), description: t('toast.overview.deleted') });
    } catch (error) {
      toast({ title: t('error'), description: t('toast.overview.error.delete'), variant: "destructive" });
    } finally {
      setIsSubmittingOverview(false);
    }
  };

  const getTaskCountForOverview = (overviewId: string) => {
    return tasks.filter(task => task.overviewId === overviewId).length;
  };

  if (authLoading || (isLoadingOverviews && user) || (isSeeding && user)) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('overviews.list.loading')}</p>
      </div>
    );
  }

  if (!user && !authLoading) {
    return (
       <Alert variant="destructive" className="mt-8">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <UiAlertDescription>{t('auth.pleaseSignIn')}</UiAlertDescription>
        </Alert>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          <GitFork className="mr-3 h-7 w-7 text-primary/80" />
          {t('overviews.title')}
        </h1>
        {/* Button moved to FAB */}
      </div>

      {overviews.length === 0 && !isLoadingOverviews && (
        <Alert className="mt-8 border-primary/50 text-primary bg-primary/5">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">{t('overviews.list.empty.title')}</AlertTitle>
          <UiAlertDescription>
            {t('overviews.list.empty.description')}
          </UiAlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {overviews.map((overview) => (
          <Card key={overview.id} className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl flex items-center flex-grow mr-2">
                  <GitFork className="mr-2 h-5 w-5 text-primary/80 flex-shrink-0"/>
                  <span className="truncate" title={overview.title}>{overview.title}</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-7 w-7 p-1"
                  onClick={() => openEditOverviewDialog(overview)}
                  title={t('overview.item.editTitleHint')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription className="text-sm text-muted-foreground">
                  {t('overview.item.tasksCount', { count: getTaskCountForOverview(overview.id)})}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              {overview.description && (
                <div className="markdown-content text-sm text-muted-foreground line-clamp-3 max-h-[3.75rem] overflow-hidden">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{overview.description}</ReactMarkdown>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col items-end gap-2 pt-4 border-t">
              <Link href={`/${currentLocale}/overviews/${overview.id}`} passHref className="w-full">
                <Button variant="default" size="sm" className="w-full">
                  <FolderKanban className="mr-2 h-4 w-4" /> {t('overview.viewTasks')}
                </Button>
              </Link>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" className="w-full" disabled={isSubmittingOverview}>
                    <Trash2 className="mr-2 h-4 w-4" /> {t('deck.item.delete.short')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('overview.item.delete.confirm.title')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('overview.item.delete.confirm.description')}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('deck.item.delete.confirm.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDeleteOverview(overview.id)} disabled={isSubmittingOverview}>
                      {isSubmittingOverview ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      {t('deck.item.delete.confirm.delete')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{currentOverview?.id ? t('overview.form.title.edit') : t('overview.form.title.create')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleOverviewSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="overviewTitle" className="text-base">
                  {t('overview.form.label.title')}
                </Label>
                <Input
                  id="overviewTitle"
                  value={overviewTitle}
                  onChange={(e) => setOverviewTitle(e.target.value)}
                  placeholder={t('overview.form.placeholder.title')}
                  disabled={isSubmittingOverview}
                  className="text-base"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="overviewDescription" className="text-base">
                  {t('overview.form.label.description')}
                </Label>
                <Textarea
                  id="overviewDescription"
                  value={overviewDescription}
                  onChange={(e) => setOverviewDescription(e.target.value)}
                  placeholder={t('overview.form.placeholder.description')}
                  disabled={isSubmittingOverview}
                  className="min-h-[120px] text-base"
                />
                 <UiDialogDescription className="text-xs">
                  {t('task.form.placeholder.description')}
                </UiDialogDescription>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingOverview}>
                  {t('deck.item.delete.confirm.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingOverview || !overviewTitle.trim()}>
                {isSubmittingOverview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentOverview?.id ? t('overview.form.button.update') : t('overview.form.button.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant="default"
        className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
        onClick={openNewOverviewDialog}
        title={t('overviews.button.create')}
      >
        <PlusCircle className="h-7 w-7" />
      </Button>
    </>
  );
}
