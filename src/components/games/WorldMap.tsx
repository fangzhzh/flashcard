"use client";
import React, { useState, useMemo, useEffect } from 'react';
import type { SaveData, WorldSave } from './CardWarGame';
import { generateWaveStage, parseOverviewToCards, generateOverviewStage } from './CardWarGame';
import type { Deck, Flashcard, Overview } from '@/types';
import { Swords, Lock, Star, Trophy, BookOpen, Brain, Github, RefreshCw } from 'lucide-react';
import { getGitHubReviewCacheAge } from '@/lib/githubReview';

interface Props {
  flashcards: Flashcard[];
  decks: Deck[];
  overviews: Overview[];
  saveData: SaveData;
  onStartWave: (worldId: string, wave: number) => void;
  initialTab?: 'map' | 'overview';
}

export default function WorldMap({ flashcards, decks, overviews, saveData, onStartWave, initialTab = 'map' }: Props) {
  const [tab, setTab] = useState<'map' | 'overview'>(initialTab);
  const [selectedWorldId, setSelectedWorldId] = useState<string>('all');
  const [cacheAge, setCacheAge] = useState<number | null>(null);

  useEffect(() => {
    setCacheAge(getGitHubReviewCacheAge());
  }, []);

  // ── Flashcard worlds ─────────────────────────────────────────────────────────
  const availableWorlds = useMemo(() => {
    const list = [{ id: 'all', name: '全部卡片', icon: '🌍', count: flashcards.length }];
    decks.forEach(d => {
      const count = flashcards.filter(f => f.deckId === d.id).length;
      if (count >= 4) list.push({ id: d.id, name: d.name, icon: '📂', count });
    });
    return list;
  }, [flashcards, decks]);

  const worldSave = saveData.worlds[selectedWorldId] ?? { currentWave: 1, bestWave: 0, stars: {} };
  const currentCycle = Math.floor((worldSave.currentWave - 1) / 5);
  const cycleStartWave = currentCycle * 5 + 1;

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

  // ── Overview worlds ──────────────────────────────────────────────────────────
  const overviewWorlds = useMemo(() =>
    overviews
      .filter(ov => (ov.description ?? '').trim().length > 30)
      .map(ov => {
        const cards = parseOverviewToCards(ov);
        const stage = generateOverviewStage(ov, cards.length);
        const worldId = `ov_${ov.id}`;
        const ws: WorldSave = saveData.worlds[worldId] ?? { currentWave: 1, bestWave: 0, stars: {} };
        return { ov, stage, cards, worldId, stars: ws.stars[1] ?? 0, beaten: (ws.stars[1] ?? 0) > 0 };
      }),
  [overviews, saveData.worlds]);

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden bg-slate-950 flex flex-col items-center">
      {/* ── Header ── */}
      <div className="w-full bg-gradient-to-b from-indigo-900/40 to-transparent pt-8 pb-4 px-4 flex flex-col items-center flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 mb-2 animate-stage-entrance">
          <Swords className="h-5 w-5 sm:h-7 sm:w-7 text-violet-400 flex-shrink-0" />
          <h1 className="text-lg sm:text-2xl font-black text-white tracking-tighter uppercase italic">
            Card War Challenge
          </h1>
          <Swords className="h-5 w-5 sm:h-7 sm:w-7 text-violet-400 scale-x-[-1] flex-shrink-0" />
        </div>
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

      {/* ── Tab Switcher ── */}
      <div className="flex gap-1.5 sm:gap-2 mb-6 bg-black/30 p-1 rounded-xl border border-white/10 mx-4 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setTab('map')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${tab === 'map' ? 'bg-violet-600 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
        >
          <Swords className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 关卡地图
        </button>
        <button
          onClick={() => setTab('overview')}
          className={`flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${tab === 'overview' ? 'bg-pink-700 text-white shadow-lg' : 'text-white/40 hover:text-white/70'}`}
        >
          <Brain className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> 概览 Boss 战 {overviewWorlds.length > 0 && <span className="bg-white/20 text-white rounded-full px-1.5 text-[10px]">{overviewWorlds.length}</span>}
        </button>
        <button
          onClick={() => onStartWave('github', 1)}
          className="flex items-center gap-1.5 px-3 sm:px-5 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all whitespace-nowrap text-white/40 hover:text-white/70 hover:bg-white/8"
        >
          🐙 GitHub 复习
        </button>
      </div>



      {/* ── TAB: Flashcard Adventure Map ── */}
      {tab === 'map' && (
        <>
          {/* World Selector */}
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

          {/* Adventure Path */}
          <div className="w-full max-w-md px-6 flex flex-col items-center pb-20">
            {stages.map((stage, i) => {
              const locked = stage.id > worldSave.currentWave;
              const stars = worldSave.stars[stage.id] ?? 0;
              const cleared = stars > 0;
              const isCurrent = stage.id === worldSave.currentWave;

              return (
                <div key={stage.id} className="flex flex-col items-center w-full">
                  {i > 0 && (
                    <div className={`w-1.5 h-10 rounded-full transition-colors duration-1000 ${cleared ? 'bg-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-slate-800'}`} />
                  )}
                  <button
                    onClick={() => !locked && onStartWave(selectedWorldId, stage.id)}
                    disabled={locked}
                    className={`
                      relative w-full group rounded-2xl border-2 p-4 transition-all duration-300 overflow-hidden
                      ${locked
                        ? 'border-slate-800 bg-slate-900/40 opacity-40 cursor-not-allowed'
                        : isCurrent
                          ? 'border-violet-500 bg-violet-950/60 shadow-xl shadow-violet-900/30 scale-105 z-10'
                          : 'border-indigo-600/40 bg-indigo-950/30 hover:border-indigo-400 hover:bg-indigo-900/40'}
                    `}
                  >
                    {isCurrent && <div className="absolute inset-0 bg-gradient-to-br from-violet-600/20 to-transparent animate-pulse pointer-events-none" />}
                    <div className="flex items-center gap-4 relative z-10">
                      <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-3xl transition-transform duration-500 group-hover:scale-110 ${locked ? 'bg-slate-800 grayscale' : isCurrent ? 'bg-violet-600 shadow-lg' : 'bg-indigo-900/60'}`}>
                        {locked ? <Lock className="h-6 w-6 text-slate-600" /> : stage.bossEmoji}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-[10px] font-black uppercase tracking-widest ${isCurrent ? 'text-violet-400' : 'text-indigo-400'}`}>
                            WAVE {stage.id}
                          </span>
                          {cleared && <span className="bg-green-500/20 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">Cleared</span>}
                        </div>
                        <div className="text-lg font-bold text-white group-hover:text-violet-200 transition-colors leading-tight">{stage.name}</div>
                        <div className="text-[11px] text-white/40 mt-0.5 font-medium">Boss: <span className="text-white/70">{stage.boss}</span></div>
                        {!locked && (
                          <div className="flex gap-1 mt-2">
                            {[1, 2, 3].map(n => <Star key={n} className={`h-4 w-4 ${n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`} />)}
                          </div>
                        )}
                      </div>
                      {!locked && (
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCurrent ? 'bg-violet-500 text-white animate-bounce' : 'bg-white/10 text-white/40'}`}>
                          <Swords className="h-5 w-5" />
                        </div>
                      )}
                    </div>
                    {!locked && (
                      <div className="mt-4">
                        <div className="flex justify-between text-[10px] text-white/30 font-bold mb-1 uppercase tracking-tighter">
                          <span>关卡进度</span>
                          <span>{stars > 0 ? '已通关' : '进行中'}</span>
                        </div>
                        <div className="h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                          <div className={`h-full rounded-full ${stars > 0 ? 'bg-green-500' : 'bg-violet-500 animate-pulse'}`} style={{ width: stars > 0 ? '100%' : '30%' }} />
                        </div>
                      </div>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── TAB: Overview Boss Fights ── */}
      {tab === 'overview' && (
        <div className="w-full max-w-md px-4 pb-20 flex flex-col gap-4">
          {overviewWorlds.length === 0 && (
            <div className="text-center py-16 text-white/30">
              <Brain className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="font-bold">还没有概览</p>
              <p className="text-sm mt-1">在概览页面创建知识笔记后，这里会出现专属 Boss 战</p>
            </div>
          )}
          {overviewWorlds.map(({ ov, stage, cards, worldId, stars, beaten }) => (
            <div key={worldId} className="relative rounded-2xl border-2 overflow-hidden transition-all duration-300 border-pink-700/40 bg-pink-950/20 hover:border-pink-500/60 hover:bg-pink-950/30">
              {/* Background accent */}
              <div className={`absolute inset-0 bg-gradient-to-br ${stage.bgFrom} ${stage.bgVia} ${stage.bgTo} opacity-20 pointer-events-none`} />

              <div className="relative z-10 p-4 flex items-start gap-4">
                {/* Boss emoji */}
                <div className="w-16 h-16 rounded-xl bg-pink-900/60 flex items-center justify-center text-3xl flex-shrink-0 border border-pink-700/40">
                  {stage.bossEmoji}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-pink-400">概览 BOSS</span>
                    {beaten && <span className="bg-green-500/20 text-green-400 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">已通关</span>}
                  </div>
                  <div className="text-base font-bold text-white leading-tight truncate">{ov.title}</div>
                  <div className="text-[11px] text-white/40 mt-0.5">{cards.length} 道关卡题目</div>

                  {/* Stars */}
                  <div className="flex gap-1 mt-2">
                    {[1, 2, 3].map(n => <Star key={n} className={`h-3.5 w-3.5 ${n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`} />)}
                  </div>
                </div>

                {/* Challenge button */}
                <button
                  onClick={() => onStartWave(worldId, 1)}
                  className="flex-shrink-0 flex flex-col items-center gap-1 bg-pink-700 hover:bg-pink-600 text-white rounded-xl px-3 py-2.5 text-xs font-bold transition-all active:scale-95 shadow-lg"
                >
                  <Swords className="h-4 w-4" />
                  {beaten ? '再战' : '挑战'}
                </button>
              </div>

              {/* HP bar preview */}
              <div className="relative z-10 px-4 pb-3">
                <div className="flex justify-between text-[9px] text-white/25 font-bold mb-1 uppercase">
                  <span>Boss HP</span>
                  <span>{stage.bossHP}</span>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pink-600 to-rose-400 rounded-full w-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-auto py-6 text-center px-6">
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
