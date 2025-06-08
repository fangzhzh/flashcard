
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilePenLine, Trash2, Eye, EyeOff, Library } from 'lucide-react';
import type { Flashcard } from '@/types';
import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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
} from "@/components/ui/alert-dialog";
import { useI18n } from '@/lib/i18n/client';
import { useFlashcards } from '@/contexts/FlashcardsContext'; // To get deck names

interface FlashcardItemProps {
  flashcard: Flashcard;
  onDelete: (id: string) => void;
}

export default function FlashcardItem({ flashcard, onDelete }: FlashcardItemProps) {
  const [showBack, setShowBack] = useState(false);
  const t = useI18n();
  const { getDeckById } = useFlashcards();

  const deckName = useMemo(() => {
    if (flashcard.deckId) {
      const deck = getDeckById(flashcard.deckId);
      return deck?.name;
    }
    return null;
  }, [flashcard.deckId, getDeckById]);

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="text-xl">
          <div className="markdown-content whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {flashcard.front}
            </ReactMarkdown>
          </div>
        </CardTitle>
        <div className="flex flex-col space-y-1 text-xs mt-1">
            {deckName && (
              <div className="flex items-center text-muted-foreground">
                <Library className="mr-1.5 h-3.5 w-3.5" />
                <span>{t('flashcard.item.deckLabel')}: {deckName}</span>
              </div>
            )}
            {flashcard.nextReviewDate && (
              <CardDescription className="text-xs">
                {t('flashcard.item.nextReview')}: {new Date(flashcard.nextReviewDate + 'T00:00:00').toLocaleDateString()} ({flashcard.status})
              </CardDescription>
            )}
        </div>
      </CardHeader>
      <CardContent className="flex-grow">
        {showBack && (
          <div className="markdown-content whitespace-pre-wrap">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {flashcard.back}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
        <Button variant="ghost" size="sm" onClick={() => setShowBack(!showBack)} className="w-full sm:w-auto">
          {showBack ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showBack ? t('flashcard.item.hideAnswer') : t('flashcard.item.showAnswer')}
        </Button>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href={`/flashcards/${flashcard.id}/edit`} passHref legacyBehavior>
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none">
              <FilePenLine className="mr-2 h-4 w-4" /> {t('flashcard.item.edit')}
            </Button>
          </Link>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" className="flex-1 sm:flex-none">
                <Trash2 className="mr-2 h-4 w-4" /> {t('flashcard.item.delete')}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('flashcard.item.delete.confirm.title')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('flashcard.item.delete.confirm.description')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('flashcard.item.delete.confirm.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(flashcard.id)}>{t('flashcard.item.delete.confirm.delete')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardFooter>
    </Card>
  );
}
