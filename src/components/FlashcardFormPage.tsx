
"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardForm from '@/components/FlashcardForm';
import BatchFlashcardForm from '@/components/BatchFlashcardForm';
import PageContainer from '@/components/PageContainer';
import type { Flashcard } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ListPlus, FilePlus2, Loader2 } from 'lucide-react';

interface FlashcardFormPageProps {
  mode: 'create' | 'edit';
}

export default function FlashcardFormPage({ mode }: FlashcardFormPageProps) {
  const router = useRouter();
  const params = useParams();
  const { addFlashcard, updateFlashcard, getFlashcardById, isLoading: contextLoading } = useFlashcards();
  const [initialData, setInitialData] = useState<Partial<Flashcard> | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed from isLoading to avoid conflict
  const [currentFormMode, setCurrentFormMode] = useState<'single' | 'batch'>('single');
  const { toast } = useToast();

  const cardId = mode === 'edit' ? (params.id as string) : undefined;

  useEffect(() => {
    if (mode === 'edit' && cardId && !contextLoading) {
      setCurrentFormMode('single');
      const card = getFlashcardById(cardId);
      if (card) {
        setInitialData(card);
      } else {
        toast({ title: "Error", description: "Flashcard not found.", variant: "destructive" });
        router.push('/flashcards');
      }
    }
  }, [mode, cardId, getFlashcardById, router, toast, contextLoading]);

  const handleSingleSubmit = (data: { front: string; back: string }) => {
    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        addFlashcard(data);
        toast({ title: "Success", description: "Flashcard created successfully." });
      } else if (cardId) {
        updateFlashcard(cardId, data);
        toast({ title: "Success", description: "Flashcard updated successfully." });
      }
      router.push('/flashcards');
    } catch (error) {
      toast({ title: "Error", description: "Failed to save flashcard.", variant: "destructive" });
      console.error("Failed to save flashcard:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBatchSubmit = (rawBatchInput: string) => {
    setIsSubmitting(true);
    const lines = rawBatchInput.split('\n').filter(line => line.trim() !== '');
    const cardsToAdd: { front: string; back: string }[] = [];
    const parseErrors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(/:(.*)/s); 
      if (parts.length === 3) { // Expecting [question, answer, ""]
        const front = parts[0].trim();
        const back = parts[1].trim();
        if (front !== '' && back !== '') {
          cardsToAdd.push({ front, back });
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
        title: "Batch Processing Error",
        description: (
          <div className="max-h-40 overflow-y-auto">
            <p>Some lines were not processed. Please use "question:answer" format for each line.</p>
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
        toast({ title: "No valid cards found", description: "No cards were added. Ensure cards are in 'question:answer' format and not empty.", variant: "destructive" });
        setIsSubmitting(false);
        return;
    }
     if (cardsToAdd.length === 0 && lines.length === 0) {
      toast({ title: "No input", description: "Batch input is empty.", variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    try {
      let createdCount = 0;
      cardsToAdd.forEach(cardData => {
        addFlashcard(cardData);
        createdCount++;
      });
      if (createdCount > 0) {
        toast({ title: "Success", description: `${createdCount} flashcard(s) created successfully from batch.` });
      }
      if (createdCount > 0 || parseErrors.length === 0) {
         router.push('/flashcards');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save batch flashcards.", variant: "destructive" });
      console.error("Failed to save batch flashcards:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (contextLoading || (mode === 'edit' && !initialData && cardId)) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center mt-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2 text-muted-foreground">Loading form...</p>
        </div>
      </PageContainer>
    );
  }
  
  const pageTitle = mode === 'edit' ? 'Edit Flashcard' : 
                    currentFormMode === 'batch' ? 'Create Flashcards (Batch Mode)' : 'Create New Flashcard';

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Button variant="outline" onClick={() => router.back()} className="self-start sm:self-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-2xl font-semibold tracking-tight sm:absolute sm:left-1/2 sm:-translate-x-1/2 order-first sm:order-none">
          {pageTitle}
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
                <ListPlus className="mr-2 h-4 w-4" /> Switch to Batch Mode
              </>
            ) : (
              <>
                <FilePlus2 className="mr-2 h-4 w-4" /> Switch to Single Card Mode
              </>
            )}
          </Button>
        )}
      </div>
      
      {currentFormMode === 'single' || mode === 'edit' ? (
        <FlashcardForm
          onSubmit={handleSingleSubmit}
          initialData={initialData}
          isLoading={isSubmitting}
          submitButtonText={mode === 'create' ? 'Create Flashcard' : 'Update Flashcard'}
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
