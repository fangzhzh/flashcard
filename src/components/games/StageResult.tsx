"use client";
import React from 'react';
import type { ResultData, StageConfig } from './CardWarGame';
import { Star, Trophy, Skull, RotateCcw, Map } from 'lucide-react';

interface Props {
  result: ResultData;
  stages: StageConfig[];
  onContinue: () => void;
  onRetry: () => void;
}

export default function StageResult({ result, stages, onContinue, onRetry }: Props) {
  const { victory, stageId, correctCount, totalAnswered, maxCombo, stars, reward } = result;
  const stage = stages.find(s => s.id === stageId);
  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
  const hasNextStage = stages.some(s => s.id === stageId + 1);

  return (
    <div className={`
      h-full w-full flex flex-col items-center justify-center px-4 animate-stage-entrance
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
      {stage && (
        <p className="text-white/50 text-sm mb-6">
          {stage.name} · Boss: {stage.boss} {stage.bossEmoji}
        </p>
      )}

      {/* Stats card */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-sm mb-6 space-y-4">
        {/* Stars */}
        {victory && (
          <div className="flex flex-col items-center gap-2 pb-4 border-b border-white/10">
            <div className="text-sm text-white/50 font-medium">获得星级</div>
            <div className="flex gap-1">
              {[1, 2, 3].map(n => (
                <Star
                  key={n}
                  className={`h-8 w-8 transition-all duration-300 ${n <= stars ? 'text-yellow-400 fill-yellow-400 drop-shadow-[0_0_6px_rgba(250,204,21,0.7)]' : 'text-slate-700'}`}
                  style={{ animationDelay: `${n * 200}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Stats rows */}
        <div className="space-y-3">
          <StatRow label="正确率" value={`${accuracy}%`} icon="🎯"
            highlight={accuracy >= 80 ? 'text-green-400' : accuracy >= 60 ? 'text-yellow-400' : 'text-red-400'} />
          <StatRow label="答对题数" value={`${correctCount} / ${totalAnswered}`} icon="📝" />
          <StatRow label="最大连击" value={maxCombo > 0 ? `×${maxCombo}` : '0'} icon="🔥"
            highlight={maxCombo >= 3 ? 'text-orange-400' : undefined} />
        </div>

        {/* Reward */}
        {victory && reward && (
          <div className="pt-4 border-t border-white/10">
            <div className="text-xs text-white/40 mb-2 text-center">🎁 获得道具</div>
            <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/10">
              <span className="text-3xl">{reward.emoji}</span>
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
        {victory && hasNextStage && (
          <button
            onClick={onContinue}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-base transition-all hover:scale-[1.02] shadow-lg shadow-violet-900/50"
          >
            <Map className="h-5 w-5" />
            进入下一关
          </button>
        )}

        {!victory && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-red-700 hover:bg-red-600 text-white font-bold text-base transition-all hover:scale-[1.02] shadow-lg shadow-red-900/50"
          >
            <RotateCcw className="h-5 w-5" />
            再试一次
          </button>
        )}

        {victory && stars < 3 && (
          <button
            onClick={onRetry}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-medium text-sm transition-all border border-white/15 hover:border-white/25"
          >
            <RotateCcw className="h-4 w-4" />
            再刷一次（冲 3 星）
          </button>
        )}

        <button
          onClick={onContinue}
          className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-white/8 hover:bg-white/12 text-white/70 font-medium text-sm transition-all border border-white/10 hover:border-white/20"
        >
          <Map className="h-4 w-4" />
          返回地图
        </button>
      </div>
    </div>
  );
}

function StatRow({ label, value, icon, highlight }: { label: string; value: string; icon: string; highlight?: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-white/60 text-sm">
        <span>{icon}</span>
        <span>{label}</span>
      </div>
      <span className={`font-bold text-sm ${highlight ?? 'text-white'}`}>{value}</span>
    </div>
  );
}
