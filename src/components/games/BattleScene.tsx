"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { BattleState } from './CardWarGame';
import { X, ChevronDown } from 'lucide-react';

const COMBO_THRESHOLD = 3;

interface Props {
  battle: BattleState;
  onAnswer: (idx: number) => void;
  onUseItem: (idx: number) => void;
  onAnimationDone: () => void;
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'];
const ANIM_DURATION = 900; // ms — must be >= CSS animation duration

function HPBar({ current, max, color }: { current: number; max: number; color: 'green' | 'red' }) {
  const pct = Math.max(0, (current / max) * 100);
  const barColor =
    color === 'red'
      ? 'from-red-500 to-orange-400'
      : pct > 50
        ? 'from-green-500 to-emerald-400'
        : pct > 25
          ? 'from-yellow-500 to-amber-400'
          : 'from-red-500 to-red-400';

  return (
    <div className="w-full">
      <div className="h-3 bg-black/40 rounded-full overflow-hidden border border-white/10">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-center text-xs text-white/70 mt-0.5 font-mono">
        {current} / {max}
      </div>
    </div>
  );
}

// Floating damage number component
function DamageNumber({ amount, isBoss, triggerKey }: { amount: number; isBoss: boolean; triggerKey: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    const t = setTimeout(() => setVisible(true), 50);
    return () => clearTimeout(t);
  }, [triggerKey]);

  if (!visible || amount === 0) return null;

  return (
    <div
      key={triggerKey}
      className={`
        absolute text-2xl font-black pointer-events-none animate-damage-float z-10
        ${isBoss ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)]'}
        ${isBoss ? 'right-1/4' : 'left-1/4'}
        top-0
      `}
    >
      -{amount}
    </div>
  );
}

export default function BattleScene({ battle, onAnswer, onUseItem, onAnimationDone }: Props) {
  const { stage, playerHP, maxPlayerHP, bossHP, maxBossHP } = battle;
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [fullAnswerIndex, setFullAnswerIndex] = useState<number | null>(null);

  // Trigger animation resolution after animation ends
  useEffect(() => {
    if (battle.animState === 'IDLE' || battle.animState === 'SHOW_WRONG') {
      // SHOW_WRONG: wait a moment so user sees correct answer highlighted, then resolve
      if (battle.animState === 'SHOW_WRONG') {
        animTimerRef.current = setTimeout(() => {
          onAnimationDone();
        }, 1400);
      }
    } else {
      // PLAYER_ATTACK or BOSS_ATTACK — wait for animation duration
      animTimerRef.current = setTimeout(() => {
        onAnimationDone();
      }, ANIM_DURATION + 100);
    }
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
  }, [battle.animState, battle.selectedIndex]);

  const getChoiceStyle = (idx: number): string => {
    const base = 'relative w-full text-left rounded-xl border-2 px-4 py-3 text-sm font-medium transition-all duration-200 flex items-start gap-3';
    const eliminated = idx === battle.eliminatedIndex;
    if (eliminated) return `${base} border-slate-700 bg-slate-900/40 opacity-30 cursor-not-allowed`;

    if (battle.selectedIndex === null) {
      return `${base} border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 cursor-pointer active:scale-[0.98]`;
    }
    // answered
    if (idx === battle.correctIndex) return `${base} border-green-500 bg-green-900/50 cursor-default`;
    if (idx === battle.selectedIndex && !battle.isCorrect) return `${base} border-red-500 bg-red-900/50 cursor-default`;
    return `${base} border-white/10 bg-white/5 opacity-50 cursor-default`;
  };

  const playerAnimClass = battle.animState === 'PLAYER_ATTACK' ? 'animate-player-attack' : '';
  const bossAnimClass = battle.animState === 'BOSS_ATTACK' ? 'animate-boss-attack' : '';
  const playerHitClass = battle.animState === 'BOSS_ATTACK' ? 'animate-shake animate-flash-red' : '';
  const bossHitClass = battle.animState === 'PLAYER_ATTACK' ? 'animate-shake animate-flash-red' : '';

  const progress = ((battle.deckIndex) / battle.deck.length) * 100;

  return (
    <div className={`h-full w-full flex flex-col bg-gradient-to-b ${stage.bgFrom} ${stage.bgVia} ${stage.bgTo} overflow-hidden`}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="text-white font-bold text-sm">{stage.name}</div>
        <div className="flex items-center gap-2 text-xs text-white/60">
          <span>{stage.bossEmoji} {stage.boss}</span>
          <span>·</span>
          <span>第 {battle.deckIndex + 1} / {battle.deck.length} 题</span>
        </div>
      </div>

      {/* Stage progress bar */}
      <div className="h-1 bg-black/40 flex-shrink-0">
        <div className="h-full bg-violet-400 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Battle Arena ── */}
      <div className="flex-1 flex items-center justify-around px-4 relative min-h-0">

        {/* Player side */}
        <div className="flex flex-col items-center gap-2 w-32">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">英雄</div>
          <div className={`text-7xl select-none ${playerAnimClass} ${playerHitClass}`} style={{ display: 'inline-block' }}>
            🧙
          </div>
          <HPBar current={playerHP} max={maxPlayerHP} color="green" />
          {/* Active effects */}
          <div className="flex gap-1 text-xs">
            {battle.lightningActive && <span title="闪电符文">⚡</span>}
            {battle.shieldActive && <span title="铁壁盾牌">🛡️</span>}
          </div>
        </div>

        {/* Center — VS / combo / rage / damage */}
        <div className="flex flex-col items-center gap-2 relative">
          <div className="text-white/40 font-black text-xl">VS</div>

          {battle.combo >= COMBO_THRESHOLD && (
            <div key={battle.combo} className="animate-combo-pop text-yellow-300 font-black text-lg drop-shadow-[0_0_8px_rgba(250,204,21,0.9)]">
              🔥 ×{battle.combo}
            </div>
          )}
          {battle.bossRage && (
            <div className="animate-rage-glow text-red-400 text-xs font-bold">😡 狂暴！</div>
          )}

          {/* Floating damage */}
          {battle.damageAmount > 0 && (
            <DamageNumber
              amount={battle.damageAmount}
              isBoss={battle.damageToBoss}
              triggerKey={battle.damageKey}
            />
          )}

          {/* Result feedback */}
          {battle.selectedIndex !== null && (
            <div className={`text-sm font-bold ${battle.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
              {battle.isCorrect ? '答对了！✅' : '答错了！❌'}
            </div>
          )}
        </div>

        {/* Boss side */}
        <div className="flex flex-col items-center gap-2 w-32">
          <div className="text-xs font-semibold text-red-400 uppercase tracking-wider">Boss</div>
          <div className={`text-7xl select-none ${bossAnimClass} ${bossHitClass}`} style={{ display: 'inline-block' }}>
            {stage.bossEmoji}
          </div>
          <div className="text-xs text-white/70 font-medium">{stage.boss}</div>
          <HPBar current={bossHP} max={maxBossHP} color="red" />
          {battle.bossRage && <div className="text-xs text-red-400 animate-pulse font-bold">⚠️ RAGE</div>}
        </div>
      </div>

      {/* ── Question + Choices ── */}
      <div className="flex-shrink-0 bg-black/50 backdrop-blur-md rounded-t-3xl border-t border-white/10 px-4 pt-5 pb-4">

        {/* Question */}
        <div className="mb-4 px-1">
          <p className="text-white font-semibold text-base leading-snug line-clamp-3">
            {battle.deck[battle.deckIndex]?.front}
          </p>
        </div>

        {/* Choices grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
          {battle.choices.map((choice, idx) => {
            const isEliminated = idx === battle.eliminatedIndex;
            return (
              <div key={idx} className="relative">
                <button
                  className={getChoiceStyle(idx)}
                  onClick={() => !isEliminated && battle.selectedIndex === null && onAnswer(idx)}
                  disabled={isEliminated || battle.selectedIndex !== null}
                >
                  {/* Letter badge */}
                  <span className={`
                    flex-shrink-0 w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold
                    ${idx === battle.correctIndex && battle.selectedIndex !== null ? 'bg-green-500 text-white' :
                      idx === battle.selectedIndex && !battle.isCorrect ? 'bg-red-500 text-white' :
                      'bg-white/10 text-white/60'}
                  `}>
                    {CHOICE_LETTERS[idx]}
                  </span>
                  <span className="flex-1 leading-snug">{choice}</span>

                  {/* Expand button for long answers */}
                  {choice.endsWith('…') && (
                    <button
                      className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
                      onClick={e => { e.stopPropagation(); setFullAnswerIndex(idx); }}
                      title="查看完整答案"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  )}
                </button>
              </div>
            );
          })}
        </div>

        {/* Item bag */}
        {battle.inventory.length > 0 && (
          <div className="flex items-center gap-2 justify-center">
            <span className="text-xs text-white/40">道具：</span>
            {battle.inventory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => onUseItem(idx)}
                disabled={battle.animState !== 'IDLE' || battle.selectedIndex !== null}
                className="group relative text-xl w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 hover:border-white/30 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed"
                title={`${item.name}: ${item.desc}`}
              >
                {item.emoji}
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 shadow-xl">
                  <div className="font-semibold">{item.name}</div>
                  <div className="text-white/60">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Full Answer Modal ── */}
      {fullAnswerIndex !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-white/20 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <span className="text-lg">{CHOICE_LETTERS[fullAnswerIndex]}</span>
                完整答案
              </h3>
              <button
                onClick={() => setFullAnswerIndex(null)}
                className="text-white/50 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-4 max-h-64 overflow-y-auto">
              <p className="text-white/90 text-sm leading-relaxed whitespace-pre-wrap">
                {battle.choicesFull[fullAnswerIndex]}
              </p>
            </div>
            <div className="px-5 py-3 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setFullAnswerIndex(null)}
                className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


