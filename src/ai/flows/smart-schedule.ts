// src/ai/flows/smart-schedule.ts
'use server';
/**
 * @fileOverview Implements a spaced repetition algorithm to optimize flashcard review schedule.
 *
 * - optimizeFlashcardReviewSchedule - A function that schedules flashcards for review based on user performance.
 * - OptimizeFlashcardReviewScheduleInput - The input type for the optimizeFlashcardReviewSchedule function.
 * - OptimizeFlashcardReviewScheduleOutput - The return type for the optimizeFlashcardReviewSchedule function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const OptimizeFlashcardReviewScheduleInputSchema = z.object({
  flashcardId: z.string().describe('The ID of the flashcard.'),
  lastReviewed: z.string().describe('The date the flashcard was last reviewed, in ISO format.'),
  performance: z
    .enum(['Mastered', 'Later', 'Try Again'])
    .describe('The user performance on the flashcard during the last review.'),
  currentInterval: z
    .number()
    .describe('The current interval in days before the flashcard is shown again.'),
});
export type OptimizeFlashcardReviewScheduleInput = z.infer<typeof OptimizeFlashcardReviewScheduleInputSchema>;

const OptimizeFlashcardReviewScheduleOutputSchema = z.object({
  nextReviewDate: z
    .string()
    .describe('The date the flashcard should be reviewed next, in ISO format.'),
  newInterval: z.number().describe('The new interval in days before the flashcard is shown again.'),
});
export type OptimizeFlashcardReviewScheduleOutput = z.infer<typeof OptimizeFlashcardReviewScheduleOutputSchema>;

export async function optimizeFlashcardReviewSchedule(
  input: OptimizeFlashcardReviewScheduleInput
): Promise<OptimizeFlashcardReviewScheduleOutput> {
  return optimizeFlashcardReviewScheduleFlow(input);
}

const prompt = ai.definePrompt({
  name: 'optimizeFlashcardReviewSchedulePrompt',
  input: {schema: OptimizeFlashcardReviewScheduleInputSchema},
  output: {schema: OptimizeFlashcardReviewScheduleOutputSchema},
  prompt: `You are a flashcard scheduling expert.

  Given the flashcard ID {{{flashcardId}}}, the last review date {{{lastReviewed}}}, the user's performance on the flashcard during the last review ({{{performance}}}), and the current interval of {{{currentInterval}}} days, determine the next review date and the new interval in days.

  Use the following spaced repetition algorithm:
  - If the user selects "Mastered", increase the interval by a factor of 2. The new interval cannot be larger than 365 days, and the next review date is today + the new interval.
  - If the user selects "Later", increase the interval by a factor of 1.2. The new interval cannot be larger than 365 days, and the next review date is today + the new interval.
  - If the user selects "Try Again", reset the interval to 1. The next review date is tomorrow.

  Return the next review date in ISO format and the new interval in days.
  Today's date in ISO format is {{now format='YYYY-MM-DD'}}
`,
});

const optimizeFlashcardReviewScheduleFlow = ai.defineFlow(
  {
    name: 'optimizeFlashcardReviewScheduleFlow',
    inputSchema: OptimizeFlashcardReviewScheduleInputSchema,
    outputSchema: OptimizeFlashcardReviewScheduleOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
