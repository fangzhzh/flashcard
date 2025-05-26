"use client";
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardItem from '@/components/FlashcardItem';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';

export default function FlashcardListClient() {
  const { flashcards, deleteFlashcard, isLoading: contextLoading } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();

  const handleDelete = (id: string) => {
    try {
      deleteFlashcard(id);
      toast({ title: t('success'), description: t('toast.flashcard.deleted') });
    } catch (error) {
      toast({ title: t('error'), description: t('toast.flashcard.error.delete'), variant: "destructive" });
    }
  };

  if (contextLoading) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('flashcards.list.loading')}</p>
      </div>
    );
  }

  if (flashcards.length === 0) {
    return (
      <Alert className="mt-8 border-primary/50 text-primary bg-primary/5">
        <Info className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary">{t('flashcards.list.empty.title')}</AlertTitle>
        <AlertDescription>
          {t('flashcards.list.empty.description')}
        </AlertDescription>
      </Alert>
    );
  }

  const sortedFlashcards = [...flashcards].reverse(); 

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {sortedFlashcards.map((flashcard) => (
        <FlashcardItem key={flashcard.id} flashcard={flashcard} onDelete={handleDelete} />
      ))}
    </div>
  );
}
