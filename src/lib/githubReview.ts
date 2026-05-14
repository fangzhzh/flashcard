/**
 * Client-side GitHub review card fetcher.
 * Round 1: 24h localStorage cache (avoids unnecessary API calls).
 * Round 2+: always fetch fresh from API with variation number (different questions).
 */

export interface GitHubReviewCard { front: string; back: string; }

const CACHE_KEY = 'github_review_v1';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface Cache {
  questions: GitHubReviewCard[];
  generatedAt: string;
  ts: number;
}

export async function fetchGitHubReviewCards(
  forceRefresh = false,
  variation = 1,
): Promise<GitHubReviewCard[]> {
  // Only use cache for round 1 (subsequent rounds always get fresh questions)
  if (!forceRefresh && variation === 1) {
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

  // Fetch from API (pass variation so Gemini generates different questions)
  const res = await fetch('/api/game/github-review', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variation }),
  });
  if (!res.ok) {
    const { error } = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(error ?? `HTTP ${res.status}`);
  }
  const { questions } = await res.json() as { questions: GitHubReviewCard[] };

  // Only cache round 1 result (24h)
  if (variation === 1) {
    try {
      const cache: Cache = { questions, generatedAt: new Date().toISOString(), ts: Date.now() };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
    } catch { /* ignore storage full */ }
  }

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
