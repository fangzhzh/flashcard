
"use client";
import type { Flashcard, FlashcardSourceDataItem } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import React, { createContext, useContext, ReactNode, useCallback, useMemo, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, parseISO } from 'date-fns';
import flashcardJsonData from '../../flashcard.json'; // Import the JSON data

const EMPTY_FLASHCARDS: Flashcard[] = [];

interface FlashcardsContextType {
  flashcards: Flashcard[];
  addFlashcard: (data: { front: string; back: string }) => Flashcard;
  updateFlashcard: (id: string, updates: Partial<Omit<Flashcard, 'id'>>) => Flashcard | null;
  deleteFlashcard: (id: string) => void;
  getFlashcardById: (id: string) => Flashcard | undefined;
  getReviewQueue: () => Flashcard[];
  getStatistics: () => { total: number; mastered: number; learning: number; new: number; dueToday: number };
  isLoading: boolean; // To indicate initial data processing
}

const FlashcardsContext = createContext<FlashcardsContextType | undefined>(undefined);

export const FlashcardsProvider = ({ children }: { children: ReactNode }) => {
  const [storedFlashcards, setStoredFlashcards] = useLocalStorage<Flashcard[]>('flashcards', EMPTY_FLASHCARDS);
  const [isLoading, setIsLoading] = useState(true);

  // Effect for initial seeding from flashcard.json
  useEffect(() => {
    setIsLoading(true);
    // Ensure the structure matches FlashcardSourceDataItem after json import
    const vocabulary = flashcardJsonData.vocabulary as FlashcardSourceDataItem[];
    
    setStoredFlashcards(prevStoredFlashcards => {
      let updatedFlashcards = [...prevStoredFlashcards];
      // Use a Set to track sourceQuestions of cards already processed from localStorage
      // to prevent re-adding them from flashcard.json
      const existingSourceQuestions = new Set(
        prevStoredFlashcards.map(fc => fc.sourceQuestion).filter(Boolean) as string[]
      );

      vocabulary.forEach(item => {
        // Check if a card from this JSON item (identified by its question) already exists
        if (!existingSourceQuestions.has(item.question)) {
          const newCardFromSource: Flashcard = {
            id: uuidv4(),
            front: item.question,
            back: item.answer,
            lastReviewed: null,
            nextReviewDate: formatISO(new Date(), { representation: 'date' }),
            interval: 1,
            status: 'new',
            sourceQuestion: item.question, // Store the original question for deduplication
          };
          updatedFlashcards.push(newCardFromSource);
          existingSourceQuestions.add(item.question); // Mark this question as processed
        }
      });
      return updatedFlashcards;
    });
    setIsLoading(false);
  }, [setStoredFlashcards]);

  const addFlashcard = useCallback((data: { front: string; back: string }): Flashcard => {
    const newFlashcard: Flashcard = {
      ...data,
      id: uuidv4(),
      lastReviewed: null,
      nextReviewDate: formatISO(new Date(), { representation: 'date' }),
      interval: 1,
      status: 'new',
      // sourceQuestion is not set for manually added cards
    };
    setStoredFlashcards(prev => [...prev, newFlashcard]);
    return newFlashcard;
  }, [setStoredFlashcards]);

  const updateFlashcard = useCallback((id: string, updates: Partial<Omit<Flashcard, 'id'>>): Flashcard | null => {
    let updatedCard: Flashcard | null = null;
    setStoredFlashcards(prev =>
      prev.map(card => {
        if (card.id === id) {
          updatedCard = { ...card, ...updates };
          // Ensure sourceQuestion is not accidentally wiped if it existed and not in updates
          if (!('sourceQuestion' in updates) && card.sourceQuestion) {
            (updatedCard as Flashcard).sourceQuestion = card.sourceQuestion;
          }
          return updatedCard;
        }
        return card;
      })
    );
    return updatedCard;
  }, [setStoredFlashcards]);

  const deleteFlashcard = useCallback((id: string) => {
    setStoredFlashcards(prev => prev.filter(card => card.id !== id));
  }, [setStoredFlashcards]);

  const getFlashcardById = useCallback((id: string) => {
    return storedFlashcards.find(card => card.id === id);
  }, [storedFlashcards]);

  const getReviewQueue = useCallback(() => {
    if (isLoading) return [];
    const today = formatISO(new Date(), { representation: 'date' });
    return storedFlashcards
      .filter(card => {
        if (card.status === 'mastered') return false;
        if (!card.nextReviewDate) return true; 
        return card.nextReviewDate <= today;
      })
      .sort((a, b) => {
        const dateA = a.nextReviewDate ? parseISO(a.nextReviewDate) : new Date(0);
        const dateB = b.nextReviewDate ? parseISO(b.nextReviewDate) : new Date(0);
        if (dateA.getTime() < dateB.getTime()) return -1;
        if (dateA.getTime() > dateB.getTime()) return 1;
        if (a.status === 'new' && b.status !== 'new') return -1;
        if (b.status === 'new' && a.status !== 'new') return 1;
        return 0;
      });
  }, [storedFlashcards, isLoading]);

  const getStatistics = useCallback(() => {
    if (isLoading) return { total: 0, mastered: 0, learning: 0, new: 0, dueToday: 0 };
    const today = formatISO(new Date(), { representation: 'date' });
    return {
      total: storedFlashcards.length,
      mastered: storedFlashcards.filter(c => c.status === 'mastered').length,
      learning: storedFlashcards.filter(c => c.status === 'learning').length,
      new: storedFlashcards.filter(c => c.status === 'new').length,
      dueToday: storedFlashcards.filter(c => c.status !== 'mastered' && c.nextReviewDate && c.nextReviewDate <= today).length,
    };
  }, [storedFlashcards, isLoading]);

  const contextValue = useMemo(() => ({
    flashcards: isLoading ? EMPTY_FLASHCARDS : storedFlashcards,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    getFlashcardById,
    getReviewQueue,
    getStatistics,
    isLoading,
  }), [storedFlashcards, addFlashcard, updateFlashcard, deleteFlashcard, getFlashcardById, getReviewQueue, getStatistics, isLoading]);

  return (
    <FlashcardsContext.Provider value={contextValue}>
      {children}
    </FlashcardsContext.Provider>
  );
};

export const useFlashcards = () => {
  const context = useContext(FlashcardsContext);
  if (context === undefined) {
    throw new Error('useFlashcards must be used within a FlashcardsProvider');
  }
  return context;
};
