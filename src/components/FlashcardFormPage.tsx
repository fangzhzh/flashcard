"use client";
import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardForm from '@/components/FlashcardForm';
import PageContainer from '@/components/PageContainer';
import type { Flashcard } from '@/types';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface FlashcardFormPageProps {
  mode: 'create' | 'edit';
}

export default function FlashcardFormPage({ mode }: FlashcardFormPageProps) {
  const router = useRouter();
  const params = useParams();
  const { addFlashcard, updateFlashcard, getFlashcardById } = useFlashcards();
  const [initialData, setInitialData] = useState<Partial<Flashcard> | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const cardId = mode === 'edit' ? (params.id as string) : undefined;

  useEffect(() => {
    if (mode === 'edit' && cardId) {
      const card = getFlashcardById(cardId);
      if (card) {
        setInitialData(card);
      } else {
        toast({ title: "Error", description: "Flashcard not found.", variant: "destructive" });
        router.push('/flashcards');
      }
    }
  }, [mode, cardId, getFlashcardById, router, toast]);

  const handleSubmit = async (data: { front: string; back: string }) => {
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

  if (mode === 'edit' && !initialData && cardId) {
    // Still loading or card not found (redirected by effect)
    return <PageContainer><p>Loading flashcard data...</p></PageContainer>;
  }

  return (
    <PageContainer>
      <Button variant="outline" onClick={() => router.back()} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>
      <FlashcardForm
        onSubmit={handleSubmit}
        initialData={initialData}
        isLoading={isLoading}
        submitButtonText={mode === 'create' ? 'Create Flashcard' : 'Update Flashcard'}
      />
    </PageContainer>
  );
}
