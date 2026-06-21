'use client';

import { useState, useCallback, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';
import type { LeetCodeProblem } from '@/lib/leetcode-data';

const DOC_PATH = (uid: string) => `users/${uid}/leetcode_daily/today`;

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export function useLeetCodeDaily(allProblems: LeetCodeProblem[]) {
  const { user } = useAuth();
  const [dailyProblem, setDailyProblemState] = useState<LeetCodeProblem | null>(null);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const initDailyProblem = useCallback(async (problemsList: LeetCodeProblem[]) => {
    if (!user || problemsList.length === 0) return;
    setLoading(true);
    try {
      const ref = doc(db, DOC_PATH(user.uid));
      const snap = await getDoc(ref);
      const todayStr = getTodayDateString();

      let activeId = '';
      let needsNew = true;

      if (snap.exists()) {
        const data = snap.data();
        if (data.date === todayStr && data.problemId) {
          activeId = data.problemId;
          needsNew = false;
        }
      }

      if (needsNew) {
        const randIdx = Math.floor(Math.random() * problemsList.length);
        const randProblem = problemsList[randIdx];
        if (randProblem) {
          activeId = randProblem.id;
          await setDoc(ref, {
            problemId: activeId,
            date: todayStr,
            updatedAt: new Date()
          });
        }
      }

      const p = problemsList.find(x => x.id === activeId) || null;
      setDailyProblemState(p);
      setLoaded(true);
    } catch (e) {
      console.error('Failed to load/initialize daily problem:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const randomizeDailyProblem = useCallback(async (problemsList: LeetCodeProblem[]) => {
    if (!user || problemsList.length === 0) return;
    setLoading(true);
    try {
      const ref = doc(db, DOC_PATH(user.uid));
      const todayStr = getTodayDateString();
      const randIdx = Math.floor(Math.random() * problemsList.length);
      const randProblem = problemsList[randIdx];
      if (randProblem) {
        await setDoc(ref, {
          problemId: randProblem.id,
          date: todayStr,
          updatedAt: new Date()
        });
        setDailyProblemState(randProblem);
      }
    } catch (e) {
      console.error('Failed to randomize daily problem:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const manuallySetDailyProblem = useCallback(async (problemId: string, problemsList: LeetCodeProblem[]) => {
    if (!user || problemsList.length === 0) return;
    setLoading(true);
    try {
      const target = problemsList.find(x => x.id === problemId);
      if (!target) return;

      const ref = doc(db, DOC_PATH(user.uid));
      const todayStr = getTodayDateString();
      await setDoc(ref, {
        problemId: target.id,
        date: todayStr,
        updatedAt: new Date()
      });
      setDailyProblemState(target);
    } catch (e) {
      console.error('Failed to manually set daily problem:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && allProblems.length > 0 && !loaded) {
      initDailyProblem(allProblems);
    }
  }, [user, allProblems, loaded, initDailyProblem]);

  return {
    dailyProblem,
    loading,
    loaded,
    randomizeDailyProblem,
    manuallySetDailyProblem,
  };
}
