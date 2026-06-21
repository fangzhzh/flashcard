'use client';

import { useState, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import { LEETCODE_CATEGORIES, type LeetCodeProblem } from '@/lib/leetcode-data';

const PERSONAL_DOC_PATH = (uid: string) => `users/${uid}/leetcode_favorites/settings`;
const GLOBAL_COLLECTION = 'leetcode_global_problems';

export function useLeetCodeFavorites() {
  const { user } = useAuth();
  const [customProblems, setCustomProblems] = useState<LeetCodeProblem[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!user || loaded) return;
    setLoading(true);
    try {
      // 1. Load personal settings (removedIds)
      const personalRef = doc(db, PERSONAL_DOC_PATH(user.uid));
      const personalSnap = await getDoc(personalRef);
      let localRemovedIds: string[] = [];
      if (personalSnap.exists()) {
        const data = personalSnap.data();
        localRemovedIds = data.removedIds ?? [];
        setRemovedIds(localRemovedIds);
      }

      // 2. Load global custom problems (shared by all users)
      const globalColRef = collection(db, GLOBAL_COLLECTION);
      const globalSnap = await getDocs(globalColRef);
      const localCustoms: LeetCodeProblem[] = [];
      globalSnap.forEach(d => {
        localCustoms.push(d.data() as LeetCodeProblem);
      });
      setCustomProblems(localCustoms);

      setLoaded(true);
    } catch (e) {
      console.error('Failed to load favorites:', e);
    } finally {
      setLoading(false);
    }
  }, [user, loaded]);

  const addFavorite = useCallback(async (problem: LeetCodeProblem) => {
    if (!user) return;

    // If it was previously removed by this user, restore it locally (remove from personal removedIds)
    if (removedIds.includes(problem.id)) {
      const newRemoveds = removedIds.filter(id => id !== problem.id);
      setRemovedIds(newRemoveds);
      try {
        const personalRef = doc(db, PERSONAL_DOC_PATH(user.uid));
        await setDoc(personalRef, { removedIds: newRemoveds, updatedAt: new Date() }, { merge: true });
      } catch (e) {
        console.error('Failed to update personal settings:', e);
      }
      return;
    }

    // Otherwise, add it to the global shared collection
    const exists = customProblems.some(p => p.id === problem.id);
    if (exists) return;

    try {
      const globalDocRef = doc(db, GLOBAL_COLLECTION, problem.id);
      await setDoc(globalDocRef, {
        ...problem,
        addedBy: user.uid,
        addedAt: new Date(),
      });
      setCustomProblems(prev => [...prev, problem]);
    } catch (e) {
      console.error('Failed to add global favorite:', e);
    }
  }, [user, customProblems, removedIds]);

  const removeFavorite = useCallback(async (problemId: string) => {
    if (!user) return;

    // Simply add the problem ID to the personal removed list (removedIds) to hide it for this user
    if (!removedIds.includes(problemId)) {
      const newRemoveds = [...removedIds, problemId];
      setRemovedIds(newRemoveds);
      try {
        const personalRef = doc(db, PERSONAL_DOC_PATH(user.uid));
        await setDoc(personalRef, { removedIds: newRemoveds, updatedAt: new Date() }, { merge: true });
      } catch (e) {
        console.error('Failed to remove favorite:', e);
      }
    }
  }, [user, removedIds]);

  // Load favorites once authenticated
  useEffect(() => {
    if (user && !loaded) {
      loadFavorites();
    }
  }, [user, loaded, loadFavorites]);

  // Computed property: active favorites for this user (pre-seeded + global custom problems - personal removedIds)
  const favorites = (() => {
    const builtin = LEETCODE_CATEGORIES.find(c => c.id === 'favorite')?.problems ?? [];
    const activeBuiltin = builtin.filter(p => !removedIds.includes(p.id));
    const activeCustom = customProblems.filter(p => !removedIds.includes(p.id));
    return [...activeBuiltin, ...activeCustom];
  })();

  return {
    favorites,
    customProblems,
    removedIds,
    loading,
    loaded,
    addFavorite,
    removeFavorite,
    loadFavorites,
  };
}
