
"use client";
import type { Flashcard, FlashcardSourceDataItem, PerformanceRating } from '@/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import React, { createContext, useContext, ReactNode, useCallback, useMemo, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { formatISO, parseISO } from 'date-fns'; // Added parseISO here
import flashcardJsonData from '../../flashcard.json'; // Import the JSON data

const EMPTY_FLASHCARDS: Flashcard[] = [];

// Helper to construct the 'back' of the card from JSON data
const constructBackFromSource = (item: FlashcardSourceDataItem): string => {
  let backParts: string[] = [];
  if (item.pinyin) backParts.push(`Pinyin: ${item.pinyin}`);
  if (item.explanation) backParts.push(`Explanation: ${item.explanation}`);
  if (item.translation && item.translation !== item.character) backParts.push(`Translation: ${item.translation}`);
  if (item.meaning) backParts.push(`Meaning: ${item.meaning}`);
  if (item.note) backParts.push(`Note: ${item.note}`);
  return backParts.join('\n');
};


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
    const vocabulary = flashcardJsonData.vocabulary as FlashcardSourceDataItem[];
    
    setStoredFlashcards(prevStoredFlashcards => {
      let updatedFlashcards = [...prevStoredFlashcards];
      const existingIdentifiers = new Set(
        prevStoredFlashcards.map(fc => `${fc.originalCharacter}-${fc.originalPinyin}`)
      );

      vocabulary.forEach(item => {
        const identifier = `${item.character}-${item.pinyin}`;
        if (!existingIdentifiers.has(identifier)) {
          const newCardFromSource: Flashcard = {
            id: uuidv4(),
            front: item.character,
            back: constructBackFromSource(item),
            lastReviewed: null,
            nextReviewDate: formatISO(new Date(), { representation: 'date' }),
            interval: 1,
            status: 'new',
            originalCharacter: item.character,
            originalPinyin: item.pinyin,
          };
          updatedFlashcards.push(newCardFromSource);
          existingIdentifiers.add(identifier); // Add to set to prevent re-adding if JSON has duplicates
        }
      });
      return updatedFlashcards;
    });
    setIsLoading(false);
  }, [setStoredFlashcards]); // Run once on mount

  const addFlashcard = useCallback((data: { front: string; back: string }): Flashcard => {
    const newFlashcard: Flashcard = {
      ...data,
      id: uuidv4(),
      lastReviewed: null,
      nextReviewDate: formatISO(new Date(), { representation: 'date' }),
      interval: 1,
      status: 'new',
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
          // Ensure originalCharacter and originalPinyin are not accidentally wiped if not in updates
          if (!('originalCharacter' in updates) && card.originalCharacter) {
            (updatedCard as Flashcard).originalCharacter = card.originalCharacter;
          }
          if (!('originalPinyin' in updates) && card.originalPinyin) {
            (updatedCard as Flashcard).originalPinyin = card.originalPinyin;
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

