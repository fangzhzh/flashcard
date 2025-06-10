
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilePenLine, Trash2, Eye, EyeOff, Library, Volume2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';

interface FlashcardItemProps {
  flashcard: Flashcard;
  onDelete: (id: string) => void;
}

export default function FlashcardItem({ flashcard, onDelete }: FlashcardItemProps) {
  const [showBack, setShowBack] = useState(false);
  const t = useI18n();
  const { getDeckById } = useFlashcards();
  const { toast } = useToast();

  const deckName = useMemo(() => {
    if (flashcard.deckId) {
      const deck = getDeckById(flashcard.deckId);
      return deck?.name;
    }
    return null;
  }, [flashcard.deckId, getDeckById]);

  const handleSpeak = (text: string, lang?: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (lang) {
        utterance.lang = lang; // Attempt to set language, effectiveness varies by browser/OS
      }
      window.speechSynthesis.speak(utterance);
    } else {
      toast({
        title: "Speech Error",
        description: "Your browser does not support text-to-speech.",
        variant: "destructive",
      });
    }
  };

  // Basic language detection (can be improved)
  const detectLanguage = (text: string) => {
    // Very naive check for Chinese characters
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return 'zh-CN';
    }
    return 'en-US'; // Default to English
  };

  return (
    <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader>
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl flex-grow">
            <div className="markdown-content whitespace-pre-wrap">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {flashcard.front}
              </ReactMarkdown>
            </div>
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="ml-2 flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              handleSpeak(flashcard.front, detectLanguage(flashcard.front));
            }}
            title={t('flashcard.item.speakFront' as any, {defaultValue: "Speak front content"})}
          >
            <Volume2 className="h-5 w-5" />
          </Button>
        </div>
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
          <div className="flex justify-between items-start">
            <div className="markdown-content whitespace-pre-wrap flex-grow">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {flashcard.back}
              </ReactMarkdown>
            </div>
             <Button
              variant="ghost"
              size="icon"
              className="ml-2 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleSpeak(flashcard.back, detectLanguage(flashcard.back));
              }}
              title={t('flashcard.item.speakBack' as any, {defaultValue: "Speak back content"})}
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-2 pt-4 border-t">
        <Button variant="ghost" size="sm" onClick={() => setShowBack(!showBack)} className="w-full sm:w-auto">
          {showBack ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
          {showBack ? t('flashcard.item.hideAnswer') : t('flashcard.item.showAnswer')}
        </Button>
        <div className="flex flex-wrap justify-end gap-2 w-full sm:w-auto"> {/* Added flex-wrap and justify-end here */}
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
