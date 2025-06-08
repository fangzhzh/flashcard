
"use client";
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import FlashcardItem from '@/components/FlashcardItem';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2, ShieldAlert } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';

export default function FlashcardListClient() {
  const { user, loading: authLoading } = useAuth();
  const { flashcards, deleteFlashcard, isLoading: contextLoading, isSeeding } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();

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

  if (authLoading || (contextLoading && user) || (isSeeding && user)) {
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

  // Firestore data is already ordered by createdAt desc
  // const sortedFlashcards = [...flashcards].reverse(); 

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {flashcards.map((flashcard) => (
        <FlashcardItem key={flashcard.id} flashcard={flashcard} onDelete={handleDelete} />
      ))}
    </div>
  );
}
