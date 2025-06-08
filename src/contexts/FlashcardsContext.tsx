
"use client";
import type { Flashcard, FlashcardSourceDataItem, AppUser, Deck } from '@/types';
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
  where,
  getDoc,
  runTransaction,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { formatISO, parseISO } from 'date-fns';
import flashcardJsonData from '../../flashcard.json';

const EMPTY_FLASHCARDS: Flashcard[] = [];
const EMPTY_DECKS: Deck[] = [];
const DEFAULT_SEED_DECK_NAME = "Imported Vocabulary";

interface FlashcardsContextType {
  flashcards: Flashcard[];
  decks: Deck[];
  addFlashcard: (data: { front: string; back: string; deckId?: string | null }) => Promise<Flashcard | null>;
  updateFlashcard: (id: string, updates: Partial<Omit<Flashcard, 'id'>>) => Promise<Flashcard | null>;
  deleteFlashcard: (id: string) => Promise<void>;
  getFlashcardById: (id: string) => Flashcard | undefined;
  
  addDeck: (name: string) => Promise<Deck | null>;
  updateDeck: (id: string, updates: Partial<Omit<Deck, 'id' | 'userId'>>) => Promise<Deck | null>;
  deleteDeck: (id: string) => Promise<void>;
  getDeckById: (id: string) => Deck | undefined;

  getReviewQueue: () => Flashcard[];
  getStatistics: () => { total: number; mastered: number; learning: number; new: number; dueToday: number };
  isLoading: boolean; // For flashcard data loading
  isLoadingDecks: boolean;
  isSeeding: boolean; // For initial data seeding
}

const FlashcardsContext = createContext<FlashcardsContextType | undefined>(undefined);

export const FlashcardsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>(EMPTY_FLASHCARDS);
  const [decks, setDecks] = useState<Deck[]>(EMPTY_DECKS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const seedInitialData = useCallback(async (currentUser: AppUser) => {
    if (!currentUser || !currentUser.uid) return;
    setIsSeeding(true);
    try {
      const flashcardsCollectionRef = collection(db, 'users', currentUser.uid, 'flashcards');
      const existingCardsSnapshot = await getDocs(query(flashcardsCollectionRef, where("sourceQuestion", "!=", ""))); // Check for cards from seed

      if (!existingCardsSnapshot.empty) {
        setIsSeeding(false);
        return; 
      }
      
      const decksCollectionRef = collection(db, 'users', currentUser.uid, 'decks');
      let seedDeckId: string | null = null;

      // Find or create the default deck for seeded cards
      const seedDeckQuery = query(decksCollectionRef, where("name", "==", DEFAULT_SEED_DECK_NAME));
      const seedDeckSnapshot = await getDocs(seedDeckQuery);

      if (seedDeckSnapshot.empty) {
        const now = serverTimestamp();
        const newDeckDocRef = await addDoc(decksCollectionRef, {
          name: DEFAULT_SEED_DECK_NAME,
          userId: currentUser.uid,
          createdAt: now,
          updatedAt: now,
        });
        seedDeckId = newDeckDocRef.id;
      } else {
        seedDeckId = seedDeckSnapshot.docs[0].id;
      }

      if (!seedDeckId) {
        console.error("Could not obtain seed deck ID.");
        setIsSeeding(false);
        return;
      }

      const vocabulary = flashcardJsonData.vocabulary as FlashcardSourceDataItem[];
      if (vocabulary.length === 0) {
          setIsSeeding(false);
          return;
      }
      
      const batch = writeBatch(db);
      const nowServerTime = serverTimestamp();

      vocabulary.forEach(item => {
        const newCardDocRef = doc(flashcardsCollectionRef); 
        const newCardFromSource = {
          front: item.question,
          back: item.answer,
          deckId: seedDeckId,
          lastReviewed: null,
          nextReviewDate: formatISO(new Date(), { representation: 'date' }),
          interval: 1,
          status: 'new' as 'new',
          sourceQuestion: item.question, // Mark as sourced from JSON
          createdAt: nowServerTime, 
          updatedAt: nowServerTime,
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
      setIsLoadingDecks(true);
      
      const checkAndSeed = async () => {
        const flashcardsQuery = query(collection(db, 'users', user.uid, 'flashcards'), limit(1));
        const flashcardsSnapshot = await getDocs(flashcardsQuery);
        if (flashcardsSnapshot.empty) { // Only seed if user has NO cards at all
          await seedInitialData(user);
        }
      };

      checkAndSeed().then(() => {
        const flashcardsCollectionRef = collection(db, 'users', user.uid, 'flashcards');
        const qFlashcards = query(flashcardsCollectionRef, orderBy('createdAt', 'desc'));
        const unsubscribeFlashcards = onSnapshot(qFlashcards, (snapshot) => {
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

        const decksCollectionRef = collection(db, 'users', user.uid, 'decks');
        const qDecks = query(decksCollectionRef, orderBy('createdAt', 'desc'));
        const unsubscribeDecks = onSnapshot(qDecks, (snapshot) => {
          const fetchedDecks = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: data.createdAt?.toDate ? formatISO(data.createdAt.toDate()) : null,
              updatedAt: data.updatedAt?.toDate ? formatISO(data.updatedAt.toDate()) : null,
            } as Deck;
          });
          setDecks(fetchedDecks);
          setIsLoadingDecks(false);
        }, (error) => {
          console.error("Error fetching decks:", error);
          setIsLoadingDecks(false);
          setDecks(EMPTY_DECKS);
        });

        return () => {
          unsubscribeFlashcards();
          unsubscribeDecks();
        };
      });

    } else {
      setFlashcards(EMPTY_FLASHCARDS);
      setDecks(EMPTY_DECKS);
      setIsLoading(false);
      setIsLoadingDecks(false);
    }
  }, [user, seedInitialData]);

  const addFlashcard = useCallback(async (data: { front: string; back: string; deckId?: string | null }): Promise<Flashcard | null> => {
    if (!user || !user.uid) {
      console.error("User not authenticated to add flashcard");
      return null;
    }
    // setIsLoading(true); // Handled by onSnapshot
    try {
      const flashcardsCollectionRef = collection(db, 'users', user.uid, 'flashcards');
      const now = serverTimestamp();
      const newFlashcardData: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'> = {
        front: data.front,
        back: data.back,
        deckId: data.deckId || null,
        lastReviewed: null,
        nextReviewDate: formatISO(new Date(), { representation: 'date' }),
        interval: 1,
        status: 'new' as 'new',
      };
      const docRef = await addDoc(flashcardsCollectionRef, { ...newFlashcardData, createdAt: now, updatedAt: now });
      // setIsLoading(false);
      return { id: docRef.id, ...newFlashcardData, createdAt: formatISO(new Date()), updatedAt: formatISO(new Date()) } as Flashcard;
    } catch (error) {
      console.error("Error adding flashcard:", error);
      // setIsLoading(false);
      return null;
    }
  }, [user]);

  const updateFlashcard = useCallback(async (id: string, updates: Partial<Omit<Flashcard, 'id' | 'createdAt'>>): Promise<Flashcard | null> => {
    if (!user || !user.uid) {
      console.error("User not authenticated to update flashcard");
      return null;
    }
    // setIsLoading(true);
    try {
      const flashcardDocRef = doc(db, 'users', user.uid, 'flashcards', id);
      // Ensure deckId is explicitly set to null if undefined in updates, to clear it
      const updateData = { ...updates, deckId: updates.deckId === undefined ? (flashcards.find(f=>f.id === id)?.deckId || null) : (updates.deckId || null), updatedAt: serverTimestamp() };
      await updateDoc(flashcardDocRef, updateData);
      // setIsLoading(false);
      const card = flashcards.find(fc => fc.id === id);
      return card ? { ...card, ...updates, deckId: updateData.deckId, updatedAt: formatISO(new Date()) } : null;
    } catch (error) {
      console.error("Error updating flashcard:", error);
      // setIsLoading(false);
      return null;
    }
  }, [user, flashcards]);

  const deleteFlashcard = useCallback(async (id: string) => {
    if (!user || !user.uid) {
      console.error("User not authenticated to delete flashcard");
      return;
    }
    // setIsLoading(true);
    try {
      const flashcardDocRef = doc(db, 'users', user.uid, 'flashcards', id);
      await deleteDoc(flashcardDocRef);
      // setIsLoading(false); 
    } catch (error) {
      console.error("Error deleting flashcard:", error);
      // setIsLoading(false);
    }
  }, [user]);

  const getFlashcardById = useCallback((id: string) => {
    return flashcards.find(card => card.id === id);
  }, [flashcards]);

  // Deck Management
  const addDeck = useCallback(async (name: string): Promise<Deck | null> => {
    if (!user || !user.uid) {
      console.error("User not authenticated to add deck");
      return null;
    }
    // setIsLoadingDecks(true);
    try {
      const decksCollectionRef = collection(db, 'users', user.uid, 'decks');
      const now = serverTimestamp();
      const newDeckData = {
        name,
        userId: user.uid,
        createdAt: now,
        updatedAt: now,
      };
      const docRef = await addDoc(decksCollectionRef, newDeckData);
      // setIsLoadingDecks(false);
      return { id: docRef.id, ...newDeckData, createdAt: formatISO(new Date()), updatedAt: formatISO(new Date()) } as Deck;
    } catch (error) {
      console.error("Error adding deck:", error);
      // setIsLoadingDecks(false);
      return null;
    }
  }, [user]);

  const updateDeck = useCallback(async (id: string, updates: Partial<Omit<Deck, 'id' | 'userId' | 'createdAt'>>): Promise<Deck | null> => {
    if (!user || !user.uid) {
      console.error("User not authenticated to update deck");
      return null;
    }
    // setIsLoadingDecks(true);
    try {
      const deckDocRef = doc(db, 'users', user.uid, 'decks', id);
      const updateData = { ...updates, updatedAt: serverTimestamp() };
      await updateDoc(deckDocRef, updateData);
      // setIsLoadingDecks(false);
      const deck = decks.find(d => d.id === id);
      return deck ? { ...deck, ...updates, updatedAt: formatISO(new Date()) } : null;
    } catch (error) {
      console.error("Error updating deck:", error);
      // setIsLoadingDecks(false);
      return null;
    }
  }, [user, decks]);

  const deleteDeck = useCallback(async (id: string) => {
    if (!user || !user.uid) {
      console.error("User not authenticated to delete deck");
      return;
    }
    // setIsLoadingDecks(true);
    // setIsLoading(true); // Also loading flashcards potentially
    try {
      const batch = writeBatch(db);
      const deckDocRef = doc(db, 'users', user.uid, 'decks', id);
      batch.delete(deckDocRef);

      // Find and delete all flashcards associated with this deck
      const flashcardsQuery = query(collection(db, 'users', user.uid, 'flashcards'), where("deckId", "==", id));
      const flashcardsSnapshot = await getDocs(flashcardsQuery);
      flashcardsSnapshot.docs.forEach(flashcardDoc => {
        batch.delete(flashcardDoc.ref);
      });

      await batch.commit();
      // setIsLoadingDecks(false);
      // setIsLoading(false);
    } catch (error) {
      console.error("Error deleting deck and associated flashcards:", error);
      // setIsLoadingDecks(false);
      // setIsLoading(false);
    }
  }, [user]);
  
  const getDeckById = useCallback((id: string) => {
    return decks.find(deck => deck.id === id);
  }, [decks]);


  const getReviewQueue = useCallback(() => {
    if (isLoading || !user) return [];
    const today = formatISO(new Date(), { representation: 'date' });
    return flashcards
      .filter(card => {
        if (card.status === 'mastered') return false;
        if (!card.nextReviewDate) return true; // New cards are always due
        return card.nextReviewDate <= today;
      })
      .sort((a, b) => {
        const dateA = a.nextReviewDate ? parseISO(a.nextReviewDate) : new Date(0); // Treat null as very old
        const dateB = b.nextReviewDate ? parseISO(b.nextReviewDate) : new Date(0);
        if (dateA.getTime() < dateB.getTime()) return -1;
        if (dateA.getTime() > dateB.getTime()) return 1;
        // Prioritize 'new' cards if dates are the same
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
    decks: user ? decks : EMPTY_DECKS,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
    getFlashcardById,
    addDeck,
    updateDeck,
    deleteDeck,
    getDeckById,
    getReviewQueue,
    getStatistics,
    isLoading: isLoading || (user && isSeeding), // Combined loading state
    isLoadingDecks: isLoadingDecks || (user && isSeeding),
    isSeeding,
  }), [
      flashcards, decks, addFlashcard, updateFlashcard, deleteFlashcard, getFlashcardById, 
      addDeck, updateDeck, deleteDeck, getDeckById,
      getReviewQueue, getStatistics, isLoading, isLoadingDecks, user, isSeeding
    ]);

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
