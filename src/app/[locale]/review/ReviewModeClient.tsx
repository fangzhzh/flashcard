
"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Flashcard, PerformanceRating, Deck } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle2, SkipForward, RotateCcw, PlayCircle, ThumbsUp, PlusCircle, Layers, LayoutDashboard, Loader2, ShieldAlert, Volume2, Library, ListChecks } from 'lucide-react';
import { formatISO, addDays } from 'date-fns';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';


const MASTERED_MULTIPLIER = 2;
const LATER_MULTIPLIER = 1.3;
const TRY_AGAIN_INTERVAL = 1; // 1 day
const MIN_INTERVAL = 1; // 1 day
const MAX_INTERVAL = 365; // 1 year

const SESSION_STORAGE_PREFIX = 'flashflow_review_';
const SS_DECK_ID = `${SESSION_STORAGE_PREFIX}deckId`;
const SS_IS_SESSION_STARTED = `${SESSION_STORAGE_PREFIX}isSessionStarted`;
const SS_CARD_INDEX = `${SESSION_STORAGE_PREFIX}cardIndex`;
const SS_IS_FLIPPED = `${SESSION_STORAGE_PREFIX}isFlipped`;
const SS_SESSION_TYPE = `${SESSION_STORAGE_PREFIX}sessionType`;

export default function ReviewModeClient() {
  const { user, loading: authLoading } = useAuth();
  const { getReviewQueue, updateFlashcard, flashcards: allFlashcardsFromContext, isLoading: contextLoading, isSeeding, getDeckById } = useFlashcards();
  
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const [currentSessionType, setCurrentSessionType] = useState<'spaced' | 'all' | null>(null);
  
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const pathname = usePathname();
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
        if (decks.length > 0 && !deck){ // Only redirect if decks are loaded and deck not found
             toast({ title: t('error'), description: t('toast.deck.error.load'), variant: 'destructive' });
             router.push(`/${currentLocale}/decks`);
        }
      }
    } else if (!deckIdFromParams) {
      setCurrentDeck(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdFromParams, getDeckById, contextLoading, toast, router, currentLocale, t, allFlashcardsFromContext]); // `decks` from useFlashcards implies it's available

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
    options?: { restoredCardIndex?: number; restoredIsFlipped?: boolean }
  ) => {
    if (contextLoading || !user) return;

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

    const initialCardIndex = (options?.restoredCardIndex !== undefined && options.restoredCardIndex >= 0 && options.restoredCardIndex < queueToSet.length)
      ? options.restoredCardIndex
      : 0;
    setCurrentCardIndex(initialCardIndex);

    const initialIsFlipped = options?.restoredIsFlipped !== undefined ? options.restoredIsFlipped : false;
    setIsFlipped(initialIsFlipped);

  }, [contextLoading, user, dueCardsForCurrentScope, allCardsForCurrentScope, setReviewQueue, setCurrentSessionType, setIsSessionStarted, setCurrentCardIndex, setIsFlipped]);

  // Effect for restoring session state after returning from task creation
  useEffect(() => {
    if (authLoading || contextLoading || !user) { // Wait for user and context data
        return;
    }

    const savedDeckId = sessionStorage.getItem(SS_DECK_ID);
    const savedIsSessionStarted = sessionStorage.getItem(SS_IS_SESSION_STARTED);
    const savedCardIndexStr = sessionStorage.getItem(SS_CARD_INDEX);
    const savedIsFlippedStr = sessionStorage.getItem(SS_IS_FLIPPED);
    const savedSessionType = sessionStorage.getItem(SS_SESSION_TYPE) as 'spaced' | 'all' | null;

    // Clear storage items immediately after reading
    sessionStorage.removeItem(SS_DECK_ID);
    sessionStorage.removeItem(SS_IS_SESSION_STARTED);
    sessionStorage.removeItem(SS_CARD_INDEX);
    sessionStorage.removeItem(SS_IS_FLIPPED);
    sessionStorage.removeItem(SS_SESSION_TYPE);

    if (
      savedIsSessionStarted === 'true' &&
      (deckIdFromParams || null) === (savedDeckId || null) && // Compare potentially null deckIds
      savedSessionType
    ) {
      const restoredCardIndex = savedCardIndexStr ? parseInt(savedCardIndexStr, 10) : 0;
      const restoredIsFlipped = savedIsFlippedStr === 'true';
      
      // Defer starting the session slightly if allCardsForCurrentScope might not be ready
      // This assumes allCardsForCurrentScope/dueCardsForCurrentScope are populated by FlashcardsContext
      // If still issues, a small timeout might be needed, or a more complex state machine.
      if( (savedSessionType === 'all' && allCardsForCurrentScope.length > 0) ||
          (savedSessionType === 'spaced' && dueCardsForCurrentScope.length > 0) ||
          (!deckIdFromParams && savedSessionType === 'all' && allFlashcardsFromContext.length > 0) || // Global review all
          (!deckIdFromParams && savedSessionType === 'spaced' && getReviewQueue().length > 0) // Global spaced review
      ) {
        startReviewSession(savedSessionType, { restoredCardIndex, restoredIsFlipped });
      } else {
        // Fallback: if expected cards aren't there (e.g., context reloaded differently), don't start.
        // This might happen if the number of cards changed while user was away.
        setIsSessionStarted(false);
        setCurrentSessionType(null);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckIdFromParams, user, authLoading, contextLoading, startReviewSession, allCardsForCurrentScope.length, dueCardsForCurrentScope.length, getReviewQueue().length]);


  const handleCreateTaskNavigation = () => {
    if (!user) {
        toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
        return;
    }
    sessionStorage.setItem(SS_DECK_ID, deckIdFromParams || ''); // Store empty string if null/undefined
    sessionStorage.setItem(SS_IS_SESSION_STARTED, String(isSessionStarted));
    sessionStorage.setItem(SS_CARD_INDEX, String(currentCardIndex));
    sessionStorage.setItem(SS_IS_FLIPPED, String(isFlipped));
    if (currentSessionType) {
        sessionStorage.setItem(SS_SESSION_TYPE, currentSessionType);
    }

    const currentPathWithoutLocale = pathname.replace(`/${currentLocale}`, '') || '/';
    const currentQueryString = searchParams.toString();
    const returnToPath = currentPathWithoutLocale + (currentQueryString ? `?${currentQueryString}` : '');
    router.push(`/${currentLocale}/tasks/new?returnTo=${encodeURIComponent(returnToPath)}`);
  };

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

  const handleProgress = async (performance: PerformanceRating) => {
    if (!currentCard || !user) return;

    setIsSubmittingProgress(true);
    try {
      const currentDate = new Date();
      let newInterval: number;
      let currentCardInterval = currentCard.interval > 0 ? currentCard.interval : 1;

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

      await updateFlashcard(currentCard.id, {
        lastReviewed: lastReviewedDateString,
        nextReviewDate: nextReviewDateString,
        interval: newInterval,
        status: newStatus,
      });

      if (currentCardIndex < reviewQueue.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setIsFlipped(false);
      } else {
        setReviewQueue([]);
        setIsSessionStarted(false);
        setCurrentSessionType(null);
      }
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
  };

  if (authLoading || (contextLoading && user && !isSessionStarted) || (isSeeding && user)) { 
    // Added !isSessionStarted to allow active session to bypass this global loading
    // if context is still considered loading but session was restored.
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
          <Button
              variant="default"
              className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
              title={t('tasks.button.create')}
              onClick={handleCreateTaskNavigation}
          >
              <ListChecks className="h-7 w-7" />
          </Button>
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
        <Button
            variant="default"
            className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
            title={t('tasks.button.create')}
            onClick={handleCreateTaskNavigation}
        >
            <ListChecks className="h-7 w-7" />
        </Button>
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
        <Button
            variant="default"
            className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
            title={t('tasks.button.create')}
            onClick={handleCreateTaskNavigation}
        >
            <ListChecks className="h-7 w-7" />
        </Button>
      </div>
    );
  }

  if (!currentCard && isSessionStarted && reviewQueue.length > 0) { // Current card not yet set, but queue is ready
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
            {/* Fallback, should ideally not be reached if logic is correct */}
            <p>{t('review.loading')}</p> 
        </div>
      );
  }

  const progressOptions: { labelKey: keyof typeof import('@/lib/i18n/locales/en').default; rating: PerformanceRating; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null | undefined }[] = [
    { labelKey: 'review.button.progress.tryAgain', rating: 'Try Again', icon: RotateCcw, variant: 'destructive' },
    { labelKey: 'review.button.progress.later', rating: 'Later', icon: SkipForward, variant: 'secondary' },
    { labelKey: 'review.button.progress.mastered', rating: 'Mastered', icon: CheckCircle2, variant: 'default' },
  ];

  const currentCardText = isFlipped ? currentCard.back : currentCard.front;
  const currentCardLang = detectLanguage(currentCardText);

  return (
    <div className="flex flex-col items-center pt-2 flex-1 overflow-y-auto pb-20">
      <p className="text-muted-foreground mb-4">{t('review.cardProgress', { currentIndex: currentCardIndex + 1, totalCards: reviewQueue.length })}</p>
      <Card className="w-full max-w-3xl min-h-[350px] flex flex-col shadow-xl transition-all duration-500 ease-in-out transform hover:scale-[1.01]">
        <CardHeader className="flex items-center justify-center p-4 sm:p-6">
          <div className="flex items-start w-full">
            <div className="flex-grow">
              <div className="markdown-content whitespace-pre-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {currentCardText}
                </ReactMarkdown>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="ml-4 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleSpeak(currentCardText, currentCardLang);
              }}
              title={t('review.speakContent' as any, { defaultValue: "Speak content"})}
              disabled={isSubmittingProgress}
            >
              <Volume2 className="h-6 w-6" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 border-t">
          <Button onClick={handleFlip} variant="outline" className="w-full text-lg py-6 mb-6" disabled={isSubmittingProgress}>
            <RefreshCw className={`mr-2 h-5 w-5 ${isFlipped ? 'animate-pulse' : ''}`} />
            {isFlipped ? t('review.button.flip.showQuestion') : t('review.button.flip.showAnswer')}
          </Button>
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
                <opt.icon className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> {t(opt.labelKey)}
              </Button>
            ))}
          </CardFooter>
        )}
      </Card>
      {isSubmittingProgress && <p className="mt-4 text-primary animate-pulse">{t('review.processing')}</p>}
      {user && (
          <Button
              variant="default"
              className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
              title={t('tasks.button.create')}
              onClick={handleCreateTaskNavigation}
          >
              <ListChecks className="h-7 w-7" />
          </Button>
      )}
    </div>
  );
}

