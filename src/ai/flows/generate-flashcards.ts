'use server';

/**
 * @fileOverview A flashcard generation AI agent.
 *
 * - generateFlashcards - A function that handles the flashcard generation process.
 * - GenerateFlashcardsInput - The input type for the generateFlashcards function.
 * - GenerateFlashcardsOutput - The return type for the generateFlashcards function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateFlashcardsInputSchema = z.object({
  topic: z.string().describe('The topic to generate flashcards for.'),
});
export type GenerateFlashcardsInput = z.infer<typeof GenerateFlashcardsInputSchema>;

const GenerateFlashcardsOutputSchema = z.object({
  flashcards: z.array(
    z.object({
      front: z.string().describe('The front of the flashcard (question/term).'),
      back: z.string().describe('The back of the flashcard (answer/explanation).'),
    })
  ).describe('An array of flashcards generated from the topic.'),
});
export type GenerateFlashcardsOutput = z.infer<typeof GenerateFlashcardsOutputSchema>;

export async function generateFlashcards(input: GenerateFlashcardsInput): Promise<GenerateFlashcardsOutput> {
  return generateFlashcardsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateFlashcardsPrompt',
  input: {schema: GenerateFlashcardsInputSchema},
  output: {schema: GenerateFlashcardsOutputSchema},
  prompt: `You are an expert educator specializing in creating flashcards for students.

  You will generate a set of flashcards for the given topic. Each flashcard should have a front (question/term) and a back (answer/explanation).
  The flashcards should be comprehensive and cover the most important aspects of the topic.

  Topic: {{{topic}}}

  Your output should be a JSON array of flashcards, where each flashcard has a "front" and "back" field.
  Do not include any introductory or concluding text, only the JSON array.
  `,
});

const generateFlashcardsFlow = ai.defineFlow(
  {
    name: 'generateFlashcardsFlow',
    inputSchema: GenerateFlashcardsInputSchema,
    outputSchema: GenerateFlashcardsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
