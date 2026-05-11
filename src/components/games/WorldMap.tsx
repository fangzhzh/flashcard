"use client";
import React from 'react';
import type { StageConfig, SaveData } from './CardWarGame';
import { Swords, Lock, Star } from 'lucide-react';

interface Props {
  stages: StageConfig[];
  saveData: SaveData;
  onSelectStage: (id: number) => void;
}

const STAGE_PATH_ICONS = ['🌿', '🌲', '🏔️', '🌋', '🗼'];

export default function WorldMap({ stages, saveData, onSelectStage }: Props) {
  const { unlockedStages, stageStars } = saveData;

  return (
    <div className="h-full w-full overflow-y-auto bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-950 flex flex-col items-center py-8 px-4">
      {/* Header */}
      <div className="text-center mb-10 animate-stage-entrance">
        <div className="flex items-center justify-center gap-3 mb-2">
          <Swords className="h-8 w-8 text-violet-400" />
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            卡牌战争冒险
          </h1>
          <Swords className="h-8 w-8 text-violet-400 scale-x-[-1]" />
        </div>
        <p className="text-indigo-300 text-sm">用你的知识击败 Boss，解锁所有关卡！</p>
        <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
          <span>总胜场: {saveData.totalWins}</span>
          <span>·</span>
          <span>共 {stages.length} 关</span>
          {saveData.inventory.length > 0 && (
            <>
              <span>·</span>
              <span>背包: {saveData.inventory.map(i => i.emoji).join(' ')}</span>
            </>
          )}
        </div>
      </div>

      {/* Stage nodes */}
      <div className="flex flex-col gap-0 w-full max-w-md">
        {stages.map((stage, i) => {
          const locked = stage.id > unlockedStages;
          const stars = stageStars[stage.id] ?? 0;
          const cleared = stars > 0;

          return (
            <div key={stage.id} className="flex flex-col items-center">
              {/* Connector line (except first) */}
              {i > 0 && (
                <div className={`w-1 h-8 rounded-full ${cleared ? 'bg-violet-400' : 'bg-slate-700'}`} />
              )}

              {/* Stage node card */}
              <button
                onClick={() => !locked && onSelectStage(stage.id)}
                disabled={locked}
                className={`
                  relative w-full rounded-2xl border-2 p-4
                  transition-all duration-200 text-left
                  ${locked
                    ? 'border-slate-700 bg-slate-900/60 opacity-50 cursor-not-allowed'
                    : cleared
                      ? 'border-violet-500 bg-violet-950/70 hover:bg-violet-900/70 hover:scale-[1.02] shadow-lg shadow-violet-900/40 cursor-pointer'
                      : 'border-indigo-600 bg-indigo-950/70 hover:bg-indigo-900/70 hover:scale-[1.02] shadow-lg shadow-indigo-900/40 cursor-pointer'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Stage icon */}
                  <div className={`
                    text-4xl w-16 h-16 flex items-center justify-center rounded-xl flex-shrink-0
                    ${locked ? 'bg-slate-800' : cleared ? 'bg-violet-900' : 'bg-indigo-900'}
                  `}>
                    {locked ? '🔒' : stage.bossEmoji}
                  </div>

                  {/* Stage info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                        第 {stage.id} 关
                      </span>
                      {cleared && (
                        <span className="text-xs bg-green-900/50 text-green-400 px-1.5 py-0.5 rounded-full">通关</span>
                      )}
                    </div>
                    <div className="font-bold text-white text-lg leading-tight">{stage.name}</div>
                    <div className="text-sm text-slate-400 mt-0.5">
                      Boss: <span className="text-slate-300">{stage.boss}</span>
                      <span className="ml-2 text-slate-500">· {stage.cardCount} 题</span>
                    </div>

                    {/* Stars */}
                    {!locked && (
                      <div className="flex gap-0.5 mt-2">
                        {[1, 2, 3].map(n => (
                          <Star
                            key={n}
                            className={`h-4 w-4 ${n <= stars ? 'text-yellow-400 fill-yellow-400' : 'text-slate-600'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Action indicator */}
                  {!locked && (
                    <div className={`
                      flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center
                      ${cleared ? 'bg-violet-700 text-white' : 'bg-indigo-700 text-white'}
                    `}>
                      {locked ? <Lock className="h-4 w-4" /> : <Swords className="h-4 w-4" />}
                    </div>
                  )}
                </div>

                {/* Boss HP indicator */}
                {!locked && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Boss HP</span>
                      <span>{stage.bossHP}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-red-500 to-orange-500 rounded-full"
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

      {/* Path decoration at bottom */}
      <div className="mt-10 text-center text-slate-600 text-xs">
        <p>答对题目攻击 Boss · 答错会被反击</p>
        <p>连击 3 次触发暴击 · 连续答错 Boss 进入狂暴模式</p>
      </div>
    </div>
  );
}
