"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Flashcard } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Save } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';

const flashcardSchema = z.object({
  front: z.string().min(1, 'Front content is required').max(500, 'Front content is too long'), // Keep validation messages simple for now
  back: z.string().min(1, 'Back content is required').max(1000, 'Back content is too long'),
});

type FlashcardFormData = z.infer<typeof flashcardSchema>;

interface FlashcardFormProps {
  onSubmit: (data: FlashcardFormData) => void;
  initialData?: Partial<Flashcard>;
  isLoading?: boolean;
  submitButtonTextKey?: keyof typeof import('@/lib/i18n/locales/en').default; // For dynamic button text based on create/edit
}

export default function FlashcardForm({ 
  onSubmit, 
  initialData, 
  isLoading = false,
  submitButtonTextKey = 'flashcard.form.button.create' // Default to create
}: FlashcardFormProps) {
  const t = useI18n();
  const form = useForm<FlashcardFormData>({
    resolver: zodResolver(flashcardSchema),
    defaultValues: {
      front: initialData?.front || '',
      back: initialData?.back || '',
    },
  });

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
                    <Textarea placeholder={t('flashcard.form.placeholder.front')} {...field} className="min-h-[100px] text-base" />
                  </FormControl>
                  <FormMessage />
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
                    <Textarea placeholder={t('flashcard.form.placeholder.back')} {...field} className="min-h-[150px] text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full text-lg py-3">
              <Save className="mr-2 h-5 w-5" />
              {isLoading ? t('flashcard.form.button.saving') : t(submitButtonTextKey)}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
