"use client";
import React, { useState, useCallback, useEffect } from 'react';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentLocale } from '@/lib/i18n/client';
import Link from 'next/link';
import type { Deck, Flashcard } from '@/types';
import WorldMap from './WorldMap';
import BattleScene from './BattleScene';
import StageResult from './StageResult';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UnitClass = 'melee' | 'ranged' | 'tank' | 'boss';

export interface Entity {
  id: string;
  type: 'ally' | 'enemy';
  class: UnitClass;
  emoji: string;
  name: string;
  x: number; // 0 to 100 (percentage of lane)
  hp: number;
  maxHp: number;
  atk: number;
  speed: number;
  range: number;
  lastAtkTime: number;
  atkCooldown: number;
}

export interface GameState {
  mana: number;
  maxMana: number;
  playerBaseHP: number;
  enemyBaseHP: number;
  maxBaseHP: number;
  entities: Entity[];
  isPaused: boolean;
  gameTime: number;
}

export interface Item {
  type: 'potion' | 'lightning' | 'crystal' | 'shield';
  emoji: string;
  name: string;
  desc: string;
}

export interface WorldSave {
  currentWave: number;   // wave to attempt next
  bestWave: number;      // highest wave cleared
  stars: Record<number, number>; // wave -> stars (1-3)
}

export interface SaveData {
  worlds: Record<string, WorldSave>;  // key = deckId | 'all'
  inventory: Item[];
  totalWins: number;
}

export interface ResultData {
  victory: boolean;
  stageId: number;
  worldId: string;
  stars: number;
  reward: Item | null;
}

export interface StageConfig {
  id: number;         // wave number
  worldId: string;    // deckId | 'all'
  name: string;
  boss: string;
  bossEmoji: string;
  enemyTypes: UnitClass[];
  spawnRate: number; // Seconds between enemy spawns
  bgFrom: string; bgVia: string; bgTo: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SAVE_KEY = 'card_war_auto_v1';
const TICK_MS = 1000 / 60; // 60 FPS
const BASE_MAX_HP = 500;
const MANA_PER_CORRECT = 25;
const MANA_MAX = 100;

export const ALLY_UNITS: Record<string, Partial<Entity>> = {
  melee: { name: '剑士', emoji: '⚔️', hp: 100, atk: 15, speed: 0.15, range: 5, atkCooldown: 1000 },
  ranged: { name: '弓箭手', emoji: '🏹', hp: 50, atk: 20, speed: 0.12, range: 25, atkCooldown: 1200 },
  tank: { name: '盾卫', emoji: '🛡️', hp: 250, atk: 5, speed: 0.08, range: 4, atkCooldown: 1500 },
  boss: { name: '英雄', emoji: '🧙', hp: 500, atk: 50, speed: 0.05, range: 10, atkCooldown: 2000 },
};

export const ENEMY_UNITS: Record<string, Partial<Entity>> = {
  melee: { name: '小鬼', emoji: '👹', hp: 80, atk: 10, speed: 0.12, range: 5, atkCooldown: 1200 },
  ranged: { name: '投石鬼', emoji: '👺', hp: 40, atk: 12, speed: 0.1, range: 20, atkCooldown: 1500 },
  tank: { name: '巨魔', emoji: '🐺', hp: 200, atk: 8, speed: 0.06, range: 4, atkCooldown: 1800 },
  boss: { name: '魔王', emoji: '🐉', hp: 1000, atk: 30, speed: 0.04, range: 12, atkCooldown: 2500 },
};

export const UNIT_COSTS: Record<string, number> = {
  melee: 20,
  ranged: 35,
  tank: 50,
};

// Boss pool — cycles with wave number, can be themed by deck
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

// ─── Wave generator ────────────────────────────────────────────────────────────

// Deck-aware boss overrides based on keywords in deck name
const THEMED_BOSSES: { keywords: string[]; bosses: typeof BOSS_POOL }[] = [
  {
    keywords: ['心理', 'psych', 'mental', 'cognitive'],
    bosses: [
      { name: '潜意识怪物', emoji: '🧠', bg: ['from-pink-950','via-rose-900','to-purple-950'] },
      { name: '认知扭曲者', emoji: '🌀', bg: ['from-fuchsia-950','via-pink-900','to-rose-950'] },
      { name: '情绪操控者', emoji: '🎭', bg: ['from-purple-950','via-fuchsia-900','to-pink-950'] },
      { name: '记忆吞噬者', emoji: '🌫️', bg: ['from-slate-950','via-gray-900','to-zinc-950'] },
    ],
  },
  {
    keywords: ['system', 'design', '架构', 'architecture', 'infra'],
    bosses: [
      { name: '单点故障',   emoji: '🏗️', bg: ['from-sky-950','via-blue-900','to-indigo-950']   },
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

export function generateWaveStage(
  wave: number,
  worldId: string,
  deckName: string | null,
  totalCards: number,
): StageConfig {
  const pool = pickBossPool(deckName);
  const boss = pool[(wave - 1) % pool.length];
  
  // Complexity increases with wave
  const spawnRate = Math.max(2.5, 6 - (wave * 0.2));
  const enemyTypes: UnitClass[] = ['melee'];
  if (wave >= 3) enemyTypes.push('ranged');
  if (wave >= 5) enemyTypes.push('tank');

  return {
    id: wave,
    worldId,
    name: `第 ${wave} 关: ${boss.name}`,
    boss: boss.name,
    bossEmoji: boss.emoji,
    enemyTypes,
    spawnRate,
    bgFrom: boss.bg[0],
    bgVia: boss.bg[1],
    bgTo: boss.bg[2],
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

function readSave(): SaveData {
  if (typeof window === 'undefined') return { worlds: {}, inventory: [], totalWins: 0 };
  try {
    const s = localStorage.getItem(SAVE_KEY);
    if (s) return JSON.parse(s);
  } catch {}
  return { worlds: {}, inventory: [], totalWins: 0 };
}

function writeSave(d: SaveData) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(d)); } catch {}
}

function getWorldSave(save: SaveData, worldId: string): WorldSave {
  const ws = save.worlds[worldId];
  if (!ws) return { currentWave: 1, bestWave: 0, stars: {} };
  return { ...ws, stars: ws.stars || {} };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CardWarGame() {
  const { flashcards, decks, isLoading: contextLoading } = useFlashcards();
  const { user } = useAuth();
  const currentLocale = useCurrentLocale();

  const [screen, setScreen] = useState<'MAP' | 'BATTLE' | 'RESULT'>('MAP');
  const [saveData, setSaveData] = useState<SaveData>(readSave);
  const [stage, setStage] = useState<StageConfig | null>(null);
  const [result, setResult] = useState<ResultData | null>(null);

  // Real-time Battle State
  const [game, setGame] = useState<GameState | null>(null);
  const [deck, setDeck] = useState<Flashcard[]>([]);
  const [deckIndex, setDeckIndex] = useState(0);

  // Persistence side-effect
  useEffect(() => { writeSave(saveData); }, [saveData]);

  // ─── Actions ────────────────────────────────────────────────────────────────

  const startStage = useCallback((worldId: string, wave: number) => {
    const worldName = worldId === 'all' ? '全部卡片' : decks.find(d => d.id === worldId)?.name ?? null;
    const worldCards = worldId === 'all' ? flashcards : flashcards.filter(f => f.deckId === worldId);
    
    if (worldCards.length < 4) return;

    const config = generateWaveStage(wave, worldId, worldName, worldCards.length);
    setStage(config);
    setDeck([...worldCards].sort(() => Math.random() - 0.5));
    setDeckIndex(0);
    
    setGame({
      mana: 20,
      maxMana: MANA_MAX,
      playerBaseHP: BASE_MAX_HP,
      enemyBaseHP: BASE_MAX_HP,
      maxBaseHP: BASE_MAX_HP,
      entities: [],
      isPaused: false,
      gameTime: 0,
    });
    setScreen('BATTLE');
  }, [flashcards, decks]);

  const spawnUnit = useCallback((type: 'ally' | 'enemy', uClass: UnitClass) => {
    const config = type === 'ally' ? ALLY_UNITS[uClass] : ENEMY_UNITS[uClass];
    const newEntity: Entity = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      class: uClass,
      emoji: config.emoji!,
      name: config.name!,
      x: type === 'ally' ? 0 : 100,
      hp: config.hp!,
      maxHp: config.hp!,
      atk: config.atk!,
      speed: config.speed!,
      range: config.range!,
      lastAtkTime: 0,
      atkCooldown: config.atkCooldown!,
    };
    
    setGame(prev => {
      if (!prev) return null;
      if (type === 'ally') {
        const cost = UNIT_COSTS[uClass] || 0;
        if (prev.mana < cost) return prev;
        return { ...prev, mana: prev.mana - cost, entities: [...prev.entities, newEntity] };
      }
      return { ...prev, entities: [...prev.entities, newEntity] };
    });
  }, []);

  const resolveAnswer = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      setGame(prev => {
        if (!prev) return null;
        return { ...prev, mana: Math.min(prev.maxMana, prev.mana + MANA_PER_CORRECT) };
      });
    }
    setDeckIndex(prev => (prev + 1) % deck.length);
  }, [deck.length]);

  // ─── Game Loop (The Heart) ──────────────────────────────────────────────────

  useEffect(() => {
    if (screen !== 'BATTLE' || !game || game.isPaused) return;

    let lastTime = performance.now();
    let spawnTimer = 0;
    let frameId: number;

    const tick = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;

      setGame(prev => {
        if (!prev) return null;
        
        const entities = [...prev.entities];
        let playerBaseHP = prev.playerBaseHP;
        let enemyBaseHP = prev.enemyBaseHP;
        const newGameTime = prev.gameTime + dt;

        // 1. Enemy Spawning
        spawnTimer += dt;
        if (spawnTimer >= (stage?.spawnRate || 5) * 1000) {
          spawnTimer = 0;
          const eClass = stage?.enemyTypes[Math.floor(Math.random() * stage.enemyTypes.length)] || 'melee';
          const config = ENEMY_UNITS[eClass];
          entities.push({
            id: Math.random().toString(36).substr(2, 9),
            type: 'enemy',
            class: eClass,
            emoji: config.emoji!,
            name: config.name!,
            x: 100,
            hp: config.hp!,
            maxHp: config.hp!,
            atk: config.atk!,
            speed: config.speed!,
            range: config.range!,
            lastAtkTime: 0,
            atkCooldown: config.atkCooldown!,
          });
        }

        // 2. Update Entities
        for (let i = 0; i < entities.length; i++) {
          const e = entities[i];
          
          // Find targets
          const targets = entities.filter(t => t.type !== e.type);
          const baseTargetX = e.type === 'ally' ? 100 : 0;
          
          // Check for collision with entities
          let closestTarget: Entity | null = null;
          let minDist = 1000;
          
          for (const t of targets) {
            const dist = Math.abs(t.x - e.x);
            if (dist < minDist) {
              minDist = dist;
              closestTarget = t;
            }
          }

          const distToBase = Math.abs(baseTargetX - e.x);
          
          // Attack Logic
          if (closestTarget && minDist <= e.range) {
            if (newGameTime - e.lastAtkTime >= e.atkCooldown) {
              closestTarget.hp -= e.atk;
              e.lastAtkTime = newGameTime;
            }
          } else if (distToBase <= e.range) {
            if (newGameTime - e.lastAtkTime >= e.atkCooldown) {
              if (e.type === 'ally') enemyBaseHP -= e.atk;
              else playerBaseHP -= e.atk;
              e.lastAtkTime = newGameTime;
            }
          } else {
            // Movement
            const direction = e.type === 'ally' ? 1 : -1;
            e.x += direction * e.speed * (dt / 16);
          }
        }

        // 3. Remove dead entities
        const aliveEntities = entities.filter(e => e.hp > 0);

        // 4. Check Win/Loss
        if (playerBaseHP <= 0 || enemyBaseHP <= 0) {
          const victory = enemyBaseHP <= 0;
          const { worldId, id: wave } = stage!;
          
          setSaveData(sd => {
            const ws = getWorldSave(sd, worldId);
            const newWave = victory ? Math.max(ws.currentWave, wave + 1) : ws.currentWave;
            const newBest = victory ? Math.max(ws.bestWave, wave) : ws.bestWave;
            const newStars = { ...ws.stars };
            if (victory) newStars[wave] = Math.max(newStars[wave] ?? 0, 3); // Simplified stars for now
            return {
              ...sd,
              worlds: { ...sd.worlds, [worldId]: { currentWave: newWave, bestWave: newBest, stars: newStars } },
              totalWins: sd.totalWins + (victory ? 1 : 0),
            };
          });

          setResult({ victory, stageId: wave, worldId, stars: victory ? 3 : 0, reward: null });
          setScreen('RESULT');
          return null;
        }

        return { ...prev, entities: aliveEntities, playerBaseHP, enemyBaseHP, gameTime: newGameTime };
      });

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [screen, game, stage]);

  if (contextLoading) return <div className="h-full flex items-center justify-center text-white">加载中...</div>;

  return (
    <div className="h-full w-full bg-black relative font-sans select-none overflow-hidden">
      {screen === 'MAP' && (
        <WorldMap
          flashcards={flashcards}
          decks={decks}
          saveData={saveData}
          onStartWave={startStage}
        />
      )}

      {screen === 'BATTLE' && game && stage && (
        <BattleScene
          game={game}
          deck={deck}
          deckIndex={deckIndex}
          onAnswer={resolveAnswer}
          onSpawnUnit={(uClass) => spawnUnit('ally', uClass)}
          onBackToMap={() => setScreen('MAP')}
        />
      )}

      {screen === 'RESULT' && result && (
        <StageResult
          result={result}
          decks={decks}
          saveData={saveData}
          onNextWave={() => {
            const nextWave = result.stageId + 1;
            setResult(null);
            startStage(result.worldId, nextWave);
          }}
          onRetry={() => {
            setResult(null);
            startStage(result.worldId, result.stageId);
          }}
          onBackToMap={() => { setResult(null); setScreen('MAP'); }}
        />
      )}
    </div>
  );
}
