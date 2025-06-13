
"use client";
import * as React from 'react'; // Added this import
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import type { Flashcard, Deck } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Save, Library } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Link from 'next/link';

const flashcardSchema = z.object({
  front: z.string().min(1, 'Front content is required').max(100000, { message: 'Front content is too long' }),
  back: z.string().min(1, 'Back content is required').max(200000, { message: 'Back content is too long' }),
  deckId: z.string().nullable().optional(),
});

type FlashcardFormData = z.infer<typeof flashcardSchema>;

interface FlashcardFormProps {
  onSubmit: (data: FlashcardFormData) => void;
  initialData?: Partial<Flashcard>;
  decks: Deck[];
  isLoading?: boolean;
  isLoadingDecks?: boolean;
  submitButtonTextKey?: keyof typeof import('@/lib/i18n/locales/en').default;
}

export default function FlashcardForm({
  onSubmit,
  initialData,
  decks,
  isLoading = false,
  isLoadingDecks = false,
  submitButtonTextKey = 'flashcard.form.button.create'
}: FlashcardFormProps) {
  const t = useI18n();
  const form = useForm<FlashcardFormData>({
    resolver: zodResolver(flashcardSchema),
    defaultValues: {
      front: initialData?.front || '',
      back: initialData?.back || '',
      deckId: initialData?.deckId || null,
    },
  });

  // Update defaultValues when initialData or decks change, especially for deckId
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  React.useEffect(() => {
    form.reset({
        front: initialData?.front || '',
        back: initialData?.back || '',
        deckId: initialData?.deckId || null,
    });
  }, [initialData, form.reset, form]);


  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>{initialData?.id ? t('flashcard.form.title.edit') : t('flashcard.form.title.create')}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="front"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">{t('flashcard.form.label.front')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('flashcard.form.placeholder.front')} {...field} className="min-h-[150px] text-base" />
                  </FormControl>
                  <FormMessage>{form.formState.errors.front && t(form.formState.errors.front.message as any, { maxLength: 100000 })}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="back"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">{t('flashcard.form.label.back')}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('flashcard.form.placeholder.back')} {...field} className="min-h-[250px] text-base" />
                  </FormControl>
                  <FormMessage>{form.formState.errors.back && t(form.formState.errors.back.message as any, { maxLength: 200000 })}</FormMessage>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="deckId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg flex items-center">
                    <Library className="mr-2 h-5 w-5 text-muted-foreground" />
                    {t('flashcard.form.label.deck')}
                  </FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "null" ? null : value)}
                    defaultValue={field.value || "null"}
                    disabled={isLoadingDecks || decks.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingDecks ? t('flashcard.form.loadingDecks') : (decks.length === 0 ? t('flashcard.form.noDecks') : t('flashcard.form.selectDeck'))} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="null">{t('flashcard.form.noDeckSelected')}</SelectItem>
                      {decks.map((deck) => (
                        <SelectItem key={deck.id} value={deck.id}>
                          {deck.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {decks.length === 0 && !isLoadingDecks && (
                    <FormDescription>
                      {t('flashcard.form.noDecksDescription')} {' '}
                      <Link href="/decks" className="underline hover:text-primary">
                        {t('flashcard.form.createDeckLink')}
                      </Link>
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading || isLoadingDecks} className="w-full text-lg py-3">
              <Save className="mr-2 h-5 w-5" />
              {isLoading ? t('flashcard.form.button.saving') : t(submitButtonTextKey)}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
