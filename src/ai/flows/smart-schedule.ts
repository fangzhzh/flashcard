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
  lastReviewed: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format").describe('The date the flashcard was last reviewed, in YYYY-MM-DD ISO format.'),
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
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Next review date must be in YYYY-MM-DD format")
    .describe('The date the flashcard should be reviewed next, in YYYY-MM-DD ISO format.'),
  newInterval: z.number().int().min(1).describe('The new interval in whole days before the flashcard is shown again (must be an integer, minimum 1).'),
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
  prompt: `You are a flashcard scheduling expert. Your task is to calculate the next review date and a new review interval for a flashcard based on user performance.

  Today's date is: {{now format='YYYY-MM-DD'}}

  You are given the following information about the flashcard:
  - Flashcard ID: {{{flashcardId}}}
  - Last Reviewed Date: {{{lastReviewed}}} (in YYYY-MM-DD format)
  - User Performance: {{{performance}}}
  - Current Review Interval: {{{currentInterval}}} days

  Use the following spaced repetition algorithm to determine the new interval and the next review date:

  1.  **If User Performance is "Mastered":**
      *   Calculate the raw new interval: currentInterval * 2.
      *   Round the raw new interval to the nearest whole number. This is your new interval.
      *   The new interval must be at least 1 day. If rounding results in less than 1 (e.g., currentInterval was 0.2, raw new is 0.4, rounded is 0), use 1.
      *   The new interval cannot exceed 365 days. If it's greater than 365, cap it at 365.
      *   The next review date is today's date + the (rounded, capped) new interval in days.

  2.  **If User Performance is "Later":**
      *   Calculate the raw new interval: currentInterval * 1.2.
      *   Round the raw new interval to the nearest whole number. This is your new interval.
      *   The new interval must be at least 1 day. If rounding results in less than 1 (e.g., currentInterval was 0.2, raw new is 0.24, rounded is 0), use 1.
      *   The new interval cannot exceed 365 days. If it's greater than 365, cap it at 365.
      *   The next review date is today's date + the (rounded, capped) new interval in days.

  3.  **If User Performance is "Try Again":**
      *   The new interval is 1 day.
      *   The next review date is tomorrow (today's date + 1 day).

  Output Format:
  Return the next review date in YYYY-MM-DD ISO format and the new interval as a whole number of days.
  Ensure your output strictly matches the required JSON schema for 'nextReviewDate' (string, YYYY-MM-DD) and 'newInterval' (integer, minimum 1).
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
    if (!output) {
      throw new Error("AI prompt did not return a valid output. The output was null or undefined.");
    }
    // Additional explicit validation, though Zod in definePrompt should handle schema compliance.
    // This helps catch if the AI produces a structurally valid JSON but with incorrect data types/formats not caught by a basic Zod parse.
    const validationResult = OptimizeFlashcardReviewScheduleOutputSchema.safeParse(output);
    if (!validationResult.success) {
        throw new Error(`AI output failed validation: ${validationResult.error.message}`);
    }
    return validationResult.data;
  }
);
