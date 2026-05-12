"use client";
import React, { useState, useMemo } from 'react';
import type { GameState, Entity, UnitClass } from './CardWarGame';
import type { Flashcard } from '@/types';
import { UNIT_COSTS, ALLY_UNITS } from './CardWarGame';
import { X, Sword, Shield, Zap, Heart } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  game: GameState;
  deck: Flashcard[];
  deckIndex: number;
  onAnswer: (isCorrect: boolean) => void;
  onSpawnUnit: (uClass: UnitClass) => void;
  onBackToMap: () => void;
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'];

export default function BattleScene({ game, deck, deckIndex, onAnswer, onSpawnUnit, onBackToMap }: Props) {
  const currentCard = deck[deckIndex];
  
  // Generate choices (1 correct + 3 random)
  const choices = useMemo(() => {
    if (!currentCard) return [];
    const others = deck.filter(c => c.id !== currentCard.id);
    const wrong = [...others].sort(() => Math.random() - 0.5).slice(0, 3).map(c => c.back);
    return [...wrong, currentCard.back].sort(() => Math.random() - 0.5);
  }, [currentCard, deck]);

  const handleChoice = (choice: string) => {
    onAnswer(choice === currentCard.back);
  };

  return (
    <div className="h-full w-full flex flex-col bg-slate-950 text-white">
      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/50 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-violet-600/20 px-3 py-1 rounded-full border border-violet-500/30">
            <Zap className="h-3 w-3 text-violet-400 fill-violet-400" />
            <span className="text-xs font-black text-violet-100">{Math.floor(game.mana)} / {game.maxMana}</span>
          </div>
          <div className="h-2 w-24 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div className="h-full bg-violet-500 transition-all" style={{ width: `${(game.mana / game.maxMana) * 100}%` }} />
          </div>
        </div>
        <button onClick={onBackToMap} className="p-1 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-colors">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* ── Battlefield (Middle) ── */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-b from-indigo-950/20 to-slate-950">
        
        {/* Lane Background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-full h-px bg-white/20" />
        </div>

        {/* Bases */}
        <Base 
          side="left" 
          hp={game.playerBaseHP} 
          maxHp={game.maxBaseHP} 
          emoji="🏰" 
          name="我的基地" 
        />
        <Base 
          side="right" 
          hp={game.enemyBaseHP} 
          maxHp={game.maxBaseHP} 
          emoji="🏯" 
          name="敌军基地" 
        />

        {/* Entities */}
        {game.entities.map(e => (
          <Unit key={e.id} entity={e} />
        ))}
      </div>

      {/* ── Spawn Bar ── */}
      <div className="flex justify-center gap-2 px-4 py-3 bg-black/40 border-t border-white/10 flex-shrink-0">
        {(['melee', 'ranged', 'tank'] as UnitClass[]).map(uClass => {
          const cost = UNIT_COSTS[uClass];
          const canAfford = game.mana >= cost;
          const config = ALLY_UNITS[uClass];
          return (
            <button
              key={uClass}
              onClick={() => onSpawnUnit(uClass)}
              disabled={!canAfford}
              className={`
                group flex flex-col items-center gap-1 p-2 rounded-xl border transition-all
                ${canAfford ? 'bg-white/5 border-white/20 hover:bg-white/10 hover:border-violet-500/50 hover:scale-105 active:scale-95' : 'bg-black/20 border-white/5 opacity-40 cursor-not-allowed'}
              `}
            >
              <span className="text-2xl group-hover:animate-bounce">{config.emoji}</span>
              <div className="flex items-center gap-0.5 text-[9px] font-black uppercase text-violet-400">
                <Zap className="h-2 w-2 fill-violet-400" /> {cost}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Flashcard Console (Bottom) ── */}
      <div className="bg-slate-900 border-t border-white/15 px-6 pt-6 pb-8 flex-shrink-0 overflow-y-auto max-h-[50%]">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 text-center">
            <div className="inline-block px-3 py-1 bg-violet-500/10 border border-violet-500/20 rounded-full text-[10px] text-violet-400 font-black uppercase tracking-widest mb-3">
              回答以获取 MANA
            </div>
            <div className="text-white font-bold text-base sm:text-lg leading-relaxed text-left sm:text-center">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentCard?.front || ''}</ReactMarkdown>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {choices.map((choice, idx) => (
              <button
                key={idx}
                onClick={() => handleChoice(choice)}
                className="flex items-start gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-violet-500/50 text-left transition-all active:scale-[0.98] min-h-[3.5rem]"
              >
                <span className="w-6 h-6 flex-shrink-0 rounded bg-black/40 flex items-center justify-center text-[10px] font-black text-white/40 mt-0.5">
                  {CHOICE_LETTERS[idx]}
                </span>
                <span className="text-sm font-medium leading-snug break-words">{choice}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Base({ side, hp, maxHp, emoji, name }: { side: 'left' | 'right'; hp: number; maxHp: number; emoji: string; name: string }) {
  const pct = (hp / maxHp) * 100;
  return (
    <div className={`absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-2 ${side === 'left' ? 'left-4' : 'right-4'}`}>
      <div className="text-6xl animate-pulse">{emoji}</div>
      <div className="w-20 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <div className={`h-full transition-all duration-300 ${side === 'left' ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="text-[9px] font-black uppercase tracking-tighter text-white/30">{name}</div>
    </div>
  );
}

function Unit({ entity }: { entity: Entity }) {
  const isAlly = entity.type === 'ally';
  const pct = (entity.hp / entity.maxHp) * 100;

  return (
    <div 
      className="absolute top-1/2 -translate-y-1/2 transition-all duration-100 flex flex-col items-center pointer-events-none"
      style={{ left: `${entity.x}%`, zIndex: Math.floor(entity.x) }}
    >
      <div className="relative">
        <div className={`text-4xl ${isAlly ? '' : 'scale-x-[-1]'}`}>
          {entity.emoji}
        </div>
        {/* HP Bar */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-8 h-1 bg-black/40 rounded-full overflow-hidden border border-white/10">
          <div className={`h-full ${isAlly ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {/* Visual Effect for attack could be added here */}
    </div>
  );
}
