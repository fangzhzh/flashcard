
"use client";
import type { Flashcard, FlashcardSourceDataItem, AppUser } from '@/types';
import React, { createContext, useContext, ReactNode, useCallback, useMemo, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
  getDocs,
  writeBatch,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { formatISO, parseISO } from 'date-fns';
import flashcardJsonData from '../../flashcard.json';

const EMPTY_FLASHCARDS: Flashcard[] = [];

interface FlashcardsContextType {
  flashcards: Flashcard[];
  addFlashcard: (data: { front: string; back: string }) => Promise<Flashcard | null>;
  updateFlashcard: (id: string, updates: Partial<Omit<Flashcard, 'id'>>) => Promise<Flashcard | null>;
  deleteFlashcard: (id: string) => Promise<void>;
  getFlashcardById: (id: string) => Flashcard | undefined;
  getReviewQueue: () => Flashcard[];
  getStatistics: () => { total: number; mastered: number; learning: number; new: number; dueToday: number };
  isLoading: boolean; // For flashcard data loading
  isSeeding: boolean; // For initial data seeding
}

const FlashcardsContext = createContext<FlashcardsContextType | undefined>(undefined);

export const FlashcardsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>(EMPTY_FLASHCARDS);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedInitialData = useCallback(async (currentUser: AppUser) => {
    if (!currentUser || !currentUser.uid) return;
    setIsSeeding(true);
    try {
      const flashcardsCollectionRef = collection(db, 'users', currentUser.uid, 'flashcards');
      const existingCardsSnapshot = await getDocs(flashcardsCollectionRef);

      if (!existingCardsSnapshot.empty) {
        setIsSeeding(false);
        return; // Data already exists or seeded
      }

      const vocabulary = flashcardJsonData.vocabulary as FlashcardSourceDataItem[];
      const batch = writeBatch(db);
      const now = serverTimestamp();

      vocabulary.forEach(item => {
        const newCardDocRef = doc(flashcardsCollectionRef); // Auto-generate ID
        const newCardFromSource: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: Timestamp, updatedAt: Timestamp } = {
          front: item.question,
          back: item.answer,
          lastReviewed: null,
          nextReviewDate: formatISO(new Date(), { representation: 'date' }),
          interval: 1,
          status: 'new',
          sourceQuestion: item.question,
          createdAt: now as Timestamp, // Firestore will convert serverTimestamp
          updatedAt: now as Timestamp,
        };
        batch.set(newCardDocRef, newCardFromSource);
      });

      await batch.commit();
    } catch (error) {
      console.error("Error seeding initial flashcards:", error);
    } finally {
      setIsSeeding(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.uid) {
      setIsLoading(true);
      
      // Check for seeding condition first
      const checkAndSeed = async () => {
        const flashcardsCollectionRef = collection(db, 'users', user.uid, 'flashcards');
        const existingCardsSnapshot = await getDocs(flashcardsCollectionRef);
        if (existingCardsSnapshot.empty) {
          await seedInitialData(user);
        }
      };

      checkAndSeed().then(() => {
        const flashcardsCollectionRef = collection(db, 'users', user.uid, 'flashcards');
        const q = query(flashcardsCollectionRef, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const fetchedFlashcards = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? formatISO(data.createdAt.toDate()) : null,
              updatedAt: data.updatedAt?.toDate ? formatISO(data.updatedAt.toDate()) : null,
            } as Flashcard;
          });
          setFlashcards(fetchedFlashcards);
          setIsLoading(false);
        }, (error) => {
          console.error("Error fetching flashcards:", error);
          setIsLoading(false);
          setFlashcards(EMPTY_FLASHCARDS);
        });
        return () => unsubscribe();
      });

    } else {
      setFlashcards(EMPTY_FLASHCARDS);
      setIsLoading(false);
    }
  }, [user, seedInitialData]);

  const addFlashcard = useCallback(async (data: { front: string; back: string }): Promise<Flashcard | null> => {
    if (!user || !user.uid) {
      console.error("User not authenticated to add flashcard");
      return null;
    }
    setIsLoading(true);
    try {
      const flashcardsCollectionRef = collection(db, 'users', user.uid, 'flashcards');
      const now = serverTimestamp();
      const newFlashcardData = {
        ...data,
        lastReviewed: null,
        nextReviewDate: formatISO(new Date(), { representation: 'date' }),
        interval: 1,
        status: 'new' as 'new' | 'learning' | 'mastered',
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(flashcardsCollectionRef, newFlashcardData);
      setIsLoading(false);
      // Optimistically, we could update local state, but onSnapshot will handle it.
      // For now, return the shape of what was added, Firestore ID will come from snapshot.
      return { id: docRef.id, ...newFlashcardData, createdAt: formatISO(new Date()), updatedAt: formatISO(new Date()) } as Flashcard;
    } catch (error) {
      console.error("Error adding flashcard:", error);
      setIsLoading(false);
      return null;
    }
  }, [user]);

  const updateFlashcard = useCallback(async (id: string, updates: Partial<Omit<Flashcard, 'id' | 'createdAt'>>): Promise<Flashcard | null> => {
    if (!user || !user.uid) {
      console.error("User not authenticated to update flashcard");
      return null;
    }
    setIsLoading(true);
    try {
      const flashcardDocRef = doc(db, 'users', user.uid, 'flashcards', id);
      const updateData = { ...updates, updatedAt: serverTimestamp() };
      await updateDoc(flashcardDocRef, updateData);
      setIsLoading(false);
      // onSnapshot will update local state.
      const card = flashcards.find(fc => fc.id === id);
      return card ? { ...card, ...updates, updatedAt: formatISO(new Date()) } : null;
    } catch (error) {
      console.error("Error updating flashcard:", error);
      setIsLoading(false);
      return null;
    }
  }, [user, flashcards]);

  const deleteFlashcard = useCallback(async (id: string) => {
    if (!user || !user.uid) {
      console.error("User not authenticated to delete flashcard");
      return;
    }
    setIsLoading(true);
    try {
      const flashcardDocRef = doc(db, 'users', user.uid, 'flashcards', id);
      await deleteDoc(flashcardDocRef);
      setIsLoading(false); // onSnapshot will update local state.
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      setIsLoading(false);
    }
  }, [user]);

  const getFlashcardById = useCallback((id: string) => {
    return flashcards.find(card => card.id === id);
  }, [flashcards]);

  const getReviewQueue = useCallback(() => {
    if (isLoading || !user) return [];
    const today = formatISO(new Date(), { representation: 'date' });
    return flashcards
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
  }, [flashcards, isLoading, user]);

  const getStatistics = useCallback(() => {
    if (isLoading || !user) return { total: 0, mastered: 0, learning: 0, new: 0, dueToday: 0 };
    const today = formatISO(new Date(), { representation: 'date' });
    return {
      total: flashcards.length,
      mastered: flashcards.filter(c => c.status === 'mastered').length,
      learning: flashcards.filter(c => c.status === 'learning').length,
      new: flashcards.filter(c => c.status === 'new').length,
      dueToday: flashcards.filter(c => c.status !== 'mastered' && c.nextReviewDate && c.nextReviewDate <= today).length,
    };
  }, [flashcards, isLoading, user]);

  const contextValue = useMemo(() => ({
    flashcards: user ? flashcards : EMPTY_FLASHCARDS,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    getFlashcardById,
    getReviewQueue,
    getStatistics,
    isLoading: isLoading || isSeeding,
    isSeeding,
  }), [flashcards, addFlashcard, updateFlashcard, deleteFlashcard, getFlashcardById, getReviewQueue, getStatistics, isLoading, user, isSeeding]);

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
