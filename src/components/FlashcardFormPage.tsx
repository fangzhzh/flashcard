
"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardForm from '@/components/FlashcardForm';
import BatchFlashcardForm from '@/components/BatchFlashcardForm'; // New Import
import PageContainer from '@/components/PageContainer';
import type { Flashcard } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ListPlus, FilePlus2 } from 'lucide-react'; // Added ListPlus, FilePlus2

interface FlashcardFormPageProps {
  mode: 'create' | 'edit';
}

export default function FlashcardFormPage({ mode }: FlashcardFormPageProps) {
  const router = useRouter();
  const params = useParams();
  const { addFlashcard, updateFlashcard, getFlashcardById } = useFlashcards();
  const [initialData, setInitialData] = useState<Partial<Flashcard> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [currentFormMode, setCurrentFormMode] = useState<'single' | 'batch'>('single'); // For toggling
  const { toast } = useToast();

  const cardId = mode === 'edit' ? (params.id as string) : undefined;

  useEffect(() => {
    if (mode === 'edit' && cardId) {
      setCurrentFormMode('single'); // Edit mode is always single
      const card = getFlashcardById(cardId);
      if (card) {
        setInitialData(card);
      } else {
        toast({ title: "Error", description: "Flashcard not found.", variant: "destructive" });
        router.push('/flashcards');
      }
    } else if (mode === 'create') {
      // Allow mode switching for create
    }
  }, [mode, cardId, getFlashcardById, router, toast]);

  const handleSingleSubmit = async (data: { front: string; back: string }) => {
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };

  const handleBatchSubmit = async (rawBatchInput: string) => {
    setIsLoading(true);
    const lines = rawBatchInput.split('\n').filter(line => line.trim() !== '');
    const cardsToAdd: { front: string; back: string }[] = [];
    const parseErrors: string[] = [];

    lines.forEach((line, index) => {
      const parts = line.split(/:(.*)/s); // Split only on the first colon, s allows . to match newline
      // If split is successful, parts = [question, answer, ""]
      if (parts.length === 3) {
        const front = parts[0].trim();
        const back = parts[1].trim();
        if (front !== '' && back !== '') {
          cardsToAdd.push({ front, back });
        } else {
          parseErrors.push(`Line ${index + 1}: Question or answer is empty - "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
        }
      } else if (parts.length === 1 && !line.includes(':')) { // Line doesn't contain a colon
         parseErrors.push(`Line ${index + 1}: Missing colon (:) delimiter - "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
      }
      else { // Other malformed cases
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
      setIsLoading(false);
      if (cardsToAdd.length === 0) return; // Don't proceed if all lines had errors
    }

    if (cardsToAdd.length === 0 && parseErrors.length === 0 && lines.length > 0) {
        toast({ title: "No valid cards found", description: "No cards were added. Ensure cards are in 'question:answer' format and not empty.", variant: "destructive" });
        setIsLoading(false);
        return;
    }
     if (cardsToAdd.length === 0 && lines.length === 0) {
      toast({ title: "No input", description: "Batch input is empty.", variant: "destructive" });
      setIsLoading(false);
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
      if (createdCount > 0 || parseErrors.length === 0) { // Navigate if some cards were created or if there were no cards but also no errors (e.g. only empty lines)
         router.push('/flashcards');
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to save batch flashcards.", variant: "destructive" });
      console.error("Failed to save batch flashcards:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === 'edit' && !initialData && cardId) {
    return <PageContainer><p>Loading flashcard data...</p></PageContainer>;
  }

  const pageTitle = mode === 'edit' ? 'Edit Flashcard' : 
                    currentFormMode === 'batch' ? 'Create Flashcards (Batch Mode)' : 'Create New Flashcard';

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <Button variant="outline" onClick={() => router.back()} className="self-start sm:self-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        {mode === 'create' && (
          <Button 
            variant="outline" 
            onClick={() => setCurrentFormMode(currentFormMode === 'single' ? 'batch' : 'single')}
            className="w-full sm:w-auto"
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
          isLoading={isLoading}
          submitButtonText={mode === 'create' ? 'Create Flashcard' : 'Update Flashcard'}
        />
      ) : (
        <BatchFlashcardForm
          onSubmit={handleBatchSubmit}
          isLoading={isLoading}
        />
      )}
    </PageContainer>
  );
}
