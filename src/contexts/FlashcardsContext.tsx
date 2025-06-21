
"use client";
import type { Flashcard, FlashcardSourceDataItem, AppUser, Deck, Task, TaskStatus, RepeatFrequency, TimeInfo, ArtifactLink, ReminderInfo, TaskType, CheckinInfo, Overview } from '@/types';
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
  limit,
  getCountFromServer,
} from 'firebase/firestore';
import { useAuth } from './AuthContext';
import { formatISO, parseISO, subDays } from 'date-fns';
import flashcardJsonData from '../../flashcard.json';

const EMPTY_FLASHCARDS: Flashcard[] = [];
const EMPTY_DECKS: Deck[] = [];
const EMPTY_TASKS: Task[] = [];
const EMPTY_OVERVIEWS: Overview[] = [];
const DEFAULT_SEED_DECK_NAME = "Imported Vocabulary";

interface FlashcardsContextType {
  flashcards: Flashcard[];
  decks: Deck[];
  tasks: Task[];
  overviews: Overview[];

  addFlashcard: (data: { front: string; back: string; deckId?: string | null }) => Promise<Flashcard | null>;
  updateFlashcard: (id: string, updates: Partial<Omit<Flashcard, 'id'>>) => Promise<Flashcard | null>;
  deleteFlashcard: (id: string) => Promise<void>;
  getFlashcardById: (id: string) => Flashcard | undefined;

  addDeck: (name: string) => Promise<Deck | null>;
  updateDeck: (id: string, updates: Partial<Omit<Deck, 'id' | 'userId'>>) => Promise<Deck | null>;
  deleteDeck: (id: string) => Promise<void>;
  getDeckById: (id: string) => Deck | undefined;

  addTask: (data: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<void>;
  getTaskById: (id: string) => Task | undefined;
  getCompletedTasksCountLast30Days: () => Promise<number>;
  fetchCompletedTasksLast30Days: () => Promise<Task[]>;

  addOverview: (data: { title: string; description?: string | null }) => Promise<Overview | null>;
  updateOverview: (id: string, updates: Partial<Omit<Overview, 'id' | 'userId'>>) => Promise<Overview | null>;
  deleteOverview: (id: string) => Promise<void>;
  getOverviewById: (id: string) => Overview | undefined;

  getReviewQueue: () => Flashcard[];
  getStatistics: () => { total: number; mastered: number; learning: number; new: number; dueToday: number };
  isLoading: boolean;
  isLoadingDecks: boolean;
  isLoadingTasks: boolean;
  isLoadingOverviews: boolean;
  isSeeding: boolean;
}

const FlashcardsContext = createContext<FlashcardsContextType | undefined>(undefined);

export const FlashcardsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [flashcards, setFlashcards] = useState<Flashcard[]>(EMPTY_FLASHCARDS);
  const [decks, setDecks] = useState<Deck[]>(EMPTY_DECKS);
  const [tasks, setTasks] = useState<Task[]>(EMPTY_TASKS);
  const [overviews, setOverviews] = useState<Overview[]>(EMPTY_OVERVIEWS);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDecks, setIsLoadingDecks] = useState(true);
  const [isLoadingTasks, setIsLoadingTasks] = useState(true);
  const [isLoadingOverviews, setIsLoadingOverviews] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  const mapFirestoreDocToTask = (docSnapshot: any): Task => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      type: data.type || 'innie',
      isSilent: data.isSilent || false, // Add isSilent mapping
      createdAt: data.createdAt instanceof Timestamp ? formatISO(data.createdAt.toDate()) : (typeof data.createdAt === 'string' ? data.createdAt : null),
      updatedAt: data.updatedAt instanceof Timestamp ? formatISO(data.updatedAt.toDate()) : (typeof data.updatedAt === 'string' ? data.updatedAt : null),
      timeInfo: {
        ...data.timeInfo,
        startDate: data.timeInfo?.startDate instanceof Timestamp ? formatISO(data.timeInfo.startDate.toDate()) : data.timeInfo?.startDate,
        endDate: data.timeInfo?.endDate instanceof Timestamp ? formatISO(data.timeInfo.endDate.toDate()) : data.timeInfo?.endDate,
      },
      artifactLink: data.artifactLink || { flashcardId: null },
      reminderInfo: data.reminderInfo || { type: 'none' },
      checkinInfo: data.checkinInfo || null,
      overviewId: data.overviewId || null,
    } as Task;
  };

  const mapFirestoreDocToOverview = (docSnapshot: any): Overview => {
    const data = docSnapshot.data();
    return {
      id: docSnapshot.id,
      ...data,
      createdAt: data.createdAt instanceof Timestamp ? formatISO(data.createdAt.toDate()) : (typeof data.createdAt === 'string' ? data.createdAt : null),
      updatedAt: data.updatedAt instanceof Timestamp ? formatISO(data.updatedAt.toDate()) : (typeof data.updatedAt === 'string' ? data.updatedAt : null),
    } as Overview;
  }


  const seedInitialData = useCallback(async (currentUser: AppUser) => {
    if (!currentUser || !currentUser.uid) return;
    setIsSeeding(true);
    try {
      const flashcardsCollectionRef = collection(db, 'users', currentUser.uid, 'flashcards');
      const existingSeedQuery = query(flashcardsCollectionRef, where("sourceQuestion", "!=", ""), limit(1));
      const existingSeedSnapshot = await getDocs(existingSeedQuery);

      if (!existingSeedSnapshot.empty) {
        setIsSeeding(false);
        return;
      }

      const decksCollectionRef = collection(db, 'users', currentUser.uid, 'decks');
      let seedDeckId: string | null = null;
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
        const newCardFromSource: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: any, updatedAt: any } = {
          front: item.question,
          back: item.answer,
          deckId: seedDeckId,
          lastReviewed: null,
          nextReviewDate: formatISO(new Date(), { representation: 'date' }),
          interval: 1,
          status: 'new' as 'new',
          sourceQuestion: item.question,
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
      setIsLoadingTasks(true);
      setIsLoadingOverviews(true);

      const checkAndSeed = async () => {
        const flashcardsQuery = query(collection(db, 'users', user.uid, 'flashcards'), limit(1));
        const flashcardsSnapshot = await getDocs(flashcardsQuery);
        if (flashcardsSnapshot.empty) {
          await seedInitialData(user);
        }
      };

      checkAndSeed().then(() => {
        const flashcardsCollectionRef = collection(db, 'users', user.uid, 'flashcards');
        const qFlashcards = query(flashcardsCollectionRef, orderBy('createdAt', 'desc'));
        const unsubscribeFlashcards = onSnapshot(qFlashcards, (snapshot) => {
          const fetchedFlashcards = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id, ...data,
              createdAt: data.createdAt instanceof Timestamp ? formatISO(data.createdAt.toDate()) : (typeof data.createdAt === 'string' ? data.createdAt : null),
              updatedAt: data.updatedAt instanceof Timestamp ? formatISO(data.updatedAt.toDate()) : (typeof data.updatedAt === 'string' ? data.updatedAt : null),
              lastReviewed: data.lastReviewed instanceof Timestamp ? formatISO(data.lastReviewed.toDate()) : data.lastReviewed,
              nextReviewDate: data.nextReviewDate instanceof Timestamp ? formatISO(data.nextReviewDate.toDate()) : data.nextReviewDate,
            } as Flashcard;
          });
          setFlashcards(fetchedFlashcards);
          setIsLoading(false);
        }, (error) => { console.error("Error fetching flashcards:", error); setIsLoading(false); setFlashcards(EMPTY_FLASHCARDS); });

        const decksCollectionRef = collection(db, 'users', user.uid, 'decks');
        const qDecks = query(decksCollectionRef, orderBy('createdAt', 'desc'));
        const unsubscribeDecks = onSnapshot(qDecks, (snapshot) => {
          const fetchedDecks = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            return {
              id: docSnap.id, ...data,
              createdAt: data.createdAt instanceof Timestamp ? formatISO(data.createdAt.toDate()) : (typeof data.createdAt === 'string' ? data.createdAt : null),
              updatedAt: data.updatedAt instanceof Timestamp ? formatISO(data.updatedAt.toDate()) : (typeof data.updatedAt === 'string' ? data.updatedAt : null),
            } as Deck;
          });
          setDecks(fetchedDecks);
          setIsLoadingDecks(false);
        }, (error) => { console.error("Error fetching decks:", error); setIsLoadingDecks(false); setDecks(EMPTY_DECKS); });

        const tasksCollectionRef = collection(db, 'users', user.uid, 'tasks');
        const qTasks = query(tasksCollectionRef, orderBy('createdAt', 'desc'));
        const unsubscribeTasks = onSnapshot(qTasks, (snapshot) => {
          const fetchedTasks = snapshot.docs.map(mapFirestoreDocToTask);
          setTasks(fetchedTasks);
          setIsLoadingTasks(false);
        }, (error) => { console.error("Error fetching tasks:", error); setIsLoadingTasks(false); setTasks(EMPTY_TASKS); });

        const overviewsCollectionRef = collection(db, 'users', user.uid, 'overviews');
        const qOverviews = query(overviewsCollectionRef, orderBy('createdAt', 'desc'));
        const unsubscribeOverviews = onSnapshot(qOverviews, (snapshot) => {
          const fetchedOverviews = snapshot.docs.map(mapFirestoreDocToOverview);
          setOverviews(fetchedOverviews);
          setIsLoadingOverviews(false);
        }, (error) => { console.error("Error fetching overviews:", error); setIsLoadingOverviews(false); setOverviews(EMPTY_OVERVIEWS); });


        return () => {
          unsubscribeFlashcards();
          unsubscribeDecks();
          unsubscribeTasks();
          unsubscribeOverviews();
        };
      }).catch(err => {
        console.error("Error during checkAndSeed process:", err);
        setIsLoading(false); setIsLoadingDecks(false); setIsLoadingTasks(false); setIsLoadingOverviews(false);
      });

    } else {
      setFlashcards(EMPTY_FLASHCARDS);
      setDecks(EMPTY_DECKS);
      setTasks(EMPTY_TASKS);
      setOverviews(EMPTY_OVERVIEWS);
      setIsLoading(false); setIsLoadingDecks(false); setIsLoadingTasks(false); setIsLoadingOverviews(false);
    }
  }, [user, seedInitialData]);

  const addFlashcard = useCallback(async (data: { front: string; back: string; deckId?: string | null }): Promise<Flashcard | null> => {
    if (!user || !user.uid) return null;
    try {
      const flashcardsCollectionRef = collection(db, 'users', user.uid, 'flashcards');
      const now = serverTimestamp();
      const newFlashcardData: Omit<Flashcard, 'id' | 'createdAt' | 'updatedAt'> = {
        front: data.front, back: data.back, deckId: data.deckId || null,
        lastReviewed: null, nextReviewDate: formatISO(new Date(), { representation: 'date' }),
        interval: 1, status: 'new' as 'new',
      };
      const docRef = await addDoc(flashcardsCollectionRef, { ...newFlashcardData, createdAt: now, updatedAt: now });
      return { id: docRef.id, ...newFlashcardData, createdAt: formatISO(new Date()), updatedAt: formatISO(new Date()) } as Flashcard;
    } catch (error) { console.error("Error adding flashcard:", error); return null; }
  }, [user]);

  const updateFlashcard = useCallback(async (id: string, updates: Partial<Omit<Flashcard, 'id' | 'createdAt'>>): Promise<Flashcard | null> => {
    if (!user || !user.uid) return null;
    try {
      const flashcardDocRef = doc(db, 'users', user.uid, 'flashcards', id);
      const currentCard = flashcards.find(f=>f.id === id);
      const deckIdToUpdate = updates.deckId === undefined ? (currentCard?.deckId || null) : (updates.deckId || null);
      const updateData = { ...updates, deckId: deckIdToUpdate, updatedAt: serverTimestamp() };
      await updateDoc(flashcardDocRef, updateData);
      const card = flashcards.find(fc => fc.id === id);
      return card ? { ...card, ...updates, deckId: updateData.deckId, updatedAt: formatISO(new Date()) } : null;
    } catch (error) { console.error("Error updating flashcard:", error); return null; }
  }, [user, flashcards]);

  const deleteFlashcard = useCallback(async (id: string) => {
    if (!user || !user.uid) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'flashcards', id));
    } catch (error) { console.error("Error deleting flashcard:", error); }
  }, [user]);

  const getFlashcardById = useCallback((id: string) => flashcards.find(card => card.id === id), [flashcards]);

  const addDeck = useCallback(async (name: string): Promise<Deck | null> => {
    if (!user || !user.uid) return null;
    try {
      const decksCollectionRef = collection(db, 'users', user.uid, 'decks');
      const now = serverTimestamp();
      const newDeckData = { name, userId: user.uid };
      const docRef = await addDoc(decksCollectionRef, {...newDeckData, createdAt: now, updatedAt: now });
      return { id: docRef.id, ...newDeckData, createdAt: formatISO(new Date()), updatedAt: formatISO(new Date()) } as Deck;
    } catch (error) { console.error("Error adding deck:", error); return null; }
  }, [user]);

  const updateDeck = useCallback(async (id: string, updates: Partial<Omit<Deck, 'id' | 'userId' | 'createdAt'>>): Promise<Deck | null> => {
    if (!user || !user.uid) return null;
    try {
      const deckDocRef = doc(db, 'users', user.uid, 'decks', id);
      await updateDoc(deckDocRef, { ...updates, updatedAt: serverTimestamp() });
      const deck = decks.find(d => d.id === id);
      return deck ? { ...deck, ...updates, updatedAt: formatISO(new Date()) } : null;
    } catch (error) { console.error("Error updating deck:", error); return null; }
  }, [user, decks]);

  const deleteDeck = useCallback(async (id: string) => {
    if (!user || !user.uid) return;
    try {
      await runTransaction(db, async (transaction) => {
        const deckDocRef = doc(db, 'users', user.uid, 'decks', id);
        const flashcardsQuery = query(collection(db, 'users', user.uid, 'flashcards'), where("deckId", "==", id));
        const flashcardsSnapshot = await getDocs(flashcardsQuery);
        flashcardsSnapshot.docs.forEach(flashcardDoc => transaction.delete(flashcardDoc.ref));
        transaction.delete(deckDocRef);
      });
    } catch (error) { console.error("Error deleting deck:", error); }
  }, [user]);

  const getDeckById = useCallback((id: string) => decks.find(deck => deck.id === id), [decks]);

  const addTask = useCallback(async (data: Omit<Task, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<Task | null> => {
    if (!user || !user.uid) { console.error("User not authenticated to add task"); return null; }
    try {
      const tasksCollectionRef = collection(db, 'users', user.uid, 'tasks');
      const now = serverTimestamp();
      const newTaskData = {
        ...data,
        type: data.type || 'innie',
        userId: user.uid,
        status: data.status || 'pending',
        artifactLink: data.artifactLink || { flashcardId: null },
        reminderInfo: data.reminderInfo || { type: 'none' },
        checkinInfo: data.checkinInfo || null,
        overviewId: data.overviewId || null,
        isSilent: data.isSilent || false, // Handle new isSilent flag
        createdAt: now,
        updatedAt: now
      };
      const docRef = await addDoc(tasksCollectionRef, newTaskData);
      const localCreatedAt = formatISO(new Date());
      return {
        id: docRef.id,
        userId: user.uid,
        ...data,
        type: data.type || 'innie',
        status: data.status || 'pending',
        isSilent: data.isSilent || false,
        artifactLink: data.artifactLink || { flashcardId: null },
        reminderInfo: data.reminderInfo || { type: 'none' },
        checkinInfo: data.checkinInfo || null,
        overviewId: data.overviewId || null,
        createdAt: localCreatedAt,
        updatedAt: localCreatedAt
      } as Task;
    } catch (error) { console.error("Error adding task:", error); return null; }
  }, [user]);

  const updateTask = useCallback(async (id: string, updates: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>>): Promise<Task | null> => {
    if (!user || !user.uid) { console.error("User not authenticated to update task"); return null; }
    try {
      const taskDocRef = doc(db, 'users', user.uid, 'tasks', id);
      const currentTask = tasks.find(t => t.id === id);
      const updateData: Partial<Omit<Task, 'id' | 'userId' | 'createdAt'>> & { updatedAt: any } = {
        ...updates,
        type: updates.type || currentTask?.type || 'innie',
        isSilent: updates.isSilent === undefined ? currentTask?.isSilent : updates.isSilent, // Handle isSilent
        artifactLink: updates.artifactLink || currentTask?.artifactLink || { flashcardId: null },
        reminderInfo: updates.reminderInfo || currentTask?.reminderInfo || { type: 'none' },
        checkinInfo: updates.checkinInfo === undefined ? currentTask?.checkinInfo : (updates.checkinInfo || null),
        overviewId: updates.overviewId === undefined ? currentTask?.overviewId : (updates.overviewId || null),
        updatedAt: serverTimestamp()
      };

      await updateDoc(taskDocRef, updateData as any);

      const task = tasks.find(t => t.id === id);
      return task ? { ...task, ...updates, type: updateData.type, isSilent: updateData.isSilent, checkinInfo: updateData.checkinInfo, overviewId: updateData.overviewId, updatedAt: formatISO(new Date()) } : null;
    } catch (error) { console.error("Error updating task:", error); return null; }
  }, [user, tasks]);

  const deleteTask = useCallback(async (id: string) => {
    if (!user || !user.uid) { console.error("User not authenticated to delete task"); return; }
    try {
      const taskDocRef = doc(db, 'users', user.uid, 'tasks', id);
      await deleteDoc(taskDocRef);
    } catch (error) { console.error("Error deleting task:", error); }
  }, [user]);

  const getTaskById = useCallback((id: string) => tasks.find(task => task.id === id), [tasks]);

  const getCompletedTasksCountLast30Days = useCallback(async (): Promise<number> => {
    if (!user || !user.uid) return 0;
    try {
      const tasksCollectionRef = collection(db, 'users', user.uid, 'tasks');
      const date30DaysAgo = subDays(new Date(), 30);
      const q = query(
        tasksCollectionRef,
        where('status', '==', 'completed'),
        where('updatedAt', '>=', Timestamp.fromDate(date30DaysAgo))
      );
      const snapshot = await getCountFromServer(q);
      return snapshot.data().count;
    } catch (error) {
      console.error("Error getting completed tasks count:", error);
      return 0;
    }
  }, [user]);

  const fetchCompletedTasksLast30Days = useCallback(async (): Promise<Task[]> => {
    if (!user || !user.uid) return [];
    try {
      const tasksCollectionRef = collection(db, 'users', user.uid, 'tasks');
      const date30DaysAgo = subDays(new Date(), 30);
      const q = query(
        tasksCollectionRef,
        where('status', '==', 'completed'),
        where('updatedAt', '>=', Timestamp.fromDate(date30DaysAgo)),
        orderBy('updatedAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(mapFirestoreDocToTask);
    } catch (error) {
      console.error("Error fetching completed tasks:", error);
      return [];
    }
  }, [user]);

  const addOverview = useCallback(async (data: { title: string; description?: string | null }): Promise<Overview | null> => {
    if (!user || !user.uid) return null;
    try {
      const overviewsCollectionRef = collection(db, 'users', user.uid, 'overviews');
      const now = serverTimestamp();
      const newOverviewData = { ...data, userId: user.uid };
      const docRef = await addDoc(overviewsCollectionRef, { ...newOverviewData, createdAt: now, updatedAt: now });
      return { id: docRef.id, ...newOverviewData, createdAt: formatISO(new Date()), updatedAt: formatISO(new Date()) } as Overview;
    } catch (error) { console.error("Error adding overview:", error); return null; }
  }, [user]);

  const updateOverview = useCallback(async (id: string, updates: Partial<Omit<Overview, 'id' | 'userId' | 'createdAt'>>): Promise<Overview | null> => {
    if (!user || !user.uid) return null;
    try {
      const overviewDocRef = doc(db, 'users', user.uid, 'overviews', id);
      await updateDoc(overviewDocRef, { ...updates, updatedAt: serverTimestamp() });
      const overview = overviews.find(ov => ov.id === id);
      return overview ? { ...overview, ...updates, updatedAt: formatISO(new Date()) } : null;
    } catch (error) { console.error("Error updating overview:", error); return null; }
  }, [user, overviews]);

  const deleteOverview = useCallback(async (id: string) => {
    if (!user || !user.uid) return;
    try {
      // Optional: Consider if deleting an overview should also update tasks linked to it.
      // For now, tasks will retain the overviewId but it will point to a non-existent overview.
      await deleteDoc(doc(db, 'users', user.uid, 'overviews', id));
    } catch (error) { console.error("Error deleting overview:", error); }
  }, [user]);

  const getOverviewById = useCallback((id: string) => overviews.find(overview => overview.id === id), [overviews]);


  const getReviewQueue = useCallback(() => {
    if (isLoading || !user) return [];
    const today = formatISO(new Date(), { representation: 'date' });
    return flashcards
      .filter(card => {
        if (card.status === 'mastered') return false;
        if (!card.nextReviewDate) return true;
        try {
          if (typeof card.nextReviewDate === 'string' && card.nextReviewDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return card.nextReviewDate <= today;
          }
          return true;
        } catch (e) { return true; }
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
      total: flashcards.length, mastered: flashcards.filter(c => c.status === 'mastered').length,
      learning: flashcards.filter(c => c.status === 'learning').length, new: flashcards.filter(c => c.status === 'new').length,
      dueToday: dueTodayCount,
    };
  }, [flashcards, isLoading, user]);

  const contextValue = useMemo(() => ({
    flashcards: user ? flashcards : EMPTY_FLASHCARDS,
    decks: user ? decks : EMPTY_DECKS,
    tasks: user ? tasks : EMPTY_TASKS,
    overviews: user ? overviews : EMPTY_OVERVIEWS,
    addFlashcard, updateFlashcard, deleteFlashcard, getFlashcardById,
    addDeck, updateDeck, deleteDeck, getDeckById,
    addTask, updateTask, deleteTask, getTaskById,
    getCompletedTasksCountLast30Days, fetchCompletedTasksLast30Days,
    addOverview, updateOverview, deleteOverview, getOverviewById,
    getReviewQueue, getStatistics,
    isLoading: isLoading || (user && isSeeding),
    isLoadingDecks: isLoadingDecks || (user && isSeeding),
    isLoadingTasks: isLoadingTasks || (user && isSeeding),
    isLoadingOverviews: isLoadingOverviews || (user && isSeeding),
    isSeeding,
  }), [
      flashcards, decks, tasks, overviews,
      addFlashcard, updateFlashcard, deleteFlashcard, getFlashcardById,
      addDeck, updateDeck, deleteDeck, getDeckById,
      addTask, updateTask, deleteTask, getTaskById,
      getCompletedTasksCountLast30Days, fetchCompletedTasksLast30Days,
      addOverview, updateOverview, deleteOverview, getOverviewById,
      getReviewQueue, getStatistics,
      isLoading, isLoadingDecks, isLoadingTasks, isLoadingOverviews,
      user, isSeeding
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
