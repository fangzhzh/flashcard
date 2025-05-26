"use client";
import { useFlashcards } from '@/contexts/FlashcardsContext';
import FlashcardItem from '@/components/FlashcardItem';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Loader2 } from 'lucide-react'; // Added Loader2

export default function FlashcardListClient() {
  const { flashcards, deleteFlashcard, isLoading } = useFlashcards();
  const { toast } = useToast();

  const handleDelete = (id: string) => {
    try {
      deleteFlashcard(id);
      toast({ title: "Success", description: "Flashcard deleted." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to delete flashcard.", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">Loading your flashcards...</p>
      </div>
    );
  }

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

  // Show newest first (based on original array order from context, which might be a mix of seeded and user-added)
  const sortedFlashcards = [...flashcards].reverse(); 

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
      {sortedFlashcards.map((flashcard) => (
        <FlashcardItem key={flashcard.id} flashcard={flashcard} onDelete={handleDelete} />
      ))}
    </div>
  );
}
