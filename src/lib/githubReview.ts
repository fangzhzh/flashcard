/**
 * Client-side GitHub review card fetcher with 24h localStorage cache.
 */

export interface GitHubReviewCard { front: string; back: string; }

const CACHE_KEY = 'github_review_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface Cache {
  questions: GitHubReviewCard[];
  generatedAt: string;
  ts: number;
}

export async function fetchGitHubReviewCards(forceRefresh = false): Promise<GitHubReviewCard[]> {
  // Check cache unless forced refresh
  if (!forceRefresh) {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cache: Cache = JSON.parse(raw);
        if (Date.now() - cache.ts < CACHE_TTL && cache.questions.length > 0) {
          return cache.questions;
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // Fetch from API
  const res = await fetch('/api/game/github-review', { method: 'POST' });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error ?? `HTTP ${res.status}`);
  }
  const { questions } = await res.json() as { questions: GitHubReviewCard[] };

  // Cache result
  try {
    const cache: Cache = { questions, generatedAt: new Date().toISOString(), ts: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch { /* ignore storage full */ }

  return questions;
}

export function clearGitHubReviewCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch { /* ignore */ }
}

/** Return the age of the cache in hours, or null if no cache */
export function getGitHubReviewCacheAge(): number | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache: Cache = JSON.parse(raw);
    return Math.floor((Date.now() - cache.ts) / (60 * 60 * 1000));
  } catch { return null; }
}
