
"use client";
import { useMemo, useState, useEffect } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import FlashcardItem from '@/components/FlashcardItem';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from '@/components/ui/button';
import { Info, Loader2, ShieldAlert, PlusCircle, Library } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { Deck } from '@/types';

export default function FlashcardListClient() {
  const { user, loading: authLoading } = useAuth();
  const { flashcards, decks, deleteFlashcard, isLoading: contextLoading, isSeeding, getDeckById } = useFlashcards(); // Added decks
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const searchParams = useSearchParams();
  const deckIdFromParams = searchParams.get('deckId');

  const [currentDeck, setCurrentDeck] = useState<Deck | null>(null);

  useEffect(() => {
    if (deckIdFromParams && !contextLoading && decks) { // Also check contextLoading and decks to ensure getDeckById has deck data
      const deck = getDeckById(deckIdFromParams);
      setCurrentDeck(deck || null); // Set to null if deck not found
    } else {
      setCurrentDeck(null);
    }
  }, [deckIdFromParams, getDeckById, contextLoading, decks]);

  const handleDelete = async (id: string) => {
    if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }
    try {
      await deleteFlashcard(id);
      toast({ title: t('success'), description: t('toast.flashcard.deleted') });
    } catch (error) {
      toast({ title: t('error'), description: t('toast.flashcard.error.delete'), variant: "destructive" });
    }
  };
  
  const filteredFlashcards = useMemo(() => {
    if (!deckIdFromParams) {
      return flashcards; // Firestore data is already ordered by createdAt desc
    }
    return flashcards.filter(fc => fc.deckId === deckIdFromParams);
    // Sorting is implicitly handled by context if main flashcards are sorted.
    // If specific sort for filtered is needed: .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
  }, [flashcards, deckIdFromParams]);

  if (authLoading || (contextLoading && user) || (isSeeding && user) || (deckIdFromParams && !currentDeck && !contextLoading && decks && decks.length > 0)) {
    // Added a check for decks.length > 0 to avoid infinite loading if deckId is invalid and decks are loaded
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('flashcards.list.loading')}</p>
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
  
  const pageTitle = deckIdFromParams && currentDeck 
    ? t('flashcards.list.title.deck', { deckName: currentDeck.name })
    : t('flashcards.list.title.all');

  const createCardLink = deckIdFromParams 
    ? `/${currentLocale}/flashcards/new?deckId=${deckIdFromParams}`
    : `/${currentLocale}/flashcards/new`;

  const emptyStateTitle = deckIdFromParams 
    ? (currentDeck ? t('flashcards.list.empty.deck.title', { deckName: currentDeck.name }) : t('flashcards.list.empty.deck.notFound.title'))
    : t('flashcards.list.empty.title');
  
  const emptyStateDescription = deckIdFromParams
    ? (currentDeck ? t('flashcards.list.empty.deck.description') : t('flashcards.list.empty.deck.notFound.description'))
    : t('flashcards.list.empty.description');


  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight flex items-center">
          {deckIdFromParams && currentDeck && <Library className="mr-3 h-7 w-7 text-primary/80 flex-shrink-0" />}
          {pageTitle}
        </h1>
        <Link href={createCardLink} passHref>
          <Button className="w-full sm:w-auto text-base py-3">
            <PlusCircle className="mr-2 h-5 w-5" /> {t('flashcards.button.create')}
          </Button>
        </Link>
      </div>

      {filteredFlashcards.length === 0 ? (
        <Alert className="mt-8 border-primary/50 text-primary bg-primary/5">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">{emptyStateTitle}</AlertTitle>
          <AlertDescription>
            {emptyStateDescription}
            {deckIdFromParams && !currentDeck && !contextLoading && decks && decks.length > 0 && (
                <div className="mt-2">
                    <Link href={`/${currentLocale}/decks`} passHref>
                        <Button variant="outline" size="sm">
                            {t('flashcards.list.backToDecks')}
                        </Button>
                    </Link>
                </div>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFlashcards.map((flashcard) => (
            <FlashcardItem key={flashcard.id} flashcard={flashcard} onDelete={handleDelete} />
          ))}
        </div>
      )}
    </>
  );
}
