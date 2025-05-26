
"use client";
import type { Flashcard } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import React, { createContext, useContext, ReactNode, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, addDays, parseISO } from 'date-fns';

// Define a stable reference for the empty flashcards array
const EMPTY_FLASHCARDS: Flashcard[] = [];

interface FlashcardsContextType {
  flashcards: Flashcard[];
  addFlashcard: (data: { front: string; back: string }) => Flashcard;
  updateFlashcard: (id: string, updates: Partial<Omit<Flashcard, 'id'>>) => Flashcard | null;
  deleteFlashcard: (id: string) => void;
  getFlashcardById: (id: string) => Flashcard | undefined;
  getReviewQueue: () => Flashcard[];
  getStatistics: () => { total: number; mastered: number; learning: number; new: number; dueToday: number };
}

const FlashcardsContext = createContext<FlashcardsContextType | undefined>(undefined);

export const FlashcardsProvider = ({ children }: { children: ReactNode }) => {
  const [flashcards, setFlashcards] = useLocalStorage<Flashcard[]>('flashcards', EMPTY_FLASHCARDS);

  const addFlashcard = useCallback((data: { front: string; back: string }): Flashcard => {
    const newFlashcard: Flashcard = {
      ...data,
      id: uuidv4(),
      lastReviewed: null,
      nextReviewDate: formatISO(new Date(), { representation: 'date' }), // Due immediately
      interval: 1,
      status: 'new',
    };
    setFlashcards(prev => [...prev, newFlashcard]);
    return newFlashcard;
  }, [setFlashcards]);

  const updateFlashcard = useCallback((id: string, updates: Partial<Omit<Flashcard, 'id'>>): Flashcard | null => {
    let updatedCard: Flashcard | null = null;
    setFlashcards(prev =>
      prev.map(card => {
        if (card.id === id) {
          updatedCard = { ...card, ...updates };
          return updatedCard;
        }
        return card;
      })
    );
    return updatedCard;
  }, [setFlashcards]);

  const deleteFlashcard = useCallback((id: string) => {
    setFlashcards(prev => prev.filter(card => card.id !== id));
  }, [setFlashcards]);

  const getFlashcardById = useCallback((id: string) => {
    return flashcards.find(card => card.id === id);
  }, [flashcards]);

  const getReviewQueue = useCallback(() => {
    const today = formatISO(new Date(), { representation: 'date' });
    return flashcards
      .filter(card => {
        if (card.status === 'mastered') return false;
        if (!card.nextReviewDate) return true; // New cards are implicitly due
        return card.nextReviewDate <= today;
      })
      .sort((a, b) => { // Sort by nextReviewDate, then by creation order (implicitly by 'new' status)
        const dateA = a.nextReviewDate ? parseISO(a.nextReviewDate) : new Date(0); // Oldest for null
        const dateB = b.nextReviewDate ? parseISO(b.nextReviewDate) : new Date(0);
        if (dateA < dateB) return -1;
        if (dateA > dateB) return 1;
        // if dates are same, new cards first
        if (a.status === 'new' && b.status !== 'new') return -1;
        if (b.status === 'new' && a.status !== 'new') return 1;
        return 0;
      });
  }, [flashcards]);

  const getStatistics = useCallback(() => {
    const today = formatISO(new Date(), { representation: 'date' });
    return {
      total: flashcards.length,
      mastered: flashcards.filter(c => c.status === 'mastered').length,
      learning: flashcards.filter(c => c.status === 'learning').length,
      new: flashcards.filter(c => c.status === 'new').length,
      dueToday: flashcards.filter(c => c.status !== 'mastered' && c.nextReviewDate && c.nextReviewDate <= today).length,
    };
  }, [flashcards]);

  const contextValue = useMemo(() => ({
    flashcards,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    getFlashcardById,
    getReviewQueue,
    getStatistics,
  }), [flashcards, addFlashcard, updateFlashcard, deleteFlashcard, getFlashcardById, getReviewQueue, getStatistics]);


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
