"use client";
import React, { useState, useMemo } from 'react';
import type { SaveData, WorldSave } from './CardWarGame';
import { generateWaveStage } from './CardWarGame';
import type { Deck, Flashcard } from '@/types';
import { Swords, Lock, Star, ChevronLeft, ChevronRight, Trophy, BookOpen } from 'lucide-react';

interface Props {
  flashcards: Flashcard[];
  decks: Deck[];
  saveData: SaveData;
  onStartWave: (worldId: string, wave: number) => void;
}

export default function WorldMap({ flashcards, decks, saveData, onStartWave }: Props) {
  const [selectedWorldId, setSelectedWorldId] = useState<string>('all');

  // Filter worlds to only those with at least 4 cards
  const availableWorlds = useMemo(() => {
    const list = [{ id: 'all', name: '全部卡片', icon: '🌍', count: flashcards.length }];
    decks.forEach(d => {
      const count = flashcards.filter(f => f.deckId === d.id).length;
      if (count >= 4) {
        list.push({ id: d.id, name: d.name, icon: '📂', count });
      }
    });
    return list;
  }, [flashcards, decks]);

  const worldSave = saveData.worlds[selectedWorldId] ?? { currentWave: 1, bestWave: 0, stars: {} };
  const currentCycle = Math.floor((worldSave.currentWave - 1) / 5);
  const cycleStartWave = currentCycle * 5 + 1;

  // Generate 5 stages for the current cycle
  const stages = useMemo(() => {
    const worldName = availableWorlds.find(w => w.id === selectedWorldId)?.name ?? null;
    const worldCards = selectedWorldId === 'all' 
      ? flashcards 
      : flashcards.filter(f => f.deckId === selectedWorldId);
      
    return [0, 1, 2, 3, 4].map(i => {
      const wave = cycleStartWave + i;
      return generateWaveStage(wave, selectedWorldId, worldName, worldCards.length);
    });
  }, [selectedWorldId, cycleStartWave, flashcards, availableWorlds]);

  return (
    <div className="h-full w-full overflow-y-auto bg-slate-950 flex flex-col items-center">
      {/* ── Header ── */}
      <div className="w-full bg-gradient-to-b from-indigo-900/40 to-transparent pt-8 pb-4 px-4 flex flex-col items-center flex-shrink-0">
        <div className="flex items-center gap-3 mb-2 animate-stage-entrance">
          <Swords className="h-7 w-7 text-violet-400" />
          <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
            Card War Challenge
          </h1>
          <Swords className="h-7 w-7 text-violet-400 scale-x-[-1]" />
        </div>
        
        {/* Stats strip */}
        <div className="flex items-center gap-4 text-[10px] text-white/40 font-bold uppercase tracking-widest bg-black/40 px-4 py-1.5 rounded-full border border-white/5">
          <span className="flex items-center gap-1.5 text-violet-300">
            <Trophy className="h-3 w-3" /> 总胜场: {saveData.totalWins}
          </span>
          <span className="w-px h-2 bg-white/10" />
          <span className="flex items-center gap-1.5 text-amber-300">
            <Star className="h-3 w-3 fill-amber-300" /> 背包: {saveData.inventory.length}/4
          </span>
        </div>
      </div>

      {/* ── World Selector (Horizontal) ── */}
      <div className="w-full px-4 mb-8 overflow-x-auto no-scrollbar flex justify-center">
        <div className="flex gap-2 min-w-max pb-2">
          {availableWorlds.map(w => (
            <button
              key={w.id}
              onClick={() => setSelectedWorldId(w.id)}
              className={`
                px-4 py-2.5 rounded-xl border-2 transition-all flex items-center gap-2
                ${selectedWorldId === w.id 
                  ? 'bg-violet-600 border-violet-400 text-white shadow-lg shadow-violet-900/40 scale-105' 
                  : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10 hover:border-white/20'}
              `}
            >
              <span className="text-xl">{w.icon}</span>
              <div className="text-left">
                <div className="text-xs font-bold leading-none">{w.name}</div>
                <div className="text-[9px] opacity-60 mt-0.5">{w.count} 张卡片</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Adventure Path ── */}
      <div className="w-full max-w-md px-6 flex flex-col items-center pb-20">
        {stages.map((stage, i) => {
          const locked = stage.id > worldSave.currentWave;
          const stars = worldSave.stars[stage.id] ?? 0;
          const cleared = stars > 0;
          const isCurrent = stage.id === worldSave.currentWave;

          return (
            <div key={stage.id} className="flex flex-col items-center w-full">
              {/* Connector */}
              {i > 0 && (
                <div className={`w-1.5 h-10 rounded-full transition-colors duration-1000 ${cleared ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-slate-800'}`} />
              )}

              {/* Node Card */}
              <button
                onClick={() => !locked && onStartWave(selectedWorldId, stage.id)}
                disabled={locked}
                className={`
                  relative w-full group rounded-2xl border-2 p-4 transition-all duration-300 overflow-hidden
                  ${locked 
                    ? 'border-slate-800 bg-slate-900/40 opacity-40 cursor-not-allowed' 
                    : isCurrent
                      ? 'border-violet-500 bg-violet-950/60 shadow-xl shadow-violet-900/30 scale-105 z-10'
                      : 'border-indigo-600/40 bg-indigo-950/30 hover:border-indigo-400 hover:bg-indigo-900/40'
                  }
                `}
              >
                {/* Background Glow for current */}
                {isCurrent && (
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent animate-pulse pointer-events-none" />
                )}

                <div className="flex items-center gap-4 relative z-10">
                  {/* Icon Node */}
                  <div className={`
                    w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110
                    ${locked ? 'bg-slate-800 grayscale' : isCurrent ? 'bg-violet-600 shadow-lg' : 'bg-indigo-900/60'}
                  `}>
                    {locked ? <Lock className="h-6 w-6 text-slate-600" /> : stage.bossEmoji}
                  </div>

                  {/* Stage Details */}
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-violet-400' : 'text-indigo-400'}`}>
                        WAVE {stage.id}
                      </span>
                      {cleared && (
                        <span className="bg-green-500/20 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Cleared</span>
                      )}
                    </div>
                    <div className="text-lg font-bold text-white group-hover:text-violet-200 transition-colors leading-tight">
                      {stage.name}
                    </div>
                    <div className="text-[11px] text-white/40 mt-0.5 font-medium">
                      Boss: <span className="text-white/70">{stage.boss}</span>
                    </div>

                    {/* Stars Display */}
                    {!locked && (
                      <div className="flex gap-1 mt-2">
                        {[1, 2, 3].map(n => (
                          <Star 
                            key={n} 
                            className={`h-4 w-4 ${n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`} 
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action Icon */}
                  {!locked && (
                    <div className={`
                      w-10 h-10 rounded-full flex items-center justify-center transition-all
                      ${isCurrent ? 'bg-violet-500 text-white animate-bounce' : 'bg-white/10 text-white/40'}
                    `}>
                      <Swords className="h-5 w-5" />
                    </div>
                  )}
                </div>

                {/* Boss HP Bar Preview */}
                {!locked && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-white/30 font-bold mb-1 uppercase tracking-tighter">
                      <span>Boss HP</span>
                      <span>{stage.bossHP}</span>
                    </div>
                    <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-red-600 to-orange-400 rounded-full"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Decoration ── */}
      <div className="mt-auto py-10 text-center px-6">
        <p className="text-white/20 text-[10px] font-bold uppercase tracking-[0.2em] mb-4">
          Defeat bosses to unlock deeper levels of the abyss
        </p>
        <div className="flex gap-8 justify-center opacity-20">
          <BookOpen className="h-5 w-5 text-white" />
          <Trophy className="h-5 w-5 text-white" />
          <Swords className="h-5 w-5 text-white" />
        </div>
      </div>
    </div>
  );
}
