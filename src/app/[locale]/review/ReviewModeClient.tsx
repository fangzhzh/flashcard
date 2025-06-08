
"use client";
import { useState, useEffect, useCallback } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import type { Flashcard, PerformanceRating } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle2, SkipForward, RotateCcw, PlayCircle, ThumbsUp, PlusCircle, Layers, LayoutDashboard, Loader2, ShieldAlert } from 'lucide-react';
import { formatISO, addDays } from 'date-fns';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


const MASTERED_MULTIPLIER = 2;
const LATER_MULTIPLIER = 1.3;
const TRY_AGAIN_INTERVAL = 1; // 1 day
const MIN_INTERVAL = 1; // 1 day
const MAX_INTERVAL = 365; // 1 year

export default function ReviewModeClient() {
  const { user, loading: authLoading } = useAuth();
  const { getReviewQueue, updateFlashcard, flashcards: allFlashcardsFromContext, isLoading: contextLoading, isSeeding } = useFlashcards();
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isSubmittingProgress, setIsSubmittingProgress] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const { toast } = useToast();
  const t = useI18n();

  const currentCard = reviewQueue[currentCardIndex];

  const loadSpacedRepetitionQueue = useCallback(() => {
    if (contextLoading || !user) return;
    const queue = getReviewQueue();
    setReviewQueue(queue);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [getReviewQueue, contextLoading, user]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
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
      
      const performanceTranslationMap = {
        'Mastered': t('review.button.progress.mastered'),
        'Later': t('review.button.progress.later'),
        'Try Again': t('review.button.progress.tryAgain'),
      };
      const translatedPerformance = performanceTranslationMap[performance] || performance;


      toast({
        title: t('toast.progress.saved'),
        description: t('toast.progress.saved.description', { performance: translatedPerformance, nextReviewDate: new Date(nextReviewDateString + 'T00:00:00').toLocaleDateString() }),
      });

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
  
  if (authLoading || (contextLoading && user) || (isSeeding && user)) {
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
    const initialSpacedRepetitionQueue = getReviewQueue();

    if (allFlashcardsFromContext.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
          <ThumbsUp className="w-24 h-24 text-green-500 mb-6" />
          <h2 className="text-3xl font-semibold mb-4">{t('review.noCards.title')}</h2>
          <p className="text-muted-foreground mb-8 text-lg">
            {t('review.noCards.description')}
          </p>
          <Link href="/flashcards/new" passHref>
            <Button size="lg" className="text-xl py-8 px-10 shadow-lg">
              <PlusCircle className="mr-3 h-6 w-6" /> {t('review.noCards.button.create')}
            </Button>
          </Link>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <PlayCircle className="w-24 h-24 text-primary mb-6" />
        <h2 className="text-3xl font-semibold mb-4">{t('review.ready.title')}</h2>

        {initialSpacedRepetitionQueue.length > 0 ? (
          <p className="text-muted-foreground mb-4 text-lg">
             {t('review.ready.due.text', { count: initialSpacedRepetitionQueue.length })}
          </p>
        ) : (
          <p className="text-muted-foreground mb-4 text-lg">
            {t('review.ready.due.none')}
          </p>
        )}

        <Button
          size="lg"
          onClick={() => {
            loadSpacedRepetitionQueue();
            setIsSessionStarted(true);
          }}
          className="text-xl py-6 px-8 shadow-lg mb-4 w-full max-w-xs sm:max-w-sm md:max-w-md"
          disabled={initialSpacedRepetitionQueue.length === 0}
        >
          <PlayCircle className="mr-3 h-6 w-6" />
          {t('review.button.startSpaced', { count: initialSpacedRepetitionQueue.length })}
        </Button>

        <Button
          size="lg"
          variant="outline"
          onClick={() => {
            const shuffledAllCards = [...allFlashcardsFromContext].sort(() => Math.random() - 0.5);
            setReviewQueue(shuffledAllCards);
            setCurrentCardIndex(0);
            setIsFlipped(false);
            setIsSessionStarted(true);
          }}
          className="text-xl py-6 px-8 shadow-lg w-full max-w-xs sm:max-w-sm md:max-w-md"
          disabled={allFlashcardsFromContext.length === 0}
        >
          <Layers className="mr-3 h-6 w-6" />
          {t('review.button.reviewAll', { count: allFlashcardsFromContext.length })}
        </Button>
         {initialSpacedRepetitionQueue.length === 0 && allFlashcardsFromContext.length > 0 && (
             <p className="text-muted-foreground mt-8 text-sm">
                {t('review.tip.noSpacedRepetition')}
            </p>
        )}
      </div>
    );
  }

  if (reviewQueue.length === 0 && isSessionStarted) {
    const srQueueCount = getReviewQueue().length;

    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <ThumbsUp className="w-24 h-24 text-green-500 mb-6" />
        <h2 className="text-3xl font-semibold mb-4">{t('review.sessionComplete.title')}</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          {t('review.sessionComplete.description')}
        </p>
        <div className="flex flex-col items-center gap-4 w-full max-w-xs sm:max-w-sm md:max-w-md">
          <Button
            size="lg"
            onClick={() => {
              loadSpacedRepetitionQueue();
            }}
            className="w-full"
            disabled={srQueueCount === 0}
          >
            <PlayCircle className="mr-3 h-6 w-6" />
            {t('review.button.startSpaced', { count: srQueueCount })}
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              const shuffledAllCards = [...allFlashcardsFromContext].sort(() => Math.random() - 0.5);
              setReviewQueue(shuffledAllCards);
              setCurrentCardIndex(0);
              setIsFlipped(false);
            }}
            className="w-full"
            disabled={allFlashcardsFromContext.length === 0}
          >
            <Layers className="mr-3 h-6 w-6" />
            {t('review.sessionComplete.button.reviewAllAgain', { count: allFlashcardsFromContext.length })}
          </Button>
          <Link href="/" passHref className="w-full">
            <Button size="lg" variant="secondary" className="w-full">
               <LayoutDashboard className="mr-3 h-6 w-6" />
              {t('review.sessionComplete.button.backToDashboard')}
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
  
  if (!currentCard && !isSessionStarted) {
      return null; 
  }

  const progressOptions: { labelKey: keyof typeof import('@/lib/i18n/locales/en').default; rating: PerformanceRating; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null | undefined }[] = [
    { labelKey: 'review.button.progress.tryAgain', rating: 'Try Again', icon: RotateCcw, variant: 'destructive' },
    { labelKey: 'review.button.progress.later', rating: 'Later', icon: SkipForward, variant: 'secondary' },
    { labelKey: 'review.button.progress.mastered', rating: 'Mastered', icon: CheckCircle2, variant: 'default' },
  ];

  return (
    <div className="flex flex-col items-center p-4 pt-12">
      <p className="text-muted-foreground mb-4">{t('review.cardProgress', { currentIndex: currentCardIndex + 1, totalCards: reviewQueue.length })}</p>
      <Card className="w-full max-w-2xl min-h-[350px] flex flex-col shadow-xl transition-all duration-500 ease-in-out transform hover:scale-[1.01]">
        <CardHeader className="flex-grow flex items-center justify-center p-6 text-center">
          <CardTitle className="text-3xl md:text-4xl font-semibold whitespace-pre-wrap">
            {isFlipped ? currentCard.back : currentCard.front}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 border-t">
          <Button onClick={handleFlip} variant="outline" className="w-full text-lg py-6 mb-6" disabled={isSubmittingProgress}>
            <RefreshCw className={`mr-2 h-5 w-5 ${isFlipped ? 'animate-pulse' : ''}`} />
            {isFlipped ? t('review.button.flip.showQuestion') : t('review.button.flip.showAnswer')}
          </Button>
        </CardContent>
        {isFlipped && (
          <CardFooter className="grid grid-cols-3 gap-3 p-6 border-t">
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
