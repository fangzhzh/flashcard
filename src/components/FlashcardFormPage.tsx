
"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation'; 
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardForm from '@/components/FlashcardForm';
import BatchFlashcardForm from '@/components/BatchFlashcardForm';
import PageContainer from '@/components/PageContainer';
import type { Flashcard } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ListPlus, FilePlus2, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from 'lucide-react';

interface FlashcardFormPageProps {
  mode: 'create' | 'edit';
}

export default function FlashcardFormPage({ mode }: FlashcardFormPageProps) {
  const router = useRouter();
  const params = useParams(); 
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { 
    addFlashcard, 
    updateFlashcard, 
    getFlashcardById, 
    decks, 
    isLoading: contextLoading, 
    isLoadingDecks 
  } = useFlashcards();
  const [initialData, setInitialData] = useState<Partial<Flashcard> | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentFormMode, setCurrentFormMode] = useState<'single' | 'batch'>('single');
  const { toast } = useToast();
  const t = useI18n();

  const cardId = mode === 'edit' ? (params.id as string) : undefined;

  useEffect(() => {
    if (mode === 'edit' && cardId && !contextLoading && user) {
      setCurrentFormMode('single'); 
      const card = getFlashcardById(cardId);
      if (card) {
        setInitialData(card);
      } else {
        toast({ title: t('error'), description: t('toast.flashcard.notFound'), variant: "destructive" });
        router.push(`/${params.locale}/flashcards`);
      }
    } else if (mode === 'create' && !cardId) {
      const deckIdFromQuery = searchParams.get('deckId');
      if (deckIdFromQuery) {
        setInitialData({ deckId: deckIdFromQuery }); 
      } else {
        setInitialData({}); // Reset to empty or default deck if needed
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, cardId, getFlashcardById, router, toast, contextLoading, user, params.locale, searchParams]);


  const handleSingleSubmit = async (data: { front: string; back: string; deckId?: string | null }) => {
    if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await addFlashcard(data);
        toast({ title: t('success'), description: t('toast.flashcard.created') });
      } else if (cardId) {
        await updateFlashcard(cardId, data);
        toast({ title: t('success'), description: t('toast.flashcard.updated') });
      }
      // Navigate back to the flashcards list, potentially filtered if deckId was in the creation context
      const deckIdForRedirect = data.deckId || searchParams.get('deckId');
      if (deckIdForRedirect) {
        router.push(`/${params.locale}/flashcards?deckId=${deckIdForRedirect}`);
      } else {
        router.push(`/${params.locale}/flashcards`);
      }
    } catch (error) {
      toast({ title: t('error'), description: t('toast.flashcard.error.save'), variant: "destructive" });
      console.error("Failed to save flashcard:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = async (rawBatchInput: string) => {
    if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const lines = rawBatchInput.split('\n').filter(line => line.trim() !== '');
    const cardsToAdd: { front: string; back: string; deckId?: string | null }[] = [];
    const parseErrors: string[] = [];
    
    // If creating batch cards within a deck context, use that deckId
    const deckIdFromQuery = searchParams.get('deckId');

    lines.forEach((line, index) => {
      const parts = line.split(/:(.*)/s); 
      if (parts.length === 2 || parts.length === 3 ) { 
        const front = parts[0].trim();
        const back = parts[1].trim();
        if (front !== '' && back !== '') {
          cardsToAdd.push({ front, back, deckId: deckIdFromQuery || null }); 
        } else {
          parseErrors.push(`Line ${index + 1}: Question or answer is empty - "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
        }
      } else if (parts.length === 1 && !line.includes(':')) {
         parseErrors.push(`Line ${index + 1}: Missing colon (:) delimiter - "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
      }
      else { 
        parseErrors.push(`Line ${index + 1}: Invalid format - "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
      }
    });

    if (parseErrors.length > 0) {
      toast({
        title: t('error'),
        description: (
          <div className="max-h-40 overflow-y-auto">
            <p>{t('toast.batch.error.parse')}</p>
            <ul className="list-disc pl-5 mt-2">
              {parseErrors.map((err, i) => <li key={i}>{err}</li>)}
            </ul>
          </div>
        ),
        variant: "destructive",
        duration: 10000,
      });
      setIsSubmitting(false);
      if (cardsToAdd.length === 0) return;
    }
    
    if (cardsToAdd.length === 0 && parseErrors.length === 0 && lines.length > 0) {
        toast({ title: t('error'), description: t('toast.batch.error.noValidCards'), variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
     if (cardsToAdd.length === 0 && lines.length === 0) {
      toast({ title: t('error'), description: t('toast.batch.error.emptyInput'), variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      let createdCount = 0;
      for (const cardData of cardsToAdd) {
        await addFlashcard(cardData);
        createdCount++;
      }
      if (createdCount > 0) {
        toast({ title: t('success'), description: t('toast.batch.success', { count: createdCount} ) });
      }
      if (createdCount > 0 || parseErrors.length === 0) {
         if (deckIdFromQuery) {
            router.push(`/${params.locale}/flashcards?deckId=${deckIdFromQuery}`);
         } else {
            router.push(`/${params.locale}/flashcards`);
         }
      }
    } catch (error) {
      toast({ title: t('error'), description: t('toast.batch.error.save'), variant: "destructive" });
      console.error("Failed to save batch flashcards:", error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  if (authLoading || (contextLoading && user) || (isLoadingDecks && user)) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center mt-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">{t('flashcard.form.page.loading')}</p>
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
  
  if (mode === 'edit' && !initialData && cardId && user && !contextLoading) {
     return ( 
      <PageContainer>
        <div className="flex justify-center items-center mt-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">{t('flashcard.form.page.loadingSpecific')}</p>
        </div>
      </PageContainer>
    );
  }
  
  const pageTitleKey = mode === 'edit' ? 'flashcard.form.page.title.edit' : 
                    currentFormMode === 'batch' ? 'flashcard.form.page.title.create.batch' : 'flashcard.form.page.title.create.single';

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Button variant="outline" onClick={() => router.back()} className="self-start sm:self-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> {t('flashcard.form.page.button.back')}
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight sm:absolute sm:left-1/2 sm:-translate-x-1/2 order-first sm:order-none">
          {t(pageTitleKey)}
        </h2>
        {mode === 'create' && (
          <Button 
            variant="outline" 
            onClick={() => setCurrentFormMode(currentFormMode === 'single' ? 'batch' : 'single')}
            className="w-full sm:w-auto"
            disabled={isSubmitting}
          >
            {currentFormMode === 'single' ? (
              <>
                <ListPlus className="mr-2 h-4 w-4" /> {t('flashcard.form.page.button.switchToBatch')}
              </>
            ) : (
              <>
                <FilePlus2 className="mr-2 h-4 w-4" /> {t('flashcard.form.page.button.switchToSingle')}
              </>
            )}
          </Button>
        )}
      </div>
      
      {currentFormMode === 'single' || mode === 'edit' ? (
        <FlashcardForm
          onSubmit={handleSingleSubmit}
          initialData={initialData}
          decks={decks}
          isLoading={isSubmitting}
          isLoadingDecks={isLoadingDecks}
          submitButtonTextKey={mode === 'create' ? 'flashcard.form.button.create' : 'flashcard.form.button.update'}
        />
      ) : (
        <BatchFlashcardForm
          onSubmit={handleBatchSubmit}
          isLoading={isSubmitting}
        />
      )}
    </PageContainer>
  );
}

    