
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
  limit, // Added limit import
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
      // Check if any cards exist already from the seed source to prevent re-seeding.
      const existingSeedQuery = query(flashcardsCollectionRef, where("sourceQuestion", "!=", ""), limit(1));
      const existingSeedSnapshot = await getDocs(existingSeedQuery);

      if (!existingSeedSnapshot.empty) {
        console.log("Skipping seed: User already has cards sourced from JSON.");
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
          console.log("No vocabulary found in flashcard.json to seed.");
          setIsSeeding(false);
          return;
      }
      
      const batch = writeBatch(db);
      const nowServerTime = serverTimestamp();

      vocabulary.forEach(item => {
        const newCardDocRef = doc(flashcardsCollectionRef); 
        const newCardFromSource: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
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
      console.log(`Seeded ${vocabulary.length} cards into deck "${DEFAULT_SEED_DECK_NAME}".`);
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
        // Check if the user has *any* flashcards at all before attempting to seed.
        const flashcardsQuery = query(collection(db, 'users', user.uid, 'flashcards'), limit(1));
        const flashcardsSnapshot = await getDocs(flashcardsQuery);
        if (flashcardsSnapshot.empty) { 
          console.log("User has no flashcards, attempting to seed initial data.");
          await seedInitialData(user);
        } else {
          console.log("User already has flashcards, skipping initial seed.");
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
              createdAt: data.createdAt instanceof Timestamp ? formatISO(data.createdAt.toDate()) : (typeof data.createdAt === 'string' ? data.createdAt : null),
              updatedAt: data.updatedAt instanceof Timestamp ? formatISO(data.updatedAt.toDate()) : (typeof data.updatedAt === 'string' ? data.updatedAt : null),
              lastReviewed: data.lastReviewed instanceof Timestamp ? formatISO(data.lastReviewed.toDate()) : data.lastReviewed,
              nextReviewDate: data.nextReviewDate instanceof Timestamp ? formatISO(data.nextReviewDate.toDate()) : data.nextReviewDate,
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
              createdAt: data.createdAt instanceof Timestamp ? formatISO(data.createdAt.toDate()) : (typeof data.createdAt === 'string' ? data.createdAt : null),
              updatedAt: data.updatedAt instanceof Timestamp ? formatISO(data.updatedAt.toDate()) : (typeof data.updatedAt === 'string' ? data.updatedAt : null),
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
      }).catch(err => {
        console.error("Error during checkAndSeed process:", err);
        setIsLoading(false);
        setIsLoadingDecks(false);
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
      const localCreatedAt = formatISO(new Date());
      return { id: docRef.id, ...newFlashcardData, createdAt: localCreatedAt, updatedAt: localCreatedAt } as Flashcard;
    } catch (error) {
      console.error("Error adding flashcard:", error);
      return null;
    }
  }, [user]);

  const updateFlashcard = useCallback(async (id: string, updates: Partial<Omit<Flashcard, 'id' | 'createdAt'>>): Promise<Flashcard | null> => {
    if (!user || !user.uid) {
      console.error("User not authenticated to update flashcard");
      return null;
    }
    try {
      const flashcardDocRef = doc(db, 'users', user.uid, 'flashcards', id);
      const currentCard = flashcards.find(f=>f.id === id);
      const deckIdToUpdate = updates.deckId === undefined ? (currentCard?.deckId || null) : (updates.deckId || null);
      const updateData = { ...updates, deckId: deckIdToUpdate, updatedAt: serverTimestamp() };
      
      await updateDoc(flashcardDocRef, updateData);
      
      const card = flashcards.find(fc => fc.id === id);
      return card ? { ...card, ...updates, deckId: updateData.deckId, updatedAt: formatISO(new Date()) } : null;
    } catch (error) {
      console.error("Error updating flashcard:", error);
      return null;
    }
  }, [user, flashcards]);

  const deleteFlashcard = useCallback(async (id: string) => {
    if (!user || !user.uid) {
      console.error("User not authenticated to delete flashcard");
      return;
    }
    try {
      const flashcardDocRef = doc(db, 'users', user.uid, 'flashcards', id);
      await deleteDoc(flashcardDocRef);
    } catch (error) {
      console.error("Error deleting flashcard:", error);
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
    try {
      const decksCollectionRef = collection(db, 'users', user.uid, 'decks');
      const now = serverTimestamp();
      const newDeckData = {
        name,
        userId: user.uid,
      };
      const docRef = await addDoc(decksCollectionRef, {...newDeckData, createdAt: now, updatedAt: now });
      const localCreatedAt = formatISO(new Date());
      return { id: docRef.id, ...newDeckData, createdAt: localCreatedAt, updatedAt: localCreatedAt } as Deck;
    } catch (error) {
      console.error("Error adding deck:", error);
      return null;
    }
  }, [user]);

  const updateDeck = useCallback(async (id: string, updates: Partial<Omit<Deck, 'id' | 'userId' | 'createdAt'>>): Promise<Deck | null> => {
    if (!user || !user.uid) {
      console.error("User not authenticated to update deck");
      return null;
    }
    try {
      const deckDocRef = doc(db, 'users', user.uid, 'decks', id);
      const updateData = { ...updates, updatedAt: serverTimestamp() };
      await updateDoc(deckDocRef, updateData);
      const deck = decks.find(d => d.id === id);
      return deck ? { ...deck, ...updates, updatedAt: formatISO(new Date()) } : null;
    } catch (error) {
      console.error("Error updating deck:", error);
      return null;
    }
  }, [user, decks]);

  const deleteDeck = useCallback(async (id: string) => {
    if (!user || !user.uid) {
      console.error("User not authenticated to delete deck");
      return;
    }
    try {
      await runTransaction(db, async (transaction) => {
        const deckDocRef = doc(db, 'users', user.uid, 'decks', id);
        
        // Find all flashcards associated with this deck
        const flashcardsQuery = query(collection(db, 'users', user.uid, 'flashcards'), where("deckId", "==", id));
        const flashcardsSnapshot = await getDocs(flashcardsQuery);
        
        flashcardsSnapshot.docs.forEach(flashcardDoc => {
          transaction.delete(flashcardDoc.ref);
        });
        
        transaction.delete(deckDocRef);
      });
    } catch (error) {
      console.error("Error deleting deck and associated flashcards:", error);
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
        try {
          // Ensure nextReviewDate is a valid date string before parsing
          if (typeof card.nextReviewDate === 'string' && card.nextReviewDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return card.nextReviewDate <= today;
          }
          return true; // If format is unexpected, assume it's due to be safe or handle error
        } catch (e) {
          console.warn(`Invalid date format for nextReviewDate: ${card.nextReviewDate} for card ${card.id}`);
          return true; // Or some other default behavior
        }
      })
      .sort((a, b) => {
        const dateA = a.nextReviewDate && typeof a.nextReviewDate === 'string' && a.nextReviewDate.match(/^\d{4}-\d{2}-\d{2}$/) ? parseISO(a.nextReviewDate) : new Date(0); 
        const dateB = b.nextReviewDate && typeof b.nextReviewDate === 'string' && b.nextReviewDate.match(/^\d{4}-\d{2}-\d{2}$/) ? parseISO(b.nextReviewDate) : new Date(0);
        
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
    const dueTodayCount = flashcards.filter(c => {
        if (c.status === 'mastered') return false;
        if (!c.nextReviewDate) return true;
        if (typeof c.nextReviewDate === 'string' && c.nextReviewDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return c.nextReviewDate <= today;
        }
        return true; 
    }).length;

    return {
      total: flashcards.length,
      mastered: flashcards.filter(c => c.status === 'mastered').length,
      learning: flashcards.filter(c => c.status === 'learning').length,
      new: flashcards.filter(c => c.status === 'new').length,
      dueToday: dueTodayCount,
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
    isLoading: isLoading || (user && isSeeding), 
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

