"use client";
import { useState, useEffect, useCallback } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { optimizeFlashcardReviewSchedule, OptimizeFlashcardReviewScheduleInput } from '@/ai/flows/smart-schedule';
import type { Flashcard, PerformanceRating } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { RefreshCw, CheckCircle2, SkipForward, RotateCcw, Info, PlayCircle, ThumbsUp } from 'lucide-react';
import { formatISO, addDays, parseISO } from 'date-fns';
import Link from 'next/link';

export default function ReviewModeClient() {
  const { getReviewQueue, updateFlashcard } = useFlashcards();
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionStarted, setIsSessionStarted] = useState(false);
  const { toast } = useToast();

  const currentCard = reviewQueue[currentCardIndex];

  const loadReviewQueue = useCallback(() => {
    const queue = getReviewQueue();
    setReviewQueue(queue);
    setCurrentCardIndex(0);
    setIsFlipped(false);
  }, [getReviewQueue]);

  useEffect(() => {
    if (isSessionStarted) {
      loadReviewQueue();
    }
  }, [isSessionStarted, loadReviewQueue]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleProgress = async (performance: PerformanceRating) => {
    if (!currentCard) return;

    setIsLoading(true);
    try {
      const input: OptimizeFlashcardReviewScheduleInput = {
        flashcardId: currentCard.id,
        lastReviewed: currentCard.lastReviewed || formatISO(new Date()),
        performance: performance,
        currentInterval: currentCard.interval,
      };
      
      const schedule = await optimizeFlashcardReviewSchedule(input);
      
      const newStatus = performance === 'Mastered' ? 'mastered' : 'learning';

      updateFlashcard(currentCard.id, {
        lastReviewed: formatISO(new Date()),
        nextReviewDate: schedule.nextReviewDate, // Already ISO string from AI
        interval: schedule.newInterval,
        status: newStatus,
      });

      toast({
        title: "Progress Saved",
        description: `Card marked as "${performance}". Next review in ${schedule.newInterval} day(s).`,
      });

      if (currentCardIndex < reviewQueue.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setIsFlipped(false);
      } else {
        // End of queue, reload to see if more cards became due or refresh
        loadReviewQueue(); 
      }
    } catch (error) {
      console.error("Error updating flashcard schedule:", error);
      toast({
        title: "Error",
        description: "Could not save progress. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isSessionStarted) {
    const initialQueue = getReviewQueue();
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        {initialQueue.length > 0 ? (
          <>
            <PlayCircle className="w-24 h-24 text-primary mb-6" />
            <h2 className="text-3xl font-semibold mb-4">Ready to Review?</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              You have <span className="font-bold text-primary">{initialQueue.length}</span> card(s) due for review.
            </p>
            <Button size="lg" onClick={() => setIsSessionStarted(true)} className="text-xl py-8 px-10 shadow-lg">
              Start Review Session
            </Button>
          </>
        ) : (
          <>
            <ThumbsUp className="w-24 h-24 text-green-500 mb-6" />
            <h2 className="text-3xl font-semibold mb-4">All Caught Up!</h2>
            <p className="text-muted-foreground mb-8 text-lg">
              You have no cards due for review right now. Great job!
            </p>
            <Link href="/flashcards/new" passHref>
              <Button size="lg" className="text-xl py-8 px-10 shadow-lg">
                 <PlusCircle className="mr-3 h-6 w-6" /> Create More Cards
              </Button>
            </Link>
          </>
        )}
      </div>
    );
  }


  if (reviewQueue.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-10rem)] p-4 text-center">
        <ThumbsUp className="w-24 h-24 text-green-500 mb-6" />
        <h2 className="text-3xl font-semibold mb-4">Review Complete!</h2>
        <p className="text-muted-foreground mb-8 text-lg">
          You've reviewed all available cards for now.
        </p>
        <div className="space-x-4">
          <Button size="lg" onClick={loadReviewQueue} variant="outline">
            Check for More
          </Button>
          <Link href="/" passHref>
            <Button size="lg">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <Alert className="m-auto max-w-md mt-10">
        <Info className="h-4 w-4" />
        <AlertTitle>Loading...</AlertTitle>
        <AlertDescription>Preparing your review session.</AlertDescription>
      </Alert>
    );
  }

  const progressOptions: { label: PerformanceRating; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link" | null | undefined }[] = [
    { label: 'Try Again', icon: RotateCcw, variant: 'destructive' },
    { label: 'Later', icon: SkipForward, variant: 'secondary' },
    { label: 'Mastered', icon: CheckCircle2, variant: 'default' },
  ];

  return (
    <div className="flex flex-col items-center p-4 pt-12">
      <p className="text-muted-foreground mb-4">Card {currentCardIndex + 1} of {reviewQueue.length}</p>
      <Card className="w-full max-w-2xl min-h-[350px] flex flex-col shadow-xl transition-all duration-500 ease-in-out transform hover:scale-[1.01]">
        <CardHeader className="flex-grow flex items-center justify-center p-6 text-center">
          <CardTitle className="text-3xl md:text-4xl font-semibold">
            {isFlipped ? currentCard.back : currentCard.front}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 border-t">
          <Button onClick={handleFlip} variant="outline" className="w-full text-lg py-6 mb-6" disabled={isLoading}>
            <RefreshCw className={`mr-2 h-5 w-5 ${isFlipped ? 'animate-pulse' : ''}`} />
            {isFlipped ? 'Show Question' : 'Show Answer'}
          </Button>
        </CardContent>
        {isFlipped && (
          <CardFooter className="grid grid-cols-3 gap-3 p-6 border-t">
            {progressOptions.map(opt => (
              <Button
                key={opt.label}
                onClick={() => handleProgress(opt.label)}
                variant={opt.variant}
                className="text-sm sm:text-base py-4 h-auto"
                disabled={isLoading}
              >
                <opt.icon className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" /> {opt.label}
              </Button>
            ))}
          </CardFooter>
        )}
      </Card>
      {isLoading && <p className="mt-4 text-primary animate-pulse">Processing...</p>}
    </div>
  );
}
