
"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Flashcard, PerformanceRating, Deck } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle2, SkipForward, RotateCcw, PlayCircle, ThumbsUp, PlusCircle, Layers, LayoutDashboard, Loader2, ShieldAlert, Volume2, Library } from 'lucide-react';
import { formatISO, addDays } from 'date-fns';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';


const MASTERED_MULTIPLIER = 2;
const LATER_MULTIPLIER = 1.3;
const TRY_AGAIN_INTERVAL = 1; // 1 day
const MIN_INTERVAL = 1; // 1 day
const MAX_INTERVAL = 365; // 1 year

export default function ReviewModeClient() {
  const { user, loading: authLoading } = useAuth();
  const { getReviewQueue, updateFlashcard, flashcards: allFlashcardsFromContext, isLoading: contextLoading, isSeeding, getDeckById } = useFlashcards();
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
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
        toast({ title: t('error'), description: t('toast.deck.error.load'), variant: 'destructive' });
        router.push(`/${currentLocale}/decks`);
      }
    } else {
      setCurrentDeck(null);
    }
  }, [deckIdFromParams, getDeckById, contextLoading, toast, router, currentLocale, t]);
  
  const allCardsForCurrentScope = useMemo(() => {
    if (!deckIdFromParams) return allFlashcardsFromContext;
    return allFlashcardsFromContext.filter(card => card.deckId === deckIdFromParams);
  }, [allFlashcardsFromContext, deckIdFromParams]);

  const dueCardsForCurrentScope = useMemo(() => {
    const allDueCards = getReviewQueue(); // Gets all due cards globally
    if (!deckIdFromParams) return allDueCards;
    return allDueCards.filter(card => card.deckId === deckIdFromParams);
  }, [getReviewQueue, deckIdFromParams]);


  const loadSpacedRepetitionQueueScoped = useCallback(() => {
    if (contextLoading || !user) return;
    const queue = dueCardsForCurrentScope; // Use pre-filtered due cards
    setReviewQueue(queue); // Already sorted by getReviewQueue implicitly
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [dueCardsForCurrentScope, contextLoading, user]);

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
      
      // const performanceTranslationMap = {
      //   'Mastered': t('review.button.progress.mastered'),
      //   'Later': t('review.button.progress.later'),
      //   'Try Again': t('review.button.progress.tryAgain'),
      // };
      // const translatedPerformance = performanceTranslationMap[performance] || performance;

      // toast({
      //   title: t('toast.progress.saved'),
      //   description: t('toast.progress.saved.description', { performance: translatedPerformance, nextReviewDate: new Date(nextReviewDateString + 'T00:00:00').toLocaleDateString() }),
      // });

      if (currentCardIndex < reviewQueue.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setIsFlipped(false);
      } else {
        setReviewQueue([]); 
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
  
  if (authLoading || (contextLoading && user) || (isSeeding && user) || (deckIdFromParams && !currentDeck && !contextLoading)) {
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

  const pageTitle = currentDeck 
    ? t('review.pageTitle.deck', { deckName: currentDeck.name })
    : t('review.pageTitle.default');


  if (!isSessionStarted) {
    if (allCardsForCurrentScope.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
          <ThumbsUp className="w-24 h-24 text-green-500 mb-6" />
          <h2 className="text-3xl font-semibold mb-4">
            {currentDeck ? t('review.noCardsInDeck.title') : t('review.noCards.title')}
          </h2>
          <p className="text-muted-foreground mb-8 text-lg">
            {currentDeck ? t('review.noCardsInDeck.description') : t('review.noCards.description')}
          </p>
          <Link href={`/${currentLocale}/flashcards/new`} passHref>
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
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
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
          onClick={() => {
            loadSpacedRepetitionQueueScoped();
            setIsSessionStarted(true);
          }}
          className="text-xl py-6 px-8 shadow-lg mb-4 w-full max-w-xs sm:max-w-sm md:max-w-md"
          disabled={dueCardsForCurrentScope.length === 0}
        >
          <PlayCircle className="mr-3 h-6 w-6" />
          {t('review.button.startSpaced', { count: dueCardsForCurrentScope.length })}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            const shuffledCardsInScope = [...allCardsForCurrentScope].sort(() => Math.random() - 0.5);
            setReviewQueue(shuffledCardsInScope);
            setCurrentCardIndex(0);
            setIsFlipped(false);
            setIsSessionStarted(true);
          }}
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
      </div>
    );
  }

  if (reviewQueue.length === 0 && isSessionStarted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
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
            onClick={() => {
              loadSpacedRepetitionQueueScoped();
            }}
            className="w-full"
            disabled={dueCardsForCurrentScope.length === 0}
          >
            <PlayCircle className="mr-3 h-6 w-6" />
            {t('review.button.startSpaced', { count: dueCardsForCurrentScope.length })}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              const shuffledCardsInScope = [...allCardsForCurrentScope].sort(() => Math.random() - 0.5);
              setReviewQueue(shuffledCardsInScope);
              setCurrentCardIndex(0);
              setIsFlipped(false);
            }}
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
  
  if (!currentCard && !isSessionStarted) { // Should not be reached if other guards are correct
      return null; 
  }


  const progressOptions: { labelKey: keyof typeof import('@/lib/i18n/locales/en').default; rating: PerformanceRating; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null | undefined }[] = [
    { labelKey: 'review.button.progress.tryAgain', rating: 'Try Again', icon: RotateCcw, variant: 'destructive' },
    { labelKey: 'review.button.progress.later', rating: 'Later', icon: SkipForward, variant: 'secondary' },
    { labelKey: 'review.button.progress.mastered', rating: 'Mastered', icon: CheckCircle2, variant: 'default' },
  ];
  
  const currentCardText = isFlipped ? currentCard.back : currentCard.front;
  const currentCardLang = detectLanguage(currentCardText);

  return (
    <div className="flex flex-col items-center pt-2 flex-1 overflow-y-auto pb-6">
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
    </div>
  );
}
    






