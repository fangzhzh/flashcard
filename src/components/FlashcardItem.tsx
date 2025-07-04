
"use client";
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FilePenLine, Trash2, Eye, EyeOff, Library, Volume2, Brain, ArrowLeft } from 'lucide-react';
import type { Flashcard } from '@/types';
import { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { CodeProps } from 'react-markdown/lib/ast-to-react';
import MermaidDiagram from '@/components/MermaidDiagram';
import MarkmapRenderer from '@/components/MarkmapRenderer';
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
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { usePathname, useSearchParams } from 'next/navigation';

interface FlashcardItemProps {
  flashcard: Flashcard;
  onDelete: (id: string) => void;
}

const CustomMarkdownComponents = {
  code({ node, inline, className, children, ...props }: CodeProps) {
    const match = /language-(\w+)/.exec(className || '');
    if (!inline && match && match[1] === 'mermaid') {
      return <MermaidDiagram chart={String(children).trim()} />;
    }
    // Fallback for other code blocks (e.g., regular syntax highlighting or default)
    if (!inline && match) {
      return (
        <pre className={className} {...props}>
          <code className={`language-${match[1]}`}>{children}</code>
        </pre>
      );
    }
    // Default for inline code
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  a({ node, ...props }: React.ComponentPropsWithoutRef<'a'>) {
    if (props.href && (props.href.startsWith('http://') || props.href.startsWith('https://'))) {
      return <a {...props} target="_blank" rel="noopener noreferrer" />;
    }
    return <a {...props} />;
  },
};


export default function FlashcardItem({ flashcard, onDelete }: FlashcardItemProps) {
  const [showBack, setShowBack] = useState(false);
  const [isMindmapFullscreen, setIsMindmapFullscreen] = useState(false);
  const t = useI18n();
  const { getDeckById } = useFlashcards();
  const { toast } = useToast();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = useCurrentLocale();

  const deckName = useMemo(() => {
    if (flashcard.deckId) {
      const deck = getDeckById(flashcard.deckId);
      return deck?.name;
    }
    return null;
  }, [flashcard.deckId, getDeckById]);

  const handleSpeak = (text: string, lang?: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (lang) {
        utterance.lang = lang;
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

  const detectLanguage = (text: string) => {
    if (/[\u4E00-\u9FFF]/.test(text)) {
      return 'zh-CN';
    }
    return 'en-US';
  };

  const currentQueryString = searchParams.toString();
  const returnToPath = encodeURIComponent(`${pathname}${currentQueryString ? `?${currentQueryString}` : ''}`);


  return (
    <>
      <Card className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg flex-grow">
              <div className="markdown-content whitespace-pre-wrap">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>
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
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-col space-y-1 text-xs mt-0.5">
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
        <CardContent className="flex-grow flex flex-col min-h-0">
          {showBack && (
            <>
              <div className="flex-shrink-0 flex justify-between items-center border-b mb-2 pb-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-foreground px-2"
                  onClick={() => setIsMindmapFullscreen(true)}
                  title={t('review.button.openMindmap')}
                >
                  <Brain className="mr-0 sm:mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">{t('review.button.openMindmap')}</span>
                </Button>

                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground h-8 w-8"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(flashcard.back, detectLanguage(flashcard.back));
                  }}
                  title={t('flashcard.item.speakBack' as any)}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex-grow overflow-y-auto markdown-content whitespace-pre-wrap pr-2">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>
                  {flashcard.back}
                </ReactMarkdown>
              </div>
            </>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-1.5 pt-3 border-t">
          <Button variant="ghost" size="sm" onClick={() => setShowBack(!showBack)} className="w-full sm:w-auto">
            {showBack ? <EyeOff className="mr-2 h-4 w-4" /> : <Eye className="mr-2 h-4 w-4" />}
            {showBack ? t('flashcard.item.hideAnswer') : t('flashcard.item.showAnswer')}
          </Button>
          <div className="flex flex-wrap justify-end gap-1.5 w-full sm:w-auto">
            <Link href={`/${currentLocale}/flashcards/${flashcard.id}/edit?returnTo=${returnToPath}`} passHref legacyBehavior>
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
      
      {isMindmapFullscreen && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-background p-4 sm:p-6">
          <div className="mb-4 flex items-center">
            <Button variant="outline" onClick={() => setIsMindmapFullscreen(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" /> {t('flashcard.form.page.button.back')}
            </Button>
          </div>
          <div className="flex-grow overflow-auto rounded-md border bg-card">
            <MarkmapRenderer markdownContent={flashcard.back} />
          </div>
        </div>
      )}
    </>
  );
}
