"use client";
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentLocale } from '@/lib/i18n/client';
import Link from 'next/link';
import type { Overview } from '@/types';
import { aiDecomposeCards } from '@/lib/aiDecomposer';
import WorldMap from './WorldMap';
import BattleScene from './BattleScene';
import StageResult from './StageResult';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemType = 'potion' | 'lightning' | 'crystal' | 'shield';
export interface Item { type: ItemType; emoji: string; name: string; desc: string; }
export type AnimState = 'IDLE' | 'PLAYER_ATTACK' | 'BOSS_ATTACK' | 'SHOW_WRONG';

export interface StageConfig {
  id: number;        // wave number
  worldId: string;   // deckId | 'all'
  name: string;
  boss: string;
  bossEmoji: string;
  bossHP: number;
  cardCount: number;
  bgFrom: string; bgVia: string; bgTo: string;
}

export interface BattleCard { id: string; front: string; back: string; deckName?: string; parentId?: string; }

export interface BattleState {
  stage: StageConfig;
  playerHP: number; maxPlayerHP: number;
  bossHP: number;   maxBossHP: number;
  deck: BattleCard[];
  deckIndex: number;
  choices: string[];
  choicesFull: string[];
  correctIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  combo: number; maxCombo: number;
  wrongStreak: number; bossRage: boolean;
  totalAnswered: number; correctCount: number;
  inventory: Item[];
  shieldActive: boolean; lightningActive: boolean;
  eliminatedIndex: number | null;
  animState: AnimState;
  damageKey: number; damageAmount: number; damageToBoss: boolean;
}

export interface WorldSave {
  currentWave: number;
  bestWave: number;
  stars: Record<number, number>;
}

export interface SaveData {
  worlds: Record<string, WorldSave>;
  inventory: Item[];
  totalWins: number;
}

export interface ResultData {
  victory: boolean;
  stageId: number;
  worldId: string;
  correctCount: number;
  totalAnswered: number;
  maxCombo: number;
  stars: number;
  reward: Item | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SAVE_KEY = 'card_war_save_v2';
const PLAYER_BASE_HP = 100;
const PLAYER_ATTACK  = 30;
const BOSS_ATTACK    = 20;

export const ITEM_POOL: Item[] = [
  { type: 'potion',    emoji: '🧪', name: '治愈药水',  desc: '恢复 30 HP' },
  { type: 'lightning', emoji: '⚡', name: '闪电符文',  desc: '下次答对伤害 ×3' },
  { type: 'crystal',   emoji: '🔮', name: '预言水晶',  desc: '排除一个错误选项' },
  { type: 'shield',    emoji: '🛡️', name: '铁壁盾牌',  desc: '下次答错不扣血' },
];

const BOSS_POOL = [
  { name: '石头傀儡',   emoji: '🪨', bg: ['from-emerald-950','via-green-900','to-teal-950']   },
  { name: '暗影精灵',   emoji: '🧝', bg: ['from-purple-950','via-violet-900','to-slate-950']  },
  { name: '冰霜法师',   emoji: '❄️', bg: ['from-blue-950','via-cyan-900','to-indigo-950']     },
  { name: '熔岩巨人',   emoji: '🌋', bg: ['from-red-950','via-orange-900','to-amber-950']     },
  { name: '暗龙领主',   emoji: '🐉', bg: ['from-violet-950','via-purple-900','to-indigo-950'] },
  { name: '死亡骑士',   emoji: '💀', bg: ['from-gray-950','via-slate-900','to-zinc-950']      },
  { name: '混沌恶魔',   emoji: '😈', bg: ['from-rose-950','via-red-900','to-orange-950']      },
  { name: '知识守护者', emoji: '👁️', bg: ['from-violet-950','via-indigo-900','to-slate-950']  },
];

const THEMED_BOSSES: { keywords: string[]; bosses: typeof BOSS_POOL }[] = [
  {
    keywords: ['心理', 'psych', 'mental', 'cognitive'],
    bosses: [
      { name: '潜意识怪物', emoji: '🧠', bg: ['from-pink-950','via-rose-900','to-purple-950']    },
      { name: '认知扭曲者', emoji: '🌀', bg: ['from-fuchsia-950','via-pink-900','to-rose-950']   },
      { name: '情绪操控者', emoji: '🎭', bg: ['from-purple-950','via-fuchsia-900','to-pink-950'] },
      { name: '记忆吞噬者', emoji: '🌫️', bg: ['from-slate-950','via-gray-900','to-zinc-950']     },
    ],
  },
  {
    keywords: ['system', 'design', '架构', 'architecture', 'infra'],
    bosses: [
      { name: '单点故障',   emoji: '🏗️', bg: ['from-sky-950','via-blue-900','to-indigo-950']    },
      { name: '分布式恶魔', emoji: '⚡', bg: ['from-amber-950','via-yellow-900','to-orange-950'] },
      { name: '一致性幽灵', emoji: '🔄', bg: ['from-teal-950','via-cyan-900','to-sky-950']       },
      { name: '瓶颈巨人',   emoji: '📡', bg: ['from-indigo-950','via-blue-900','to-cyan-950']    },
    ],
  },
];

function pickBossPool(deckName: string | null) {
  if (!deckName) return BOSS_POOL;
  const lower = deckName.toLowerCase();
  for (const theme of THEMED_BOSSES) {
    if (theme.keywords.some(k => lower.includes(k))) return theme.bosses;
  }
  return BOSS_POOL;
}

// ─── Wave generator ────────────────────────────────────────────────────────────

export function generateWaveStage(
  wave: number, worldId: string, deckName: string | null, totalCards: number,
): StageConfig {
  const pool = pickBossPool(deckName);
  const boss = pool[(wave - 1) % pool.length];
  const isElite = wave % 5 === 0;
  const bossHP   = Math.round(60 + wave * 28 * (isElite ? 1.8 : 1));
  const cardCount = Math.min(4 + Math.floor(wave * 1.2), Math.min(totalCards, 25));
  const waveLabel = isElite ? `⚔️ 精英 Wave ${wave}` : `Wave ${wave}`;
  return {
    id: wave, worldId,
    name: waveLabel,
    boss: isElite ? `${boss.name}·精英` : boss.name,
    bossEmoji: boss.emoji,
    bossHP, cardCount,
    bgFrom: boss.bg[0], bgVia: boss.bg[1], bgTo: boss.bg[2],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '[代码]')
    .replace(/`[^`]*`/g, m => m.slice(1, -1))
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]+\)/g, '')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

export function truncate(text: string, max = 80): string {
  const s = stripMarkdown(text);
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function calcStars(correctCount: number, total: number, maxCombo: number): number {
  const acc = correctCount / Math.max(total, 1);
  if (acc >= 0.9 && maxCombo >= 3) return 3;
  if (acc >= 0.7) return 2;
  return 1;
}

// ── Card Priority (uses existing SRS data — no new localStorage needed) ────────
// 0 = highest priority (play first), 4 = lowest (well mastered, not due)
function cardPriority(f: import('@/types').Flashcard): number {
  const today = new Date().toISOString().slice(0, 10);
  if (f.status === 'new') return 0;
  const isDue = !f.nextReviewDate || f.nextReviewDate <= today;
  if (f.status === 'learning' && isDue) return 1;
  if (f.status === 'mastered' && isDue) return 2;
  if (f.status === 'learning') return 3;
  return 4;
}

// ── Overview Helpers ───────────────────────────────────────────────────

/** Decompose an Overview's markdown description into Q&A BattleCards */
export function parseOverviewToCards(overview: Overview): BattleCard[] {
  const title = overview.title;
  const desc  = (overview.description ?? '').trim();
  if (!desc) return [];

  const cards: BattleCard[] = [];
  const mkId = (suffix: string | number) => `ov_${overview.id}_${suffix}`;

  // 1. Try markdown headings (## or ###)
  const hMatches = [...desc.matchAll(/^#{1,4}\s+(.+)$/gm)];
  if (hMatches.length >= 2) {
    hMatches.forEach((m, i) => {
      const content = desc.slice(m.index! + m[0].length, i + 1 < hMatches.length ? hMatches[i+1].index! : desc.length).trim();
      if (content.length >= 10) cards.push({ id: mkId(`h${i}`), front: `在「${title}」中，${m[1].trim()}是什么？`, back: content, deckName: title });
    });
    if (cards.length >= 2) return cards;
  }

  // 2. Try **bold** section headers
  const bMatches = [...desc.matchAll(/^\*\*(.+?)\*\*\s*$/gm)];
  if (bMatches.length >= 2) {
    bMatches.forEach((m, i) => {
      const content = desc.slice(m.index! + m[0].length, i + 1 < bMatches.length ? bMatches[i+1].index! : desc.length).trim();
      if (content.length >= 10) cards.push({ id: mkId(`b${i}`), front: `在「${title}」中，${m[1].trim()}是什么？`, back: content, deckName: title });
    });
    if (cards.length >= 2) return cards;
  }

  // 3. Blank-line-separated paragraphs fallback
  const paras = desc.split(/\n{2,}/).filter(p => p.trim().length >= 20);
  paras.forEach((para, i) => {
    const lines = para.split('\n').filter(l => l.trim());
    if (lines.length >= 2) {
      const heading = lines[0].replace(/^#+\s*|\*+/g, '').trim();
      cards.push({ id: mkId(`p${i}`), front: `在「${title}」中，${heading}是什么？`, back: lines.slice(1).join('\n'), deckName: title });
    } else {
      cards.push({ id: mkId(`p${i}`), front: `「${title}」第${i+1}个关键点是什么？`, back: para, deckName: title });
    }
  });

  // 4. Last resort: whole description as one card
  if (cards.length === 0) {
    cards.push({ id: mkId('full'), front: `「${title}」的核心内容是什么？`, back: desc, deckName: title });
  }
  return cards;
}

/** Generate a StageConfig for an Overview boss fight */
export function generateOverviewStage(overview: Overview, cardCount: number): StageConfig {
  const t = overview.title;
  let emoji = '📖';
  let bg = ['from-violet-950', 'via-purple-900', 'to-slate-950'];
  if (/心理|情绪|自我|边界|认知|思维|感受|焦虑|价值/.test(t))  { emoji = '🧠'; bg = ['from-pink-950','via-rose-900','to-purple-950'];   }
  else if (/系统|设计|架构|分布|扩展|数据库|缓存|服务/.test(t)) { emoji = '🏗️'; bg = ['from-sky-950','via-blue-900','to-indigo-950'];    }
  else if (/算法|数据结构|编程|代码|复杂度/.test(t))             { emoji = '💻'; bg = ['from-emerald-950','via-teal-900','to-cyan-950'];  }
  else if (/领导|管理|团队|沟通|职场|工作/.test(t))              { emoji = '🏢'; bg = ['from-amber-950','via-yellow-900','to-orange-950']; }
  return {
    id: 1, worldId: `ov_${overview.id}`,
    name: `概览战: ${t}`,
    boss: t, bossEmoji: emoji, bossHP: 50 + cardCount * 25, cardCount,
    bgFrom: bg[0], bgVia: bg[1], bgTo: bg[2],
  };
}

// ── Flashcard Decomposition ──────────────────────────────────────────────────
/**
 * Split a flashcard with complex structured back content into multiple sub-cards.
 * Simple cards (short back or no detected structure) are returned as-is.
 * Sub-cards use parentId to point back to the real flashcard for SRS write-back.
 */
function decomposeFrontBack(card: import('@/types').Flashcard, deckName?: string): BattleCard[] {
  const front = card.front.trim();
  const back  = card.back.trim();
  const shortFront = truncate(front, 40);
  const mkId = (i: number) => `${card.id}_sub_${i}`;
  const base: BattleCard = { id: card.id, front, back, deckName, parentId: card.id };

  // Too short to be worth splitting
  if (back.length < 180) return [base];

  // 1. Markdown headings (## / ###) — e.g., system design levels
  const hMatches = [...back.matchAll(/^#{1,4}\s+(.+)$/gm)];
  if (hMatches.length >= 2) {
    const subs: BattleCard[] = [];
    hMatches.forEach((m, i) => {
      const content = back.slice(
        m.index! + m[0].length,
        i + 1 < hMatches.length ? hMatches[i + 1].index! : back.length
      ).trim();
      if (content.length >= 10)
        subs.push({ id: mkId(i), front: `「${shortFront}」中，${m[1].trim()}是什么？`, back: content, deckName, parentId: card.id });
    });
    if (subs.length >= 2) return subs;
  }

  // 2. Numbered list — e.g., steps to reduce amygdala activation (need ≥ 3 items)
  const numMatches = [...back.matchAll(/^(\d+)[\.\uff09]\s+(.+)$/gm)];
  if (numMatches.length >= 3) {
    return numMatches.map((m, i) => ({
      id: mkId(i),
      front: `「${shortFront}」的第${m[1]}个方法/步骤是什么？`,
      back: m[2].trim(),
      deckName,
      parentId: card.id,
    }));
  }

  // 3. Bullet list (- or *) — need ≥ 3 items
  const bulletMatches = [...back.matchAll(/^[-*]\s+(.+)$/gm)];
  if (bulletMatches.length >= 3) {
    return bulletMatches.map((m, i) => ({
      id: mkId(i),
      front: `「${shortFront}」的要点${i + 1}是什么？`,
      back: m[1].trim(),
      deckName,
      parentId: card.id,
    }));
  }

  // No clear structure — keep as-is
  return [base];
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { worlds: {}, inventory: [], totalWins: 0 };
}
function writeSave(d: SaveData) { try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch {} }

export function getWorldSave(save: SaveData, worldId: string): WorldSave {
  const ws = save.worlds[worldId];
  return ws ? { ...ws, stars: ws.stars ?? {} } : { currentWave: 1, bestWave: 0, stars: {} };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CardWarGame() {
  const { flashcards, decks, isLoading, updateFlashcard, overviews } = useFlashcards();
  const { user } = useAuth();
  const currentLocale = useCurrentLocale();

  const [screen, setScreen]   = useState<'MAP' | 'BATTLE' | 'RESULT'>('MAP');
  const [saveData, setSaveData] = useState<SaveData>(() => loadSave());
  const [battle, setBattle]   = useState<BattleState | null>(null);
  const [result, setResult]   = useState<ResultData | null>(null);
  const [preparing, setPreparing] = useState(false); // AI decomposition in progress

  useEffect(() => { writeSave(saveData); }, [saveData]);

  // Ref mirror of battle — lets resolveAnswer read current card without stale closure
  const battleRef = useRef<BattleState | null>(null);
  useEffect(() => { battleRef.current = battle; }, [battle]);

  // ── Batched SRS writes — flush every 10 answers or on stage end ──────────────
  type SRSUpdate = { lastReviewed: string; nextReviewDate: string; interval: number; status: 'new' | 'learning' | 'mastered' };
  const pendingUpdates   = useRef<Map<string, SRSUpdate>>(new Map());
  const answeredSinceFlush = useRef(0);

  const flushSRSUpdates = useCallback(() => {
    if (pendingUpdates.current.size === 0) return;
    const snapshot = new Map(pendingUpdates.current);
    pendingUpdates.current.clear();
    answeredSinceFlush.current = 0;
    snapshot.forEach((data, cardId) => {
      updateFlashcard(cardId, data).catch(console.error);
    });
  }, [updateFlashcard]);

  // Flush when stage ends (screen transitions to RESULT or back to MAP)
  useEffect(() => {
    if (screen !== 'BATTLE') flushSRSUpdates();
  }, [screen]); // eslint-disable-line

  const buildQuestion = useCallback((deck: BattleCard[], index: number, allCards: BattleCard[]) => {
    const card = deck[index % deck.length];
    const distractors = shuffle(allCards.filter(c => c.id !== card.id)).slice(0, 3).map(c => c.back);
    while (distractors.length < 3) distractors.push('（无）');
    const fullOptions = shuffle([card.back, ...distractors]);
    return { choices: fullOptions.map(o => truncate(o, 80)), choicesFull: fullOptions, correctIndex: fullOptions.indexOf(card.back) };
  }, []);

  const startStage = useCallback(async (worldId: string, wave: number) => {
    // ── Overview Boss Fight ────────────────────────────────────────────────
    if (worldId.startsWith('ov_')) {
      const ov = overviews.find(o => o.id === worldId.slice(3));
      if (!ov) return;
      const ovCards = parseOverviewToCards(ov);
      if (ovCards.length < 2) return;
      const allCards: BattleCard[] = [
        ...ovCards,
        ...flashcards.map(f => ({ id: f.id, front: f.front, back: f.back })),
      ];
      const stage = generateOverviewStage(ov, ovCards.length);
      const deck  = shuffle(ovCards);
      const { choices, choicesFull, correctIndex } = buildQuestion(deck, 0, allCards);
      setBattle({
        stage,
        playerHP: PLAYER_BASE_HP, maxPlayerHP: PLAYER_BASE_HP,
        bossHP: stage.bossHP, maxBossHP: stage.bossHP,
        deck, deckIndex: 0, choices, choicesFull, correctIndex,
        selectedIndex: null, isCorrect: null,
        combo: 0, maxCombo: 0, wrongStreak: 0, bossRage: false,
        totalAnswered: 0, correctCount: 0,
        inventory: saveData.inventory,
        shieldActive: false, lightningActive: false, eliminatedIndex: null,
        animState: 'IDLE', damageKey: 0, damageAmount: 0, damageToBoss: true,
      });
      setScreen('BATTLE');
      return;
    }

    // ── Flashcard Deck World ──────────────────────────────────────────────
    const allFlashcards = flashcards;
    const allCards: BattleCard[] = allFlashcards.map(f => ({
      id: f.id, front: f.front, back: f.back,
      deckName: decks.find(d => d.id === f.deckId)?.name,
    }));

    const filteredFlashcards = worldId === 'all'
      ? allFlashcards
      : allFlashcards.filter(f => f.deckId === worldId);

    if (filteredFlashcards.length < 4) return;

    const deckName = worldId === 'all' ? null : decks.find(d => d.id === worldId)?.name ?? null;
    const stage = generateWaveStage(wave, worldId, deckName, filteredFlashcards.length);

    const sorted = [...filteredFlashcards].sort((a, b) => cardPriority(a) - cardPriority(b));
    const grouped: typeof sorted[] = [[], [], [], [], []];
    sorted.forEach(c => grouped[cardPriority(c)].push(c));
    grouped.forEach(g => { for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i+1)); [g[i],g[j]]=[g[j],g[i]]; } });
    const priorityOrdered = grouped.flat();
    const count = Math.min(stage.cardCount, priorityOrdered.length);
    const selectedFlashcards = priorityOrdered.slice(0, count);

    // ── AI decompose + regex fallback ────────────────────────────────────
    setPreparing(true);
    let aiResults: Map<string, import('@/lib/aiDecomposer').AiSubCard[]>;
    try {
      aiResults = await aiDecomposeCards(
        selectedFlashcards.map(f => ({ id: f.id, front: f.front, back: f.back }))
      );
    } catch { aiResults = new Map(); }
    setPreparing(false);

    const deck: BattleCard[] = [];
    for (const f of selectedFlashcards) {
      const dn = decks.find(d => d.id === f.deckId)?.name;
      const aiSubs = aiResults.get(f.id);
      if (aiSubs && aiSubs.length >= 2) {
        // AI gave us sub-questions — use them
        aiSubs.forEach((s, i) => deck.push({ id: `${f.id}_ai_${i}`, front: s.front, back: s.back, deckName: dn, parentId: f.id }));
      } else {
        // Fallback: regex decomposition
        deck.push(...decomposeFrontBack(f, dn));
      }
    }
    // Shuffle decomposed pool, then cap at cardCount
    shuffle(deck);
    if (deck.length > stage.cardCount) deck.splice(stage.cardCount);
    const { choices, choicesFull, correctIndex } = buildQuestion(deck, 0, allCards);

    setBattle({
      stage,
      playerHP: PLAYER_BASE_HP, maxPlayerHP: PLAYER_BASE_HP,
      bossHP: stage.bossHP, maxBossHP: stage.bossHP,
      deck, deckIndex: 0, choices, choicesFull, correctIndex,
      selectedIndex: null, isCorrect: null,
      combo: 0, maxCombo: 0, wrongStreak: 0, bossRage: false,
      totalAnswered: 0, correctCount: 0,
      inventory: saveData.inventory,
      shieldActive: false, lightningActive: false, eliminatedIndex: null,
      animState: 'IDLE', damageKey: 0, damageAmount: 0, damageToBoss: true,
    });
    setScreen('BATTLE');
  }, [flashcards, decks, overviews, saveData.inventory, buildQuestion]);


  const handleAnswer = useCallback((choiceIndex: number) => {
    setBattle(prev => {
      if (!prev || prev.animState !== 'IDLE' || prev.selectedIndex !== null) return prev;
      const isCorrect = choiceIndex === prev.correctIndex;
      return { ...prev, selectedIndex: choiceIndex, isCorrect, animState: isCorrect ? 'PLAYER_ATTACK' : 'SHOW_WRONG' };
    });
  }, []);

  const resolveAnswer = useCallback(() => {
    // ── Accumulate SRS update into pending batch ──────────────────────────────
    const cur = battleRef.current;
    if (cur && cur.isCorrect !== null) {
      const card      = cur.deck[cur.deckIndex];
      const wasCorrect = cur.isCorrect;
      const combo      = cur.combo;
      // parentId points to the real flashcard (for sub-cards); id for regular cards
      const srcCard = flashcards.find(c => c.id === (card?.parentId ?? card?.id));
      if (srcCard && card) {
        const todayStr = new Date().toISOString().slice(0, 10);
        const currentInterval = Math.max(1, srcCard.interval || 1);
        const multiplier = wasCorrect ? (combo >= 2 ? 2.0 : 1.3) : 0;
        const newInterval = wasCorrect
          ? Math.min(365, Math.round(currentInterval * multiplier))
          : 1;
        const nextDate = new Date(Date.now() + newInterval * 86400000).toISOString().slice(0, 10);
        // Last-write-wins: if card appears again, newest result overwrites
        // Skip SRS for overview-derived card IDs
        if (!card.id.startsWith('ov_')) {
          pendingUpdates.current.set(srcCard.id, {
            lastReviewed: todayStr,
            nextReviewDate: nextDate,
            interval: newInterval,
            status: wasCorrect && newInterval >= 21 ? 'mastered' : 'learning',
          });
          answeredSinceFlush.current++;
          if (answeredSinceFlush.current >= 10) flushSRSUpdates();
        }
      }
    }

    setBattle(prev => {
      if (!prev) return prev;
      const isCorrect = prev.isCorrect!;
      const allCards: BattleCard[] = flashcards.map(f => ({ id: f.id, front: f.front, back: f.back }));
      let { playerHP, bossHP, combo, wrongStreak, bossRage } = prev;
      let damageAmount = 0;

      if (isCorrect) {
        let dmg = PLAYER_ATTACK;
        if (prev.lightningActive) dmg *= 3;
        if (combo + 1 >= 3) dmg *= 2;
        bossHP = Math.max(0, bossHP - dmg);
        combo++; wrongStreak = 0; bossRage = false; damageAmount = dmg;
      } else {
        if (!prev.shieldActive) {
          const dmg = bossRage ? Math.round(BOSS_ATTACK * 1.5) : BOSS_ATTACK;
          playerHP = Math.max(0, playerHP - dmg);
          damageAmount = dmg;
        }
        combo = 0; wrongStreak++; bossRage = wrongStreak >= 2;
      }

      const maxCombo = Math.max(prev.maxCombo, combo);
      const totalAnswered = prev.totalAnswered + 1;
      const correctCount  = prev.correctCount + (isCorrect ? 1 : 0);

      if (bossHP <= 0 || playerHP <= 0) {
        const victory = bossHP <= 0;
        const { worldId, id: wave } = prev.stage;
        const stars  = victory ? calcStars(correctCount, totalAnswered, maxCombo) : 0;
        const reward = victory ? ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)] : null;

        setSaveData(sd => {
          const ws = getWorldSave(sd, worldId);
          const prevStars = ws.stars[wave] ?? 0;
          const isOverview = worldId.startsWith('ov_');
          return {
            ...sd,
            worlds: {
              ...sd.worlds,
              [worldId]: {
                // Overview worlds stay at wave 1 (no progression — re-challenge same content)
                currentWave: isOverview ? 1 : (victory ? wave + 1 : ws.currentWave),
                bestWave:    victory ? Math.max(ws.bestWave, wave) : ws.bestWave,
                stars:       { ...ws.stars, [wave]: Math.max(prevStars, stars) },
              },
            },
            inventory: reward && victory ? [...sd.inventory, reward].slice(-3) : sd.inventory,
            totalWins: sd.totalWins + (victory ? 1 : 0),
          };
        });

        setResult({ victory, stageId: wave, worldId, correctCount, totalAnswered, maxCombo, stars, reward });
        setScreen('RESULT');
        return null;
      }

      const nextIndex = (prev.deckIndex + 1) % prev.deck.length;
      const { choices, choicesFull, correctIndex } = buildQuestion(prev.deck, nextIndex, allCards);
      return {
        ...prev,
        playerHP, bossHP, combo, maxCombo, wrongStreak, bossRage,
        totalAnswered, correctCount, deckIndex: nextIndex,
        choices, choicesFull, correctIndex,
        selectedIndex: null, isCorrect: null, animState: 'IDLE',
        shieldActive: isCorrect ? prev.shieldActive : false,
        lightningActive: isCorrect ? false : prev.lightningActive,
        eliminatedIndex: null,
        damageKey: prev.damageKey + 1, damageAmount, damageToBoss: isCorrect,
      };
    });
  }, [flashcards, buildQuestion]);

  const handleUseItem = useCallback((idx: number) => {
    setBattle(prev => {
      if (!prev || prev.animState !== 'IDLE') return prev;
      const item = prev.inventory[idx];
      if (!item) return prev;
      const newInv = prev.inventory.filter((_, i) => i !== idx);
      setSaveData(sd => ({ ...sd, inventory: newInv }));
      if (item.type === 'potion')    return { ...prev, playerHP: Math.min(prev.maxPlayerHP, prev.playerHP + 30), inventory: newInv };
      if (item.type === 'lightning') return { ...prev, lightningActive: true, inventory: newInv };
      if (item.type === 'shield')    return { ...prev, shieldActive: true, inventory: newInv };
      if (item.type === 'crystal') {
        const wrong = prev.choices.map((_, i) => i).filter(i => i !== prev.correctIndex && i !== prev.eliminatedIndex);
        const elim  = wrong[Math.floor(Math.random() * wrong.length)] ?? null;
        return { ...prev, eliminatedIndex: elim, inventory: newInv };
      }
      return prev;
    });
  }, []);

  if (!user) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-4">
      <div className="text-6xl">⚔️</div>
      <h1 className="text-2xl font-bold">卡牌战争冒险</h1>
      <p className="text-muted-foreground">请先登录后游玩。</p>
      <Link href={`/${currentLocale}/auth`} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium hover:bg-primary/90 transition-colors">登录</Link>
    </div>
  );

  if (isLoading) return <div className="flex items-center justify-center min-h-[80vh]"><div className="text-5xl animate-bounce">⚔️</div></div>;

  if (flashcards.length < 4) return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-4">
      <div className="text-6xl">😢</div>
      <h1 className="text-2xl font-bold">卡片不足</h1>
      <p className="text-muted-foreground">至少需要 4 张抽认卡才能游玩。当前：{flashcards.length} 张。</p>
      <Link href={`/${currentLocale}/flashcards/new`} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium hover:bg-primary/90 transition-colors">去创建卡片</Link>
    </div>
  );

  return (
    <div className="fixed inset-0 z-30 overflow-hidden" style={{ top: '64px' }}>
      {screen === 'MAP' && (
        <>
          <WorldMap flashcards={flashcards} decks={decks} overviews={overviews} saveData={saveData} onStartWave={startStage} />
          {preparing && (
            <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm">
              <div className="text-5xl animate-spin mb-4">⚙️</div>
              <p className="text-white font-bold text-lg">AI 正在分析题目...</p>
              <p className="text-white/40 text-sm mt-1">智能拆解复杂知识点</p>
            </div>
          )}
        </>
      )}
      {screen === 'BATTLE' && battle && (
        <BattleScene battle={battle} onAnswer={handleAnswer} onUseItem={handleUseItem} onAnimationDone={resolveAnswer} />
      )}
      {screen === 'RESULT' && result && (
        <StageResult
          result={result}
          decks={decks}
          saveData={saveData}
          onNextWave={() => { const ws = getWorldSave(saveData, result.worldId); startStage(result.worldId, ws.currentWave); setResult(null); }}
          onRetry={() => { startStage(result.worldId, result.stageId); setResult(null); }}
          onBackToMap={() => { setResult(null); setBattle(null); setScreen('MAP'); }}
        />
      )}
    </div>
  );
}
