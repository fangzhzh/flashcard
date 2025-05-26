"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilePenLine, Trash2, Eye, EyeOff } from 'lucide-react';
import type { Flashcard } from '@/types';
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface FlashcardItemProps {
  flashcard: Flashcard;
  onDelete: (id: string) => void;
}

export default function FlashcardItem({ flashcard, onDelete }: FlashcardItemProps) {
  const [showBack, setShowBack] = useState(false);

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="truncate text-xl">{flashcard.front}</CardTitle>
        {flashcard.nextReviewDate && (
          <CardDescription className="text-xs">
            Next review: {new Date(flashcard.nextReviewDate).toLocaleDateString()} ({flashcard.status})
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex-grow">
        {showBack && <p className="text-muted-foreground whitespace-pre-wrap">{flashcard.back}</p>}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
        <Button variant="ghost" size="sm" onClick={() => setShowBack(!showBack)} className="w-full sm:w-auto">
          {showBack ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showBack ? 'Hide Answer' : 'Show Answer'}
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href={`/flashcards/${flashcard.id}/edit`} passHref legacyBehavior>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <FilePenLine className="mr-2 h-4 w-4" /> Edit
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="flex-1 sm:flex-none">
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete this flashcard.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(flashcard.id)}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
