"use client";
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardItem from '@/components/FlashcardItem';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info } from 'lucide-react';

export default function FlashcardListClient() {
  const { flashcards, deleteFlashcard } = useFlashcards();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    try {
      deleteFlashcard(id);
      toast({ title: "Success", description: "Flashcard deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete flashcard.", variant: "destructive" });
    }
  };

  if (flashcards.length === 0) {
    return (
      <Alert className="mt-8 border-primary/50 text-primary bg-primary/5">
        <Info className="h-5 w-5 text-primary" />
        <AlertTitle className="font-semibold text-primary">No Flashcards Yet!</AlertTitle>
        <AlertDescription>
          You haven't created any flashcards. Click the "Create New Card" button to get started.
        </AlertDescription>
      </Alert>
    );
  }

  // Sort flashcards, for example, by last reviewed or creation date (newest first by default from context)
  // Or let user choose sort order in future
  const sortedFlashcards = [...flashcards].reverse(); // Show newest first

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {sortedFlashcards.map((flashcard) => (
        <FlashcardItem key={flashcard.id} flashcard={flashcard} onDelete={handleDelete} />
      ))}
    </div>
  );
}
