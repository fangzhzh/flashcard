"use client";
import React from 'react';
import type { ResultData, SaveData } from './CardWarGame';
import type { Deck } from '@/types';
import { Star, Skull, RotateCcw, Map, ChevronRight } from 'lucide-react';

interface Props {
  result: ResultData;
  decks: Deck[];
  saveData: SaveData;
  onNextWave: () => void;
  onRetry: () => void;
  onBackToMap: () => void;
}

export default function StageResult({ result, decks, onNextWave, onRetry, onBackToMap }: Props) {
  const { victory, stageId, worldId, stars, reward } = result;
  
  const deck = worldId === 'all' ? { name: '全部卡片' } : decks.find(d => d.id === worldId);

  return (
    <div className={`
      h-full w-full flex flex-col items-center justify-center px-4 animate-stage-entrance overflow-y-auto py-8
      ${victory
        ? 'bg-gradient-to-b from-indigo-950 via-violet-900 to-slate-950'
        : 'bg-gradient-to-b from-slate-950 via-red-950 to-slate-950'}
    `}>

      {/* Big icon */}
      <div className="text-8xl mb-4 select-none" style={{ filter: victory ? 'drop-shadow(0 0 20px rgba(167,139,250,0.6))' : 'drop-shadow(0 0 20px rgba(239,68,68,0.5))' }}>
        {victory ? '🏆' : '💀'}
      </div>

      {/* Title */}
      <h1 className={`text-3xl font-extrabold mb-1 ${victory ? 'text-violet-300' : 'text-red-400'}`}>
        {victory ? '关卡通关！' : '战败了...'}
      </h1>
      <p className="text-white/50 text-sm mb-6">
        {deck?.name} · 第 {stageId} 关
      </p>

      {/* Stars card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-sm mb-6 space-y-4 shadow-2xl backdrop-blur-md">
        {victory ? (
          <div className="flex flex-col items-center gap-2">
            <div className="text-sm text-white/50 font-medium uppercase tracking-widest">获得星级</div>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <Star
                  key={n}
                  className={`h-10 w-10 transition-all duration-500 ${n <= stars ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] scale-110' : 'text-slate-700'}`}
                  style={{ transitionDelay: `${n * 150}ms` }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center text-white/60 py-4">
            别灰心，下次答题快一点就能赢！
          </div>
        )}

        {/* Reward */}
        {victory && reward && (
          <div className="pt-4 border-t border-white/10">
            <div className="text-xs text-white/40 mb-2 text-center font-bold uppercase tracking-tighter">🎁 获得奖励</div>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-3xl animate-bounce">{reward.emoji}</span>
              <div>
                <div className="text-white font-semibold text-sm">{reward.name}</div>
                <div className="text-white/50 text-xs">{reward.desc}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {victory && (
          <button
            onClick={onNextWave}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-base transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/50"
          >
            进入下一关
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <button
          onClick={onRetry}
          className={`
            flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-base transition-all hover:scale-[1.02] border
            ${victory 
              ? 'bg-white/10 hover:bg-white/15 text-white border-white/15' 
              : 'bg-red-700 hover:bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/50'}
          `}
        >
          <RotateCcw className="h-5 w-5" />
          {victory ? '再次挑战 (刷星)' : '再试一次'}
        </button>

        <button
          onClick={onBackToMap}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-transparent hover:bg-white/5 text-white/60 font-medium text-sm transition-all border border-transparent hover:border-white/10"
        >
          <Map className="h-4 w-4" />
          返回地图
        </button>
      </div>
    </div>
  );
}
