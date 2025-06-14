
"use client";
import { useState, useMemo } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
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
import { PlusCircle, Edit3, Trash2, Loader2, Info, ShieldAlert, Library, PlayCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import type { Deck } from '@/types';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function DecksClient() {
  const { user, loading: authLoading } = useAuth();
  const { decks, flashcards, addDeck, updateDeck, deleteDeck, isLoadingDecks, isSeeding } = useFlashcards();
  const { toast } = useToast();
  const t = useI18n();
  const currentLocale = useCurrentLocale();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentDeck, setCurrentDeck] = useState<Partial<Deck> | null>(null);
  const [deckName, setDeckName] = useState('');
  const [isSubmittingDeck, setIsSubmittingDeck] = useState(false);

  const openNewDeckDialog = () => {
    setCurrentDeck(null);
    setDeckName('');
    setIsDialogOpen(true);
  };

  const openEditDeckDialog = (deck: Deck) => {
    setCurrentDeck(deck);
    setDeckName(deck.name);
    setIsDialogOpen(true);
  };

  const handleDeckSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deckName.trim()) {
      toast({ title: t('error'), description: t('toast.deck.error.nameRequired'), variant: 'destructive' });
      return;
    }
    if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }

    setIsSubmittingDeck(true);
    try {
      if (currentDeck && currentDeck.id) {
        await updateDeck(currentDeck.id, { name: deckName });
        toast({ title: t('success'), description: t('toast.deck.updated') });
      } else {
        await addDeck(deckName);
        toast({ title: t('success'), description: t('toast.deck.created') });
      }
      setIsDialogOpen(false);
    } catch (error) {
      toast({ title: t('error'), description: t('toast.deck.error.save'), variant: "destructive" });
    } finally {
      setIsSubmittingDeck(false);
    }
  };

  const handleDeleteDeck = async (deckId: string) => {
     if (!user) {
      toast({ title: t('error'), description: t('auth.pleaseSignIn'), variant: "destructive" });
      return;
    }
    setIsSubmittingDeck(true);
    try {
      await deleteDeck(deckId);
      toast({ title: t('success'), description: t('toast.deck.deleted') });
    } catch (error) {
      toast({ title: t('error'), description: t('toast.deck.error.delete'), variant: "destructive" });
    } finally {
      setIsSubmittingDeck(false);
    }
  };

  const getCardCountForDeck = (deckId: string) => {
    return flashcards.filter(fc => fc.deckId === deckId).length;
  };


  if (authLoading || (isLoadingDecks && user) || (isSeeding && user)) {
    return (
      <div className="flex justify-center items-center mt-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2 text-muted-foreground">{t('decks.list.loading')}</p>
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


  return (
    <>
      <div className="flex justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('decks.title')}</h1>
        {/* Removed Button onClick={openNewDeckDialog} from here */}
      </div>

      {decks.length === 0 && !isLoadingDecks && (
        <Alert className="mt-8 border-primary/50 text-primary bg-primary/5">
          <Info className="h-5 w-5 text-primary" />
          <AlertTitle className="font-semibold text-primary">{t('decks.list.empty.title')}</AlertTitle>
          <AlertDescription>
            {t('decks.list.empty.description')}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {decks.map((deck) => (
          <Card key={deck.id} className="flex flex-col h-full shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl flex items-center flex-grow mr-2">
                  <Library className="mr-2 h-5 w-5 text-primary/80 flex-shrink-0"/>
                  <span className="truncate" title={deck.name}>{deck.name}</span>
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 h-7 w-7 p-1" 
                  onClick={() => openEditDeckDialog(deck)}
                  title={t('deck.item.editNameHint')}
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
              </div>
              <Link href={`/${currentLocale}/flashcards?deckId=${deck.id}`} passHref>
                <CardDescription className="hover:underline cursor-pointer text-primary/90">
                  {t('deck.item.cardsCount', { count: getCardCountForDeck(deck.id) })}
                </CardDescription>
              </Link>
            </CardHeader>
            <CardContent className="flex-grow">
              {/* Future: Could show some stats or recent cards here */}
            </CardContent>
            <CardFooter className="flex flex-col items-end gap-2 pt-4 border-t">
                <Link href={`/${currentLocale}/review?deckId=${deck.id}`} passHref className="w-full">
                  <Button variant="default" size="sm" className="w-full">
                    <PlayCircle className="mr-2 h-4 w-4" /> {t('deck.item.review.short')}
                  </Button>
                </Link>
              <div className="flex gap-2 w-full">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1" disabled={isSubmittingDeck}>
                      <Trash2 className="mr-2 h-4 w-4" /> {t('deck.item.delete.short')}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t('deck.item.delete.confirm.title')}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t('deck.item.delete.confirm.description')}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t('deck.item.delete.confirm.cancel')}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteDeck(deck.id)} disabled={isSubmittingDeck}>
                        {isSubmittingDeck ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {t('deck.item.delete.confirm.delete')}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{currentDeck?.id ? t('deck.form.title.edit') : t('deck.form.title.create')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDeckSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="deckName" className="text-right">
                  {t('deck.form.label.name')}
                </Label>
                <Input
                  id="deckName"
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="col-span-3"
                  placeholder={t('deck.form.placeholder.name')}
                  disabled={isSubmittingDeck}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isSubmittingDeck}>
                  {t('deck.item.delete.confirm.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmittingDeck || !deckName.trim()}>
                {isSubmittingDeck && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentDeck?.id ? t('deck.form.button.update') : t('deck.form.button.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Button
        variant="default"
        className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
        onClick={openNewDeckDialog}
        title={t('decks.button.create')}
      >
        <PlusCircle className="h-7 w-7" />
      </Button>
    </>
  );
}
