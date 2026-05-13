/**
 * AI-powered flashcard decomposer with localStorage cache.
 * Falls back to returning cards unchanged if API is unavailable.
 *
 * Cache key: `ai_decomp_v1_${cardId}` (invalidated if back content changes)
 */

export interface AiSubCard { front: string; back: string; }
export interface AiDecompResult { id: string; subCards: AiSubCard[]; }

const CACHE_PREFIX = 'ai_decomp_v1_';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const BATCH_SIZE   = 8; // cards per API call

interface CacheEntry { back: string; subCards: AiSubCard[]; ts: number; }

function readCache(cardId: string, currentBack: string): AiSubCard[] | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + cardId);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    // Invalidate if back changed or too old
    if (entry.back !== currentBack || Date.now() - entry.ts > CACHE_TTL_MS) return null;
    return entry.subCards;
  } catch { return null; }
}

function writeCache(cardId: string, back: string, subCards: AiSubCard[]) {
  try {
    const entry: CacheEntry = { back, subCards, ts: Date.now() };
    localStorage.setItem(CACHE_PREFIX + cardId, JSON.stringify(entry));
  } catch { /* ignore storage full */ }
}

/**
 * Decompose a batch of flashcards using Gemini.
 * Cards already cached are skipped. Returns a Map of cardId → subCards.
 */
export async function aiDecomposeCards(
  cards: { id: string; front: string; back: string }[]
): Promise<Map<string, AiSubCard[]>> {
  const resultMap = new Map<string, AiSubCard[]>();

  // Separate cached vs uncached
  const toFetch: typeof cards = [];
  for (const c of cards) {
    const cached = readCache(c.id, c.back);
    if (cached) {
      resultMap.set(c.id, cached);
    } else if (c.back.length >= 180) {
      // Only bother AI for longer cards
      toFetch.push(c);
    }
  }

  if (toFetch.length === 0) return resultMap;

  // Batch into groups
  for (let i = 0; i < toFetch.length; i += BATCH_SIZE) {
    const batch = toFetch.slice(i, i + BATCH_SIZE);
    try {
      const res = await fetch('/api/game/decompose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cards: batch }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { results } = await res.json() as { results: AiDecompResult[] };
      for (const r of results) {
        const orig = batch.find(c => c.id === r.id);
        if (orig && r.subCards?.length) {
          writeCache(r.id, orig.back, r.subCards);
          resultMap.set(r.id, r.subCards);
        }
      }
    } catch (err) {
      console.warn('[aiDecompose] batch failed, skipping:', err);
      // Silently skip — caller falls back to regex decomposition
    }
  }

  return resultMap;
}
