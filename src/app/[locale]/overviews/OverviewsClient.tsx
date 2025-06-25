
"use client";
import React, { useState, useMemo } from 'react';
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
  DialogDescription as UiDialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Edit3, Trash2, Loader2, Info, ShieldAlert, GitFork, Eye, FolderKanban, Link2, FilePlus, ListChecks, FilePenLine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Overview, Task, ArtifactLink, Flashcard as FlashcardType, Deck } from '@/types';
import { Alert, AlertTitle, AlertDescription as UiAlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import { Dialog as SelectDialog, DialogContent as SelectDialogContent, DialogHeader as SelectDialogHeader, DialogTitle as SelectDialogTitle, DialogFooter as SelectDialogFooter } from "@/components/ui/dialog";
import { Input as SearchInput } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import FlashcardForm from '@/components/FlashcardForm';

const CustomMarkdownComponents = {
  code({ node, inline, className, children, ...props }: CodeProps) {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match && match[1] === 'mermaid') {
      return <MermaidDiagram chart={String(children).trim()} />;
    }
    if (!inline && match) {
      return (
        <pre className={className} {...props}>
          <code className={`language-${match[1]}`}>{children}</code>
        </pre>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  a({ node, ...props }: React.ComponentPropsWithoutRef<'a'>) {
    if (props.href && (props.href.startsWith('http://') || props.href.startsWith('https://'))) {
      return <a {...props} target="_blank" rel="noopener noreferrer" />;
    }
    return <a {...props} />;
  },
};

export default function OverviewsClient() {
  const { user, loading: authLoading } = useAuth();
  const { 
    overviews, addOverview, updateOverview, deleteOverview, isLoadingOverviews, isSeeding, tasks,
    getFlashcardById, addFlashcard, updateFlashcard, decks, isLoadingDecks, flashcards: allFlashcardsFromContext 
  } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentOverview, setCurrentOverview] = useState<Partial<Overview> | null>(null);
  const [overviewTitle, setOverviewTitle] = useState('');
  const [overviewDescription, setOverviewDescription] = useState('');
  const [overviewArtifactLink, setOverviewArtifactLink] = useState<ArtifactLink | null>(null);
  const [isSubmittingOverview, setIsSubmittingOverview] = useState(false);

  // State for linked flashcard UI
  const [linkedFlashcard, setLinkedFlashcard] = React.useState<FlashcardType | null | undefined>(undefined);
  const [isFetchingFlashcard, setIsFetchingFlashcard] = React.useState(false);
  const [isNewFlashcardDialogOpen, setIsNewFlashcardDialogOpen] = React.useState(false);
  const [isSubmittingNewFlashcard, setIsSubmittingNewFlashcard] = React.useState(false);
  const [isEditFlashcardDialogOpen, setIsEditFlashcardDialogOpen] = React.useState(false);
  const [editingFlashcardData, setEditingFlashcardData] = React.useState<FlashcardType | null>(null);
  const [isSubmittingEditedFlashcard, setIsSubmittingEditedFlashcard] = React.useState(false);
  const [isSelectFlashcardDialogOpen, setIsSelectFlashcardDialogOpen] = React.useState(false);

  React.useEffect(() => {
    const fetchCard = async () => {
        if (overviewArtifactLink?.flashcardId) {
            setIsFetchingFlashcard(true);
            const card = getFlashcardById(overviewArtifactLink.flashcardId);
            setLinkedFlashcard(card || null);
            setIsFetchingFlashcard(false);
        } else {
            setLinkedFlashcard(null);
        }
    };
    fetchCard();
  }, [overviewArtifactLink?.flashcardId, getFlashcardById]);

  const openNewOverviewDialog = () => {
    setCurrentOverview(null);
    setOverviewTitle('');
    setOverviewDescription('');
    setOverviewArtifactLink(null);
    setIsDialogOpen(true);
  };

  const openEditOverviewDialog = (overview: Overview) => {
    setCurrentOverview(overview);
    setOverviewTitle(overview.title);
    setOverviewDescription(overview.description || '');
    setOverviewArtifactLink(overview.artifactLink || null);
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
    const dataToSave = { title: overviewTitle, description: overviewDescription.trim() || null, artifactLink: overviewArtifactLink };
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

  // Flashcard linking handlers
  const handleRemoveLink = () => {
    setOverviewArtifactLink(null);
    toast({ title: t('success'), description: t('toast.task.linkRemoved') });
  };

  const handleNewFlashcardSubmit = async (data: { front: string; back: string; deckId?: string | null }) => {
    setIsSubmittingNewFlashcard(true);
    try {
      const newCard = await addFlashcard(data);
      if (newCard && newCard.id) {
        setOverviewArtifactLink({ flashcardId: newCard.id });
        toast({ title: t('success'), description: t('toast.task.flashcardLinked') });
        setIsNewFlashcardDialogOpen(false);
      } else {
        throw new Error("Failed to create flashcard or get ID.");
      }
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.flashcardLinkFailed'), variant: 'destructive' });
    } finally {
      setIsSubmittingNewFlashcard(false);
    }
  };
  
  const handleEditFlashcardSubmit = async (data: { front: string; back: string; deckId?: string | null }) => {
    if (!editingFlashcardData || !editingFlashcardData.id) return;
    setIsSubmittingEditedFlashcard(true);
    try {
      await updateFlashcard(editingFlashcardData.id, data);
      toast({ title: t('success'), description: t('toast.flashcard.updated') });
      if (overviewArtifactLink?.flashcardId) {
        const updatedCard = getFlashcardById(overviewArtifactLink.flashcardId);
        setLinkedFlashcard(updatedCard || null);
      }
      setIsEditFlashcardDialogOpen(false);
      setEditingFlashcardData(null);
    } catch (error) {
      toast({ title: t('error'), description: t('toast.flashcard.error.save'), variant: 'destructive' });
    } finally {
      setIsSubmittingEditedFlashcard(false);
    }
  };

  const handleSelectFlashcardFromDialog = (flashcardId: string) => {
    setOverviewArtifactLink({ flashcardId: flashcardId });
    toast({ title: t('success'), description: t('toast.task.flashcardSelected') });
    setIsSelectFlashcardDialogOpen(false);
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
        <Button onClick={openNewOverviewDialog} title={t('overviews.button.create')}>
            <PlusCircle className="mr-2 h-4 w-4" /> {t('overviews.button.create')}
        </Button>
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
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{overview.description}</ReactMarkdown>
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
            <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
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

              {/* Flashcard Linking UI */}
              <div className="space-y-1.5">
                  <Label className="text-base flex items-center">
                      <Link2 className="mr-2 h-4 w-4 text-muted-foreground" />
                      {t('overview.form.artifactLink.sectionTitle')}
                  </Label>
                  <div className="p-3 border rounded-md space-y-3 text-sm">
                      {isFetchingFlashcard && overviewArtifactLink?.flashcardId && (
                          <div className="flex items-center text-muted-foreground">
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              {t('task.form.artifactLink.loadingFlashcard')}
                          </div>
                      )}
                      {!isFetchingFlashcard && overviewArtifactLink?.flashcardId && linkedFlashcard && (
                           <div className="flex items-center justify-between text-sm">
                              <span className="font-medium mr-1 text-foreground whitespace-nowrap">{t('task.form.artifactLink.flashcardPrefix')}</span>
                              <p className="text-primary truncate" title={linkedFlashcard.front}>
                                  {linkedFlashcard.front}
                              </p>
                              <div className="flex gap-1 flex-shrink-0 ml-2">
                                  <Button type="button" variant="ghost" size="xsIcon" onClick={() => { setEditingFlashcardData(linkedFlashcard); setIsEditFlashcardDialogOpen(true); }} title={t('task.form.artifactLink.button.editLinkedFlashcard')}>
                                      <FilePenLine className="h-4 w-4" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="xsIcon" onClick={() => setIsSelectFlashcardDialogOpen(true)} title={t('task.form.artifactLink.button.change')}>
                                      <ListChecks className="h-4 w-4" />
                                  </Button>
                                  <Button type="button" variant="ghost" size="xsIcon" onClick={handleRemoveLink} title={t('task.form.artifactLink.button.remove')}>
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                              </div>
                          </div>
                      )}
                       {!isFetchingFlashcard && overviewArtifactLink?.flashcardId && !linkedFlashcard && (
                          <div className="space-y-1 text-sm text-destructive">
                             <p>{t('task.form.artifactLink.flashcardNotFound')}</p>
                          </div>
                      )}

                      {!overviewArtifactLink?.flashcardId && (
                          <div className="flex flex-wrap gap-2 pt-1">
                               <Button type="button" variant="outline" size="xs" onClick={() => setIsNewFlashcardDialogOpen(true)}>
                                   <FilePlus className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.newFlashcard')}
                               </Button>
                              <Button type="button" variant="outline" size="xs" onClick={() => setIsSelectFlashcardDialogOpen(true)}>
                                 <ListChecks className="mr-1 h-3 w-3" /> {t('task.form.artifactLink.button.selectFlashcard')}
                              </Button>
                          </div>
                      )}
                  </div>
              </div>
            </div>
            <DialogFooter className="pt-4 border-t">
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
      
      {/* Dialogs for Flashcard Linking */}
      <Dialog open={isNewFlashcardDialogOpen} onOpenChange={setIsNewFlashcardDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
                <DialogTitle>{t('task.form.artifactLink.dialog.newFlashcard.title')}</DialogTitle>
                <UiDialogDescription>
                  {t('task.form.artifactLink.dialog.newFlashcard.description')}
                </UiDialogDescription>
            </DialogHeader>
            <FlashcardForm
                onSubmit={handleNewFlashcardSubmit}
                decks={decks || []}
                isLoading={isSubmittingNewFlashcard}
                isLoadingDecks={isLoadingDecks}
                submitButtonTextKey="flashcard.form.button.create"
                onCancel={() => setIsNewFlashcardDialogOpen(false)}
                cancelButtonTextKey="deck.item.delete.confirm.cancel"
            />
        </DialogContent>
      </Dialog>

      {editingFlashcardData && (
        <Dialog open={isEditFlashcardDialogOpen} onOpenChange={(open) => {
          setIsEditFlashcardDialogOpen(open);
          if (!open) setEditingFlashcardData(null);
        }}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>{t('task.form.artifactLink.dialog.editFlashcard.title')}</DialogTitle>
              <UiDialogDescription>{t('task.form.artifactLink.dialog.editFlashcard.description')}</UiDialogDescription>
            </DialogHeader>
            <FlashcardForm
              initialData={editingFlashcardData}
              onSubmit={handleEditFlashcardSubmit}
              decks={decks || []}
              isLoading={isSubmittingEditedFlashcard}
              isLoadingDecks={isLoadingDecks}
              submitButtonTextKey="flashcard.form.button.update"
              onCancel={() => { setIsEditFlashcardDialogOpen(false); setEditingFlashcardData(null); }}
              cancelButtonTextKey="deck.item.delete.confirm.cancel"
            />
          </DialogContent>
        </Dialog>
      )}

      <SelectFlashcardDialog
        isOpen={isSelectFlashcardDialogOpen}
        onOpenChange={setIsSelectFlashcardDialogOpen}
        onSelect={handleSelectFlashcardFromDialog}
        allFlashcards={allFlashcardsFromContext}
        t={t}
      />
    </>
  );
}

interface SelectFlashcardDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (flashcardId: string) => void;
  allFlashcards: FlashcardType[];
  t: (key: any, params?: any) => string;
}

function SelectFlashcardDialog({ isOpen, onOpenChange, onSelect, allFlashcards, t }: SelectFlashcardDialogProps) {
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredFlashcards = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return [...allFlashcards]
        .sort((a, b) => (new Date(b.createdAt || 0).getTime()) - (new Date(a.createdAt || 0).getTime()))
        .slice(0, 10);
    }
    return allFlashcards.filter(
      (card) =>
        card.front.toLowerCase().includes(searchTerm.toLowerCase()) ||
        card.back.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 20);
  }, [allFlashcards, searchTerm]);

  return (
    <SelectDialog open={isOpen} onOpenChange={onOpenChange}>
      <SelectDialogContent className="sm:max-w-lg">
        <SelectDialogHeader>
          <SelectDialogTitle>{t('task.form.artifactLink.dialog.selectFlashcard.title')}</SelectDialogTitle>
        </SelectDialogHeader>
        <div className="py-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <SearchInput
              type="search"
              placeholder={t('task.form.artifactLink.dialog.selectFlashcard.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <ScrollArea className="h-[300px] w-full">
            {filteredFlashcards.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {t('task.form.artifactLink.dialog.selectFlashcard.noFlashcardsFound')}
              </p>
            ) : (
              <div className="space-y-2">
                {filteredFlashcards.map((card) => (
                  <Button
                    key={card.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-2"
                    onClick={() => onSelect(card.id)}
                  >
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="block font-medium truncate" title={card.front}>{card.front}</span>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
        <SelectDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('deck.item.delete.confirm.cancel')}
          </Button>
        </SelectDialogFooter>
      </SelectDialogContent>
    </SelectDialog>
  );
}
