
"use client";
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Flashcard, PerformanceRating, Deck } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle2, SkipForward, RotateCcw, PlayCircle, ThumbsUp, PlusCircle, Layers, LayoutDashboard, Loader2, ShieldAlert, Volume2, Library, ListChecks, Brain, FileText, ArrowLeft } from 'lucide-react';
import { formatISO, addDays } from 'date-fns';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import MarkmapRenderer from '@/components/MarkmapRenderer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import TaskForm, { type TaskFormData } from '@/components/TaskForm';


const MASTERED_MULTIPLIER = 2;
const LATER_MULTIPLIER = 1.3;
const TRY_AGAIN_INTERVAL = 1; // 1 day
const MIN_INTERVAL = 1; // 1 day
const MAX_INTERVAL = 365; // 1 year

const SESSION_STORAGE_PREFIX = 'flashflow_review_';
const SS_DECK_ID = `${SESSION_STORAGE_PREFIX}deckId`;
const SS_IS_SESSION_STARTED = `${SESSION_STORAGE_PREFIX}isSessionStarted`;
const SS_CARD_ID = `${SESSION_STORAGE_PREFIX}cardId`;
const SS_IS_FLIPPED = `${SESSION_STORAGE_PREFIX}isFlipped`;
const SS_SESSION_TYPE = `${SESSION_STORAGE_PREFIX}sessionType`;
const SS_QUEUE_IDS = `${SESSION_STORAGE_PREFIX}queueIds`; // For preserving shuffled order

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


export default function ReviewModeClient() {
  const { user, loading: authLoading } = useAuth();
  const { 
    getReviewQueue, updateFlashcard, flashcards: allFlashcardsFromContext, 
    isLoading: contextLoading, isSeeding, getDeckById, decks, addTask 
  } = useFlashcards();
  
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [currentSessionType, setCurrentSessionType] = useState<'spaced' | 'all' | null>(null);
  
  const [isMindmapFullscreen, setIsMindmapFullscreen] = useState(false);
  const [mindmapDataForFullscreen, setMindmapDataForFullscreen] = useState<string | null>(null);
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);

  const restorationAttempted = useRef(false);
  
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deckIdFromParams = searchParams.get('deckId');
  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);

  const currentCard = reviewQueue[currentCardIndex];

  useEffect(() => {
    if (deckIdFromParams && !contextLoading) {
      const deck = getDeckById(deckIdFromParams);
      if (deck) {
        setCurrentDeck(deck);
      } else {
        if (decks.length > 0 && !deck){ 
             toast({ title: t('error'), description: t('toast.deck.error.load'), variant: 'destructive' });
             router.push(`/${currentLocale}/decks`);
        }
      }
    } else if (!deckIdFromParams) {
      setCurrentDeck(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdFromParams, getDeckById, contextLoading, toast, router, currentLocale, t, decks]); 

  const allCardsForCurrentScope = useMemo(() => {
    if (!deckIdFromParams) return allFlashcardsFromContext;
    return allFlashcardsFromContext.filter(card => card.deckId === deckIdFromParams);
  }, [allFlashcardsFromContext, deckIdFromParams]);

  const dueCardsForCurrentScope = useMemo(() => {
    const allDueCards = getReviewQueue();
    if (!deckIdFromParams) return allDueCards;
    return allDueCards.filter(card => card.deckId === deckIdFromParams);
  }, [getReviewQueue, deckIdFromParams]);

  const startReviewSession = useCallback((
    type: 'spaced' | 'all',
  ) => {
    if (contextLoading || !user) return;
    
    // Clear any previous session data when explicitly starting a new session.
    sessionStorage.removeItem(SS_DECK_ID);
    sessionStorage.removeItem(SS_IS_SESSION_STARTED);
    sessionStorage.removeItem(SS_CARD_ID);
    sessionStorage.removeItem(SS_IS_FLIPPED);
    sessionStorage.removeItem(SS_SESSION_TYPE);
    sessionStorage.removeItem(SS_QUEUE_IDS);

    restorationAttempted.current = true; // Mark as "attempted" so a refresh doesn't try to restore this new session

    let queueToSet: Flashcard[];
    if (type === 'spaced') {
      if (dueCardsForCurrentScope.length === 0) return;
      queueToSet = dueCardsForCurrentScope;
    } else {
      if (allCardsForCurrentScope.length === 0) return;
      queueToSet = [...allCardsForCurrentScope].sort(() => Math.random() - 0.5);
    }

    setReviewQueue(queueToSet);
    setCurrentSessionType(type);
    setIsSessionStarted(true);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [contextLoading, user, dueCardsForCurrentScope, allCardsForCurrentScope]);

  useEffect(() => {
    // Exit conditions: already restored, essential data is loading, or not in a browser context.
    if (restorationAttempted.current || authLoading || contextLoading || !user || typeof window === 'undefined') {
        return;
    }

    // Critical check: Do not attempt to restore until the flashcard data from the context is available.
    // This prevents the race condition where restoration fails because the card list is empty.
    if (allFlashcardsFromContext.length === 0 && dueCardsForCurrentScope.length === 0) {
        // If there are cards to be loaded, wait for the next render when allFlashcardsFromContext is populated.
        // If we know there are truly no cards for this user, we can proceed.
        // For simplicity, we just wait. The contextLoading flag helps, but this is a final check.
        restorationAttempted.current = true; // No cards to restore from, don't try again.
        return;
    }

    const savedIsSessionStarted = sessionStorage.getItem(SS_IS_SESSION_STARTED);
    if (savedIsSessionStarted !== 'true') {
      // No active session to restore. Mark as attempted to prevent re-checking on this page load.
      restorationAttempted.current = true;
      return;
    }
    restorationAttempted.current = true; // Attempt restoration only once.


    // --- At this point, we have data and believe a session needs to be restored ---
    const savedDeckId = sessionStorage.getItem(SS_DECK_ID);
    if ((deckIdFromParams || null) !== (savedDeckId || null)) {
      // This saved session is for a different deck or scope. Ignore it.
      return;
    }

    // Read the rest of the session data from storage
    const savedCardId = sessionStorage.getItem(SS_CARD_ID);
    const savedIsFlippedStr = sessionStorage.getItem(SS_IS_FLIPPED);
    const savedSessionType = sessionStorage.getItem(SS_SESSION_TYPE) as 'spaced' | 'all' | null;
    const savedQueueIds = sessionStorage.getItem(SS_QUEUE_IDS);

    if (savedSessionType && savedQueueIds) {
        try {
            const parsedIds = JSON.parse(savedQueueIds);
            if (!Array.isArray(parsedIds)) {
              throw new Error("Saved queue is not an array");
            }
            
            // Reconstruct the queue from the full list of cards, preserving the original order
            const restoredQueue = parsedIds
              .map(id => allFlashcardsFromContext.find(c => c.id === id))
              .filter((c): c is Flashcard => !!c); // Filter out any cards that might have been deleted

            // Only restore if we could successfully find all the cards in the saved queue
            if (restoredQueue.length > 0 && restoredQueue.length === parsedIds.length) {
              const restoredIndex = restoredQueue.findIndex(c => c.id === savedCardId);
              
              // Set all state variables to restore the session
              setReviewQueue(restoredQueue);
              setCurrentCardIndex(restoredIndex !== -1 ? restoredIndex : 0);
              setIsFlipped(savedIsFlippedStr === 'true');
              setCurrentSessionType(savedSessionType);
              setIsSessionStarted(true); // This is what shows the review card view instead of the "Ready" screen
            }
        } catch (e) {
          console.error("Failed to parse or restore review queue from sessionStorage:", e);
        }
    }
  }, [deckIdFromParams, user, authLoading, contextLoading, allFlashcardsFromContext, dueCardsForCurrentScope]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleSpeak = (text: string, lang?: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (lang) {
        utterance.lang = lang;
      }
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Speech Error",
        description: "Your browser does not support text-to-speech.",
        variant: "destructive",
      });
    }
  };

  const detectLanguage = (text: string) => {
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return 'zh-CN';
    }
    return 'en-US';
  };

  const handleProgress = (performance: PerformanceRating) => {
    if (!currentCard || !user) return;

    setIsSubmittingProgress(true); 
    const cardToUpdateId = currentCard.id;
    
    if (currentCardIndex < reviewQueue.length - 1) {
      setCurrentCardIndex(currentCardIndex + 1);
      setIsFlipped(false);
    } else {
      setReviewQueue([]);
      setIsSessionStarted(false);
      setCurrentSessionType(null);
    }

    (async () => {
      try {
        const currentDate = new Date();
        const cardForCalc = allFlashcardsFromContext.find(c => c.id === cardToUpdateId) || currentCard;

        let newInterval: number;
        let currentCardInterval = cardForCalc.interval > 0 ? cardForCalc.interval : 1;

        switch (performance) {
          case 'Mastered':
            newInterval = Math.round(currentCardInterval * MASTERED_MULTIPLIER);
            break;
          case 'Later':
            newInterval = Math.round(currentCardInterval * LATER_MULTIPLIER);
            break;
          case 'Try Again':
          default:
            newInterval = TRY_AGAIN_INTERVAL;
            break;
        }

        newInterval = Math.max(MIN_INTERVAL, Math.min(newInterval, MAX_INTERVAL));
        const nextReviewDate = addDays(currentDate, newInterval);
        const nextReviewDateString = formatISO(nextReviewDate, { representation: 'date' });
        const lastReviewedDateString = formatISO(currentDate, { representation: 'date' });
        const newStatus = performance === 'Mastered' ? 'mastered' : 'learning';

        await updateFlashcard(cardToUpdateId, {
          lastReviewed: lastReviewedDateString,
          nextReviewDate: nextReviewDateString,
          interval: newInterval,
          status: newStatus,
        });
        
      } catch (error) {
        console.error("Error updating flashcard schedule:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        toast({
          title: t('error'),
          description: t('toast.progress.error', {errorMessage}),
          variant: "destructive",
        });
      } finally {
        setIsSubmittingProgress(false); 
      }
    })();
  };

  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const handleCreateTaskSubmit = async (data: TaskFormData) => {
    setIsSubmittingTask(true);
    try {
      await addTask(data);
      toast({ title: t('success'), description: t('toast.task.created') });
      setIsCreateTaskOpen(false);
    } catch (error) {
      toast({ title: t('error'), description: t('toast.task.error.save'), variant: 'destructive' });
    } finally {
      setIsSubmittingTask(false);
    }
  };


  if (authLoading || (contextLoading && user && !isSessionStarted) || (isSeeding && user)) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">{t('review.loading')}</p>
      </div>
    );
  }

  if (!user && !authLoading) {
     return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <Alert variant="destructive" className="mt-8">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isMindmapFullscreen && mindmapDataForFullscreen) {
    return (
      <div className="fixed inset-0 z-[60] flex flex-col bg-background p-4 sm:p-6">
        <div className="mb-4 flex items-center">
          <Button variant="outline" onClick={() => setIsMindmapFullscreen(false)}>
            <ArrowLeft className="mr-2 h-4 w-4" /> {t('flashcard.form.page.button.back')}
          </Button>
        </div>
        <div className="flex-grow overflow-auto rounded-md border bg-card">
          <MarkmapRenderer markdownContent={mindmapDataForFullscreen} />
        </div>
      </div>
    );
  }


  if (!isSessionStarted) {
    if (allCardsForCurrentScope.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center pb-20">
          <ThumbsUp className="w-24 h-24 text-green-500 mb-6" />
          <h2 className="text-3xl font-semibold mb-4">
            {currentDeck ? t('review.noCardsInDeck.title') : t('review.noCards.title')}
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            {currentDeck ? t('review.noCardsInDeck.description') : t('review.noCards.description')}
          </p>
          <Link href={currentDeck ? `/${currentLocale}/flashcards/new?deckId=${currentDeck.id}` : `/${currentLocale}/flashcards/new`} passHref>
            <Button size="lg" className="text-xl py-8 px-10 shadow-lg">
              <PlusCircle className="mr-3 h-6 w-6" /> {t('review.noCards.button.create')}
            </Button>
          </Link>
           {currentDeck && (
             <Link href={`/${currentLocale}/decks`} passHref className="mt-4">
                <Button variant="outline" size="lg">
                    <Library className="mr-3 h-6 w-6" /> {t('review.sessionComplete.button.backToDecks')}
                </Button>
            </Link>
           )}
          <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
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
                onSubmit={handleCreateTaskSubmit}
                isLoading={isSubmittingTask}
                onCancel={() => setIsCreateTaskOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center pb-20">
        <PlayCircle className="w-24 h-24 text-primary mb-6" />
        <h2 className="text-3xl font-semibold mb-4">
          {currentDeck ? t('review.ready.title.deck', {deckName: currentDeck.name}) : t('review.ready.title')}
        </h2>

        {dueCardsForCurrentScope.length > 0 ? (
          <p className="text-muted-foreground mb-4 text-lg">
             {currentDeck
                ? t('review.ready.due.text.deck', { count: dueCardsForCurrentScope.length })
                : t('review.ready.due.text', { count: dueCardsForCurrentScope.length })}
          </p>
        ) : (
          <p className="text-muted-foreground mb-4 text-lg">
            {currentDeck ? t('review.ready.due.none.deck') : t('review.ready.due.none')}
          </p>
        )}

        <Button
          size="lg"
          onClick={() => startReviewSession('spaced')}
          className="text-xl py-6 px-8 shadow-lg mb-4 w-full max-w-xs sm:max-w-sm md:max-w-md"
          disabled={dueCardsForCurrentScope.length === 0}
        >
          <PlayCircle className="mr-3 h-6 w-6" />
          {t('review.button.startSpaced', { count: dueCardsForCurrentScope.length })}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => startReviewSession('all')}
          className="text-xl py-6 px-8 shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md"
          disabled={allCardsForCurrentScope.length === 0}
        >
          <Layers className="mr-3 h-6 w-6" />
          {t('review.button.reviewAll', { count: allCardsForCurrentScope.length })}
        </Button>
         {dueCardsForCurrentScope.length === 0 && allCardsForCurrentScope.length > 0 && (
             <p className="text-muted-foreground mt-8 text-sm">
                {currentDeck ? t('review.tip.noSpacedRepetition.deck') : t('review.tip.noSpacedRepetition')}
            </p>
        )}
        <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
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
                onSubmit={handleCreateTaskSubmit}
                isLoading={isSubmittingTask}
                onCancel={() => setIsCreateTaskOpen(false)}
              />
            </DialogContent>
          </Dialog>
      </div>
    );
  }

  if (reviewQueue.length === 0 && isSessionStarted) { 
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center pb-20">
        <ThumbsUp className="w-24 h-24 text-green-500 mb-6" />
        <h2 className="text-3xl font-semibold mb-4">
            {currentDeck ? t('review.sessionComplete.title.deck') : t('review.sessionComplete.title')}
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">
            {currentDeck ? t('review.sessionComplete.description.deck') : t('review.sessionComplete.description')}
        </p>
        <div className="flex flex-col items-center gap-4 w-full max-w-xs sm:max-w-sm md:max-w-md">
          <Button
            size="lg"
            onClick={() => startReviewSession('spaced')}
            className="w-full"
            disabled={dueCardsForCurrentScope.length === 0}
          >
            <PlayCircle className="mr-3 h-6 w-6" />
            {t('review.button.startSpaced', { count: dueCardsForCurrentScope.length })}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => startReviewSession('all')}
            className="w-full"
            disabled={allCardsForCurrentScope.length === 0}
          >
            <Layers className="mr-3 h-6 w-6" />
            {currentDeck
                ? t('review.sessionComplete.button.reviewDeckAgain', { count: allCardsForCurrentScope.length })
                : t('review.sessionComplete.button.reviewAllAgain', { count: allCardsForCurrentScope.length })}
          </Button>
          <Link href={currentDeck ? `/${currentLocale}/decks` : `/${currentLocale}/flashcards-hub`} passHref className="w-full">
            <Button size="lg" variant="secondary" className="w-full">
               <LayoutDashboard className="mr-3 h-6 w-6" />
              {currentDeck ? t('review.sessionComplete.button.backToDecks') : t('review.sessionComplete.button.backToDashboard')}
            </Button>
          </Link>
        </div>
        <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
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
                onSubmit={handleCreateTaskSubmit}
                isLoading={isSubmittingTask}
                onCancel={() => setIsCreateTaskOpen(false)}
              />
            </DialogContent>
          </Dialog>
      </div>
    );
  }

  if (!currentCard && isSessionStarted && reviewQueue.length > 0) {
    return (
      <div className="flex justify-center items-center mt-10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">{t('review.loadingCard')}</p>
      </div>
    );
  }
  
  if (!currentCard) { 
      return (
        <div className="flex justify-center items-center mt-10 text-muted-foreground">
            <p>{t('review.loading')}</p> 
        </div>
      );
  }

  const progressOptions: { labelKey: keyof typeof import('@/lib/i18n/locales/en').default; rating: PerformanceRating; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null | undefined }[] = [
    { labelKey: 'review.button.progress.tryAgain', rating: 'Try Again', icon: RotateCcw, variant: 'destructive' },
    { labelKey: 'review.button.progress.later', rating: 'Later', icon: SkipForward, variant: 'secondary' },
    { labelKey: 'review.button.progress.mastered', rating: 'Mastered', icon: CheckCircle2, variant: 'default' },
  ];

  const frontCardText = currentCard.front;
  const backCardText = currentCard.back;
  const frontCardLang = detectLanguage(frontCardText);
  const backCardLang = detectLanguage(backCardText);

  return (
    <div className="flex flex-col items-center pt-2 flex-1 overflow-y-auto pb-20">
      <p className="text-muted-foreground mb-4">{t('review.cardProgress', { currentIndex: currentCardIndex + 1, totalCards: reviewQueue.length })}</p>
      <Card className="w-full max-w-3xl min-h-[350px] flex flex-col shadow-xl transition-all duration-500 ease-in-out transform hover:scale-[1.01]">
        <CardHeader className="flex items-center justify-center p-4 sm:p-6">
          <div className="flex items-start w-full">
            <div className="flex-grow markdown-content whitespace-pre-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>
                  {frontCardText}
                </ReactMarkdown>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-4 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleSpeak(frontCardText, frontCardLang);
              }}
              title={t('review.speakContent' as any, { defaultValue: "Speak content"})}
              disabled={isSubmittingProgress}
            >
              <Volume2 className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 border-t flex-grow">
          <Button onClick={handleFlip} variant="outline" className="w-full text-lg py-6 mb-6" disabled={isSubmittingProgress}>
            <RefreshCw className={`mr-2 h-5 w-5 ${isFlipped ? 'animate-pulse' : ''}`} />
            {isFlipped ? t('review.button.flip.showQuestion') : t('review.button.flip.showAnswer')}
          </Button>
          
          {isFlipped && (
            <>
              <div className="flex justify-between items-center mt-2 mb-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                        setMindmapDataForFullscreen(currentCard.back);
                        setIsMindmapFullscreen(true);
                    }}
                    title={t('review.button.openMindmap')}
                    disabled={isSubmittingProgress}
                    className="text-sm"
                >
                    <Brain className="mr-2 h-4 w-4" />
                    {t('review.button.openMindmap')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(backCardText, backCardLang);
                  }}
                  title={t('review.speakContent' as any, { defaultValue: "Speak content"})}
                  disabled={isSubmittingProgress}
                >
                  <Volume2 className="h-6 w-6" />
                </Button>
              </div>

              <div className="mt-4 markdown-content whitespace-pre-wrap">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>
                      {currentCard.back}
                  </ReactMarkdown>
              </div>
            </>
           )}
        </CardContent>

        {isFlipped && (
          <CardFooter className="grid grid-cols-3 gap-3 p-4 sm:p-6 border-t">
            {progressOptions.map(opt => (
              <Button
                key={opt.rating}
                onClick={() => handleProgress(opt.rating)}
                variant={opt.variant}
                className="text-sm sm:text-base py-4 h-auto"
                disabled={isSubmittingProgress} 
              >
                {isSubmittingProgress && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <opt.icon className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> {t(opt.labelKey)}
              </Button>
            ))}
          </CardFooter>
        )}
      </Card>
      {user && (
          <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="default"
                    className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
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
                onSubmit={handleCreateTaskSubmit}
                isLoading={isSubmittingTask}
                onCancel={() => setIsCreateTaskOpen(false)}
              />
            </DialogContent>
          </Dialog>
      )}
    </div>
  );
}
    

    






