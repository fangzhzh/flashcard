"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { SaveAll } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client';

const batchFlashcardSchema = z.object({
  batchInput: z.string().min(1, 'Batch input cannot be empty. Please provide flashcards in the specified format.'), // Keep validation simple for now, i18n for messages is complex here
});

type BatchFlashcardFormData = z.infer<typeof batchFlashcardSchema>;

interface BatchFlashcardFormProps {
  onSubmit: (rawBatchInput: string) => Promise<void>;
  isLoading?: boolean;
}

export default function BatchFlashcardForm({ 
  onSubmit, 
  isLoading = false 
}: BatchFlashcardFormProps) {
  const t = useI18n();
  const form = useForm<BatchFlashcardFormData>({
    resolver: zodResolver(batchFlashcardSchema),
    defaultValues: {
      batchInput: '',
    },
  });

  const handleSubmit = (data: BatchFlashcardFormData) => {
    onSubmit(data.batchInput);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>{t('flashcard.batchForm.title')}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="batchInput"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">{t('flashcard.batchForm.label.input')}</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder={t('flashcard.batchForm.placeholder')}
                      {...field} 
                      className="min-h-[250px] text-base font-mono" 
                    />
                  </FormControl>
                  <FormDescription>
                    {t('flashcard.batchForm.description')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full text-lg py-3">
              <SaveAll className="mr-2 h-5 w-5" />
              {isLoading ? t('flashcard.batchForm.button.saving') : t('flashcard.batchForm.button.save')}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
