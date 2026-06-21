'use client';

import { useState, useCallback } from 'react';
import { db } from '@/lib/firebase';
import {
  doc, getDoc, setDoc, collection, getDocs, serverTimestamp
} from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { Familiarity } from '@/lib/leetcode-data';

export interface ProblemProgress {
  problemId: string;
  familiarity: Familiarity;
  updatedAt: Date | null;
  notes?: string;
}

const COLLECTION = (uid: string) => `users/${uid}/leetcode_progress`;

export function useLeetCodeProgress() {
  const { user } = useAuth();
  const [progress, setProgress] = useState<Record<string, ProblemProgress>>({});
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadAll = useCallback(async () => {
    if (!user || loaded) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, COLLECTION(user.uid)));
      const result: Record<string, ProblemProgress> = {};
      snap.forEach(d => {
        const data = d.data();
        result[d.id] = {
          problemId: d.id,
          familiarity: (data.familiarity ?? 0) as Familiarity,
          updatedAt: data.updatedAt?.toDate?.() ?? null,
          notes: data.notes ?? '',
        };
      });
      setProgress(result);
      setLoaded(true);
    } catch (e) {
      console.error('Failed to load leetcode progress:', e);
    } finally {
      setLoading(false);
    }
  }, [user, loaded]);

  const updateFamiliarity = useCallback(async (problemId: string, familiarity: Familiarity) => {
    if (!user) return;
    const ref = doc(db, COLLECTION(user.uid), problemId);
    const updated: ProblemProgress = {
      problemId,
      familiarity,
      updatedAt: new Date(),
    };
    setProgress(prev => ({ ...prev, [problemId]: updated }));
    try {
      await setDoc(ref, { familiarity, updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error('Failed to update familiarity:', e);
    }
  }, [user]);

  const getFamiliarity = useCallback((problemId: string): Familiarity => {
    return (progress[problemId]?.familiarity ?? 0) as Familiarity;
  }, [progress]);

  const getProgress = useCallback((problemId: string): ProblemProgress | null => {
    return progress[problemId] ?? null;
  }, [progress]);

  // Stats per category
  const getCategoryStats = useCallback((problemIds: string[]) => {
    let notStarted = 0, forgot = 0, fuzzy = 0, familiar = 0, mastered = 0;
    for (const id of problemIds) {
      const f = (progress[id]?.familiarity ?? 0) as Familiarity;
      if (f === 0) notStarted++;
      else if (f === 1) forgot++;
      else if (f === 2) fuzzy++;
      else if (f === 3) familiar++;
      else mastered++;
    }
    return { notStarted, forgot, fuzzy, familiar, mastered, total: problemIds.length };
  }, [progress]);

  return {
    progress, loading, loaded,
    loadAll, updateFamiliarity,
    getFamiliarity, getProgress, getCategoryStats,
  };
}
