"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentLocale } from '@/lib/i18n/client';
import Link from 'next/link';
import WorldMap from './WorldMap';
import BattleScene from './BattleScene';
import StageResult from './StageResult';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ItemType = 'potion' | 'lightning' | 'crystal' | 'shield';
export interface Item { type: ItemType; emoji: string; name: string; desc: string; }
export type AnimState = 'IDLE' | 'PLAYER_ATTACK' | 'BOSS_ATTACK' | 'SHOW_WRONG';

export interface StageConfig {
  id: number;
  name: string;
  boss: string;
  bossEmoji: string;
  bossHP: number;
  cardCount: number;
  bgFrom: string;
  bgVia: string;
  bgTo: string;
}

export interface BattleCard { id: string; front: string; back: string; }

export interface BattleState {
  stage: StageConfig;
  playerHP: number;
  maxPlayerHP: number;
  bossHP: number;
  maxBossHP: number;
  deck: BattleCard[];
  deckIndex: number;
  choices: string[];           // 4 displayed options (truncated)
  choicesFull: string[];       // 4 full backs for "view full answer"
  correctIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean | null;
  combo: number;
  maxCombo: number;
  wrongStreak: number;
  bossRage: boolean;
  totalAnswered: number;
  correctCount: number;
  inventory: Item[];
  shieldActive: boolean;
  lightningActive: boolean;
  crystalActive: boolean;      // eliminates one wrong option
  eliminatedIndex: number | null;
  animState: AnimState;
  damageKey: number;           // bump to retrigger floating damage
  damageAmount: number;
  damageToBoss: boolean;
}

export interface SaveData {
  unlockedStages: number;
  stageStars: Record<number, number>;
  inventory: Item[];
  totalWins: number;
}

export interface ResultData {
  victory: boolean;
  stageId: number;
  correctCount: number;
  totalAnswered: number;
  maxCombo: number;
  stars: number;
  reward: Item | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SAVE_KEY = 'card_war_save_v1';
const PLAYER_MAX_HP = 100;
const PLAYER_ATTACK = 30;
const BOSS_ATTACK = 20;
const COMBO_THRESHOLD = 3;
const RAGE_THRESHOLD = 2;

export const ITEM_POOL: Item[] = [
  { type: 'potion',    emoji: '🧪', name: '治愈药水',  desc: '恢复 30 HP' },
  { type: 'lightning', emoji: '⚡', name: '闪电符文',  desc: '下次答对伤害 ×3' },
  { type: 'crystal',   emoji: '🔮', name: '预言水晶',  desc: '排除一个错误选项' },
  { type: 'shield',    emoji: '🛡️', name: '铁壁盾牌',  desc: '下次答错不扣血' },
];

// Dynamic stages based on card count — called at game start
export function buildStages(totalCards: number): StageConfig[] {
  const stageTemplates = [
    { name: '新手村',   boss: '石头傀儡',  bossEmoji: '🪨', hpMult: 2.5, cardFrac: 0.15, bgFrom: 'from-emerald-950', bgVia: 'via-green-900',  bgTo: 'to-teal-950'   },
    { name: '暗黑森林', boss: '暗影精灵',  bossEmoji: '🧝', hpMult: 3.5, cardFrac: 0.20, bgFrom: 'from-purple-950', bgVia: 'via-violet-900', bgTo: 'to-slate-950'  },
    { name: '冰雪神殿', boss: '冰霜法师',  bossEmoji: '❄️', hpMult: 4.5, cardFrac: 0.25, bgFrom: 'from-blue-950',   bgVia: 'via-cyan-900',   bgTo: 'to-indigo-950' },
    { name: '火焰裂谷', boss: '熔岩巨人',  bossEmoji: '🌋', hpMult: 6.0, cardFrac: 0.30, bgFrom: 'from-red-950',    bgVia: 'via-orange-900', bgTo: 'to-amber-950'  },
    { name: '最终之塔', boss: '知识守护者',bossEmoji: '👁️', hpMult: 8.0, cardFrac: 0.35, bgFrom: 'from-violet-950', bgVia: 'via-indigo-900', bgTo: 'to-slate-950'  },
  ];

  const clampedCards = Math.max(totalCards, 4);
  const stageCount = Math.min(5, Math.max(1, Math.ceil(clampedCards / 8)));

  return stageTemplates.slice(0, stageCount).map((t, i) => ({
    id: i + 1,
    name: t.name,
    boss: t.boss,
    bossEmoji: t.bossEmoji,
    bossHP: Math.round(PLAYER_ATTACK * t.hpMult),
    cardCount: Math.max(4, Math.round(clampedCards * t.cardFrac)),
    bgFrom: t.bgFrom,
    bgVia: t.bgVia,
    bgTo: t.bgTo,
  }));
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '[代码]')
    .replace(/`[^`]*`/g, match => match.slice(1, -1))
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    .replace(/^[-*+]\s/gm, '')
    .replace(/^\d+\.\s/gm, '')
    .replace(/\n+/g, ' ')
    .trim();
}

function truncate(text: string, max = 80): string {
  const stripped = stripMarkdown(text);
  return stripped.length > max ? stripped.slice(0, max) + '…' : stripped;
}

function calcStars(correctCount: number, total: number, maxCombo: number): number {
  const acc = correctCount / Math.max(total, 1);
  if (acc >= 0.9 && maxCombo >= COMBO_THRESHOLD) return 3;
  if (acc >= 0.7) return 2;
  return 1;
}

function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { unlockedStages: 1, stageStars: {}, inventory: [], totalWins: 0 };
}

function writeSave(data: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch {}
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CardWarGame() {
  const { flashcards, isLoading } = useFlashcards();
  const { user } = useAuth();
  const currentLocale = useCurrentLocale();

  const [screen, setScreen] = useState<'MAP' | 'BATTLE' | 'RESULT'>('MAP');
  const [saveData, setSaveData] = useState<SaveData>(() => loadSave());
  const [battle, setBattle] = useState<BattleState | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);
  const stages = React.useMemo(() => buildStages(flashcards.length), [flashcards.length]);

  // Keep saveData synced to localStorage
  useEffect(() => { writeSave(saveData); }, [saveData]);

  // ── Build question for current deck index ──
  const buildQuestion = useCallback((deck: BattleCard[], index: number, allCards: BattleCard[]) => {
    const card = deck[index % deck.length];
    const correct = card.back;

    // Pick 3 distractors from all cards (excluding current)
    const distractors = shuffle(allCards.filter(c => c.id !== card.id))
      .slice(0, 3)
      .map(c => c.back);

    // Ensure we always have 3 distractors (pad if insufficient)
    while (distractors.length < 3) distractors.push('（无）');

    const fullOptions = shuffle([correct, ...distractors]);
    const correctIndex = fullOptions.indexOf(correct);

    return {
      choices: fullOptions.map(o => truncate(o, 80)),
      choicesFull: fullOptions,
      correctIndex,
    };
  }, []);

  // ── Start a stage ──
  const startStage = useCallback((stageId: number) => {
    const stage = stages.find(s => s.id === stageId);
    if (!stage) return;

    const allCards: BattleCard[] = flashcards.map(f => ({ id: f.id, front: f.front, back: f.back }));
    if (allCards.length < 4) return;

    const deck = shuffle(allCards).slice(0, Math.min(stage.cardCount, allCards.length));
    const { choices, choicesFull, correctIndex } = buildQuestion(deck, 0, allCards);

    setBattle({
      stage,
      playerHP: PLAYER_MAX_HP,
      maxPlayerHP: PLAYER_MAX_HP,
      bossHP: stage.bossHP,
      maxBossHP: stage.bossHP,
      deck,
      deckIndex: 0,
      choices, choicesFull, correctIndex,
      selectedIndex: null, isCorrect: null,
      combo: 0, maxCombo: 0, wrongStreak: 0, bossRage: false,
      totalAnswered: 0, correctCount: 0,
      inventory: saveData.inventory,
      shieldActive: false, lightningActive: false, crystalActive: false,
      eliminatedIndex: null,
      animState: 'IDLE', damageKey: 0, damageAmount: 0, damageToBoss: true,
    });
    setScreen('BATTLE');
  }, [stages, flashcards, saveData.inventory, buildQuestion]);

  // ── Handle answer ──
  const handleAnswer = useCallback((choiceIndex: number) => {
    setBattle(prev => {
      if (!prev || prev.animState !== 'IDLE' || prev.selectedIndex !== null) return prev;
      const isCorrect = choiceIndex === prev.correctIndex;
      return { ...prev, selectedIndex: choiceIndex, isCorrect, animState: isCorrect ? 'PLAYER_ATTACK' : 'SHOW_WRONG' };
    });
  }, []);

  // ── Resolve after animation ──
  const resolveAnswer = useCallback(() => {
    setBattle(prev => {
      if (!prev) return prev;
      const isCorrect = prev.isCorrect!;
      const allCards: BattleCard[] = flashcards.map(f => ({ id: f.id, front: f.front, back: f.back }));

      let playerHP = prev.playerHP;
      let bossHP = prev.bossHP;
      let combo = prev.combo;
      let wrongStreak = prev.wrongStreak;
      let bossRage = prev.bossRage;
      let damageAmount = 0;

      if (isCorrect) {
        let dmg = PLAYER_ATTACK;
        if (prev.lightningActive) dmg *= 3;
        if (combo + 1 >= COMBO_THRESHOLD) dmg *= 2; // combo burst on 3rd
        bossHP = Math.max(0, bossHP - dmg);
        combo = combo + 1;
        wrongStreak = 0;
        bossRage = false;
        damageAmount = dmg;
      } else {
        if (!prev.shieldActive) {
          const dmg = bossRage ? Math.round(BOSS_ATTACK * 1.5) : BOSS_ATTACK;
          playerHP = Math.max(0, playerHP - dmg);
          damageAmount = dmg;
        }
        combo = 0;
        wrongStreak = wrongStreak + 1;
        bossRage = wrongStreak >= RAGE_THRESHOLD;
      }

      const maxCombo = Math.max(prev.maxCombo, combo);
      const totalAnswered = prev.totalAnswered + 1;
      const correctCount = prev.correctCount + (isCorrect ? 1 : 0);

      // Check end conditions
      if (bossHP <= 0 || playerHP <= 0) {
        const victory = bossHP <= 0;
        const stageId = prev.stage.id;
        const stars = victory ? calcStars(correctCount, totalAnswered, maxCombo) : 0;
        const reward = victory ? ITEM_POOL[Math.floor(Math.random() * ITEM_POOL.length)] : null;

        // Update save
        setSaveData(sd => {
          const newStars = { ...sd.stageStars, [stageId]: Math.max(sd.stageStars[stageId] || 0, stars) };
          const newUnlocked = victory ? Math.max(sd.unlockedStages, stageId + 1) : sd.unlockedStages;
          const newInventory = reward && victory
            ? [...sd.inventory, reward].slice(-3) // max 3 items
            : sd.inventory;
          return { ...sd, unlockedStages: newUnlocked, stageStars: newStars, inventory: newInventory, totalWins: sd.totalWins + (victory ? 1 : 0) };
        });

        setResult({ victory, stageId, correctCount, totalAnswered, maxCombo, stars, reward });
        setScreen('RESULT');
        return null;
      }

      // Next card
      const nextIndex = prev.deckIndex + 1;
      const loopedIndex = nextIndex % prev.deck.length;
      const { choices, choicesFull, correctIndex } = buildQuestion(prev.deck, loopedIndex, allCards);

      return {
        ...prev,
        playerHP, bossHP, combo, maxCombo, wrongStreak, bossRage,
        totalAnswered, correctCount,
        deckIndex: loopedIndex,
        choices, choicesFull, correctIndex,
        selectedIndex: null, isCorrect: null,
        animState: 'IDLE',
        shieldActive: isCorrect ? prev.shieldActive : false, // shield consumed on wrong
        lightningActive: isCorrect ? false : prev.lightningActive, // lightning consumed on correct
        crystalActive: false, eliminatedIndex: null,
        damageKey: prev.damageKey + 1,
        damageAmount,
        damageToBoss: isCorrect,
      };
    });
  }, [flashcards, buildQuestion]);

  // ── Use item ──
  const handleUseItem = useCallback((idx: number) => {
    setBattle(prev => {
      if (!prev || prev.animState !== 'IDLE') return prev;
      const item = prev.inventory[idx];
      if (!item) return prev;
      const newInv = prev.inventory.filter((_, i) => i !== idx);

      // Also update save
      setSaveData(sd => ({ ...sd, inventory: newInv }));

      if (item.type === 'potion') {
        return { ...prev, playerHP: Math.min(prev.maxPlayerHP, prev.playerHP + 30), inventory: newInv };
      }
      if (item.type === 'lightning') return { ...prev, lightningActive: true, inventory: newInv };
      if (item.type === 'shield')   return { ...prev, shieldActive: true, inventory: newInv };
      if (item.type === 'crystal') {
        // Find an index that is NOT the correct answer to eliminate
        const wrongIndexes = prev.choices
          .map((_, i) => i)
          .filter(i => i !== prev.correctIndex && i !== prev.eliminatedIndex);
        const toEliminate = wrongIndexes[Math.floor(Math.random() * wrongIndexes.length)] ?? null;
        return { ...prev, crystalActive: true, eliminatedIndex: toEliminate, inventory: newInv };
      }
      return prev;
    });
  }, []);

  // ── Empty-state guard ──
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-4">
        <div className="text-6xl">⚔️</div>
        <h1 className="text-2xl font-bold">卡牌战争冒险</h1>
        <p className="text-muted-foreground">请先登录后游玩。</p>
        <Link href={`/${currentLocale}/auth`} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium hover:bg-primary/90 transition-colors">
          登录
        </Link>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-5xl animate-spin">⚔️</div>
      </div>
    );
  }

  if (flashcards.length < 4) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4 text-center px-4">
        <div className="text-6xl">😢</div>
        <h1 className="text-2xl font-bold">卡片不足</h1>
        <p className="text-muted-foreground">至少需要 4 张抽认卡才能游玩。当前：{flashcards.length} 张。</p>
        <Link href={`/${currentLocale}/flashcards/new`} className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-6 py-2.5 font-medium hover:bg-primary/90 transition-colors">
          去创建卡片
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-30 overflow-hidden" style={{ top: '64px' }}>
      {screen === 'MAP' && (
        <WorldMap
          stages={stages}
          saveData={saveData}
          onSelectStage={startStage}
        />
      )}
      {screen === 'BATTLE' && battle && (
        <BattleScene
          battle={battle}
          onAnswer={handleAnswer}
          onUseItem={handleUseItem}
          onAnimationDone={resolveAnswer}
        />
      )}
      {screen === 'RESULT' && result && (
        <StageResult
          result={result}
          stages={stages}
          onContinue={() => { setResult(null); setBattle(null); setScreen('MAP'); }}
          onRetry={() => { startStage(result.stageId); setResult(null); }}
        />
      )}
    </div>
  );
}
