"use client";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Flashcard } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Save } from 'lucide-react';

const flashcardSchema = z.object({
  front: z.string().min(1, 'Front content is required').max(500, 'Front content is too long'),
  back: z.string().min(1, 'Back content is required').max(1000, 'Back content is too long'),
});

type FlashcardFormData = z.infer<typeof flashcardSchema>;

interface FlashcardFormProps {
  onSubmit: (data: FlashcardFormData) => void;
  initialData?: Partial<Flashcard>;
  isLoading?: boolean;
  submitButtonText?: string;
}

export default function FlashcardForm({ 
  onSubmit, 
  initialData, 
  isLoading = false,
  submitButtonText = "Save Flashcard"
}: FlashcardFormProps) {
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
        <CardTitle>{initialData?.id ? 'Edit Flashcard' : 'Create New Flashcard'}</CardTitle>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="front"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-lg">Front</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter question or term..." {...field} className="min-h-[100px] text-base" />
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
                  <FormLabel className="text-lg">Back</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter answer or explanation..." {...field} className="min-h-[150px] text-base" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isLoading} className="w-full text-lg py-3">
              <Save className="mr-2 h-5 w-5" />
              {isLoading ? 'Saving...' : submitButtonText}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
