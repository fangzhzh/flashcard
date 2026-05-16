"use client";
import React from 'react';
import type { ResultData, SaveData } from './CardWarGame';
import type { Deck } from '@/types';
import { Star, RotateCcw, Map, ChevronRight, Target, Flame, Trophy } from 'lucide-react';

interface Props {
  result: ResultData;
  decks: Deck[];
  saveData: SaveData;
  onNextWave: () => void | Promise<void>;
  onRetry: () => void | Promise<void>;
  onBackToMap: () => void;
}

function StatRow({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
      <div className="flex items-center gap-2 text-white/50 text-sm">
        {icon}<span>{label}</span>
      </div>
      <span className={`font-bold text-sm tabular-nums ${highlight ?? 'text-white'}`}>{value}</span>
    </div>
  );
}

export default function StageResult({ result, decks, onNextWave, onRetry, onBackToMap }: Props) {
  const { victory, stageId, worldId, correctCount, totalAnswered, maxCombo, stars, reward } = result;
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const worldName = worldId === 'all' ? '全部卡片' : (decks.find(d => d.id === worldId)?.name ?? 'Unknown');

  return (
    <div className={`h-full w-full flex flex-col items-center justify-center px-5 animate-stage-entrance overflow-y-auto py-8
      ${victory ? 'bg-gradient-to-b from-indigo-950 via-violet-900/80 to-slate-950' : 'bg-gradient-to-b from-slate-950 via-red-950/60 to-slate-950'}`}>

      {/* Big result icon */}
      <div className="text-8xl mb-3 select-none"
        style={{ filter: victory ? 'drop-shadow(0 0 24px rgba(167,139,250,0.7))' : 'drop-shadow(0 0 24px rgba(239,68,68,0.6))' }}>
        {victory ? '🏆' : '💀'}
      </div>

      {/* Title */}
      <h1 className={`text-3xl font-extrabold mb-1 tracking-tight ${victory ? 'text-violet-300' : 'text-red-400'}`}>
        {victory ? '关卡通关！' : '战败了...'}
      </h1>
      <p className="text-white/40 text-sm mb-5 font-medium">
        {worldName} · Wave {stageId}
      </p>

      {/* Stats card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-5 w-full max-w-sm mb-5 backdrop-blur-md shadow-2xl">
        {/* Stars row */}
        {victory && (
          <div className="flex flex-col items-center gap-2 pb-4 mb-3 border-b border-white/10">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">评星</span>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <Star key={n}
                  className={`h-9 w-9 transition-all duration-500 ${n <= stars
                    ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] scale-110'
                    : 'text-white/10'}`}
                  style={{ transitionDelay: `${n * 120}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        <StatRow
          icon={<Target className="h-4 w-4" />}
          label="正确率"
          value={`${accuracy}%`}
          highlight={accuracy >= 80 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'}
        />
        <StatRow icon={<span className="text-base leading-none">📝</span>} label="答对题数" value={`${correctCount} / ${totalAnswered}`} />
        <StatRow
          icon={<Flame className="h-4 w-4" />}
          label="最大连击"
          value={maxCombo >= 3 ? `🔥 ×${maxCombo}` : String(maxCombo)}
          highlight={maxCombo >= 3 ? 'text-orange-400' : undefined}
        />

        {/* Reward */}
        {victory && reward && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <div className="text-[10px] font-black text-white/30 uppercase tracking-widest mb-2 text-center">🎁 获得奖励</div>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-3xl animate-bounce">{reward.emoji}</span>
              <div>
                <div className="text-white font-bold text-sm">{reward.name}</div>
                <div className="text-white/50 text-xs">{reward.desc}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        {victory && (
          <button onClick={onNextWave}
            className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-base transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/50 active:scale-[0.98]">
            进入下一关 <ChevronRight className="h-5 w-5" />
          </button>
        )}
        <button onClick={onRetry}
          className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm transition-all hover:scale-[1.02] border active:scale-[0.98]
            ${victory
              ? 'bg-white/8 hover:bg-white/15 text-white/80 border-white/12'
              : 'bg-red-700 hover:bg-red-600 text-white border-red-600 shadow-lg shadow-red-900/50'}`}>
          <RotateCcw className="h-4 w-4" />
          {victory ? '再次挑战（冲满星）' : '再试一次'}
        </button>
        <button onClick={onBackToMap}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-transparent hover:bg-white/5 text-white/50 font-medium text-sm transition-all border border-transparent hover:border-white/10">
          <Map className="h-4 w-4" /> 返回世界地图
        </button>
      </div>
    </div>
  );
}
