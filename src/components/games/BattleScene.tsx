"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { BattleState } from './CardWarGame';
import { X, ChevronDown, Maximize2, Zap, Shield, Eye } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const COMBO_THRESHOLD = 3;
const ANIM_DURATION   = 800;
const CHOICE_LETTERS  = ['A', 'B', 'C', 'D'];
const QUESTION_MAX    = 140;

interface Props {
  battle: BattleState;
  onAnswer: (idx: number) => void;
  onUseItem: (idx: number) => void;
  onAnimationDone: () => void;
}

// ── Dark Markdown ──────────────────────────────────────────────────────────────
function DarkMD({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-white mt-2 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-white/90 mt-2 mb-0.5">{children}</h3>,
        p:  ({ children }) => <p  className="text-white/90 text-sm leading-relaxed my-1.5">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1 text-white/85 text-sm pl-2">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1 text-white/85 text-sm pl-2">{children}</ol>,
        li: ({ children }) => <li className="text-white/85 text-sm">{children}</li>,
        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        em:     ({ children }) => <em     className="italic text-white/80">{children}</em>,
        code: ({ inline, children }: any) => inline
          ? <code className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
          : <pre className="bg-black/50 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-emerald-300 leading-relaxed whitespace-pre-wrap"><code>{children}</code></pre>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-violet-400/60 pl-3 my-2 italic text-white/70 text-sm">{children}</blockquote>,
        table:  ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>,
        th: ({ children }) => <th className="border border-white/20 px-2 py-1.5 bg-white/10 text-white font-semibold text-left">{children}</th>,
        td: ({ children }) => <td className="border border-white/10 px-2 py-1.5 text-white/80">{children}</td>,
        hr: () => <hr className="border-white/10 my-3" />,
        a:  ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">{children}</a>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

// ── Full Content Modal ─────────────────────────────────────────────────────────
function ContentModal({ title, content, badge, onClose }: {
  title: string; content: string; badge?: string; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-6"
      onClick={onClose}>
      <div className="bg-slate-950/98 border border-white/15 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl flex flex-col max-h-[82vh] shadow-2xl"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {badge && <span className="w-7 h-7 rounded-lg bg-violet-700 flex items-center justify-center text-sm font-bold text-white">{badge}</span>}
            <span className="text-white font-semibold text-sm">{title}</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white p-1"><X className="h-4 w-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4"><DarkMD>{content}</DarkMD></div>
        <div className="px-5 py-3 border-t border-white/10 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors">关闭</button>
        </div>
      </div>
    </div>
  );
}

// ── HP Bar ────────────────────────────────────────────────────────────────────
function HPBar({ current, max, color, label }: { current: number; max: number; color: 'green' | 'red'; label: string }) {
  const pct = Math.max(0, (current / max) * 100);
  const bar = color === 'red'
    ? 'from-red-600 via-orange-500 to-red-400'
    : pct > 50 ? 'from-emerald-600 via-green-500 to-emerald-400'
    : pct > 25 ? 'from-yellow-600 via-amber-500 to-yellow-400'
    : 'from-red-600 via-red-500 to-red-400';
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] font-bold mb-1 uppercase tracking-wider">
        <span className={color === 'green' ? 'text-emerald-400' : 'text-red-400'}>{label}</span>
        <span className="text-white/60 font-mono">{current}<span className="text-white/30">/{max}</span></span>
      </div>
      <div className="h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10 shadow-inner">
        <div className={`h-full bg-gradient-to-r ${bar} rounded-full transition-all duration-600 ease-out`}
          style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Floating damage ────────────────────────────────────────────────────────────
function Damage({ amount, isBoss, id }: { amount: number; isBoss: boolean; id: number }) {
  return (
    <div key={id}
      className={`absolute pointer-events-none font-black text-3xl animate-damage-float z-20
        ${isBoss
          ? 'right-8 text-yellow-300 drop-shadow-[0_0_12px_rgba(250,204,21,0.9)]'
          : 'left-8 text-red-400 drop-shadow-[0_0_12px_rgba(248,113,113,0.9)]'}`}
      style={{ top: '20%' }}
    >
      -{amount}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function BattleScene({ battle, onAnswer, onUseItem, onAnimationDone }: Props) {
  const { stage, playerHP, maxPlayerHP, bossHP, maxBossHP } = battle;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [modal, setModal] = useState<{ type: 'q' } | { type: 'a'; idx: number } | null>(null);
  const [prevDmg, setPrevDmg] = useState<{ amount: number; isBoss: boolean; id: number } | null>(null);

  const currentCard = battle.deck[battle.deckIndex];
  const questionIsLong = (currentCard?.front ?? '').length > QUESTION_MAX;

  // Show damage number when damageKey changes
  useEffect(() => {
    if (battle.damageAmount > 0 && battle.damageKey > 0) {
      setPrevDmg({ amount: battle.damageAmount, isBoss: battle.damageToBoss, id: battle.damageKey });
      const t = setTimeout(() => setPrevDmg(null), 900);
      return () => clearTimeout(t);
    }
  }, [battle.damageKey]);

  // Animation resolution
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (battle.animState === 'SHOW_WRONG') {
      timerRef.current = setTimeout(onAnimationDone, 1600);
    } else if (battle.animState !== 'IDLE') {
      timerRef.current = setTimeout(onAnimationDone, ANIM_DURATION + 80);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [battle.animState, battle.selectedIndex]); // eslint-disable-line

  const choiceClass = (idx: number) => {
    const base = 'w-full text-left rounded-xl border-2 px-4 py-4 font-medium transition-all duration-150 flex items-start gap-3 group min-h-[60px]';
    if (idx === battle.eliminatedIndex) return `${base} border-slate-800 bg-slate-900/30 opacity-25 cursor-not-allowed`;
    if (battle.selectedIndex === null) return `${base} border-white/20 bg-white/5 hover:bg-white/12 hover:border-white/40 cursor-pointer active:scale-[0.98]`;
    if (idx === battle.correctIndex)   return `${base} border-green-500 bg-green-900/40 cursor-default`;
    if (idx === battle.selectedIndex && !battle.isCorrect) return `${base} border-red-500 bg-red-900/40 cursor-default`;
    return `${base} border-white/10 bg-white/5 opacity-40 cursor-default`;
  };

  const playerAnim = battle.animState === 'PLAYER_ATTACK' ? 'animate-player-attack' : battle.animState === 'BOSS_ATTACK' ? 'animate-shake animate-flash-red' : '';
  const bossAnim   = battle.animState === 'BOSS_ATTACK'   ? 'animate-boss-attack'   : battle.animState === 'PLAYER_ATTACK' ? 'animate-shake animate-flash-red' : '';

  const progress = (battle.deckIndex / battle.deck.length) * 100;
  const hpPctBoss = bossHP / maxBossHP;
  const questionIsLong = (currentCard?.front?.length ?? 0) > QUESTION_MAX;

  return (
    <div className={`h-full w-full flex flex-col bg-gradient-to-b ${stage.bgFrom} ${stage.bgVia} ${stage.bgTo} overflow-hidden`}>

      {/* ── Progress bar (top) ── */}
      <div className="h-1 bg-black/50 flex-shrink-0">
        <div className="h-full bg-violet-400 transition-all duration-500 shadow-[0_0_8px_rgba(167,139,250,0.6)]"
          style={{ width: `${progress}%` }} />
      </div>

      {/* ── Battle Arena (top ~55%) ── */}
      <div className="flex-1 flex flex-col relative overflow-hidden min-h-0">

        {/* Background glow based on hp */}
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: `radial-gradient(ellipse at 75% 40%, rgba(239,68,68,${0.08 + (1 - hpPctBoss) * 0.15}) 0%, transparent 65%)` }} />

        {/* Top info bar */}
        <div className="flex justify-between items-center px-4 pt-2.5 pb-0 flex-shrink-0 z-10">
          <span className="text-xs font-bold text-white/50 bg-black/30 px-2.5 py-1 rounded-full">{stage.name}</span>
          <span className="text-xs font-bold text-white/50 bg-black/30 px-2.5 py-1 rounded-full">
            {battle.deckIndex + 1} / {battle.deck.length} 题
          </span>
        </div>

        {/* Characters */}
        <div className="flex-1 flex items-center justify-between px-4 sm:px-8 relative">

          {/* ── PLAYER (left) ── */}
          <div className="flex flex-col items-center gap-2 w-28 sm:w-36">
            {/* Active effects */}
            <div className="flex gap-1 h-5">
              {battle.lightningActive && <span className="text-yellow-300 text-sm animate-pulse" title="闪电符文">⚡</span>}
              {battle.shieldActive    && <span className="text-blue-300 text-sm animate-pulse"   title="铁壁盾牌">🛡️</span>}
            </div>
            {/* Sprite */}
            <div className={`text-7xl sm:text-8xl select-none leading-none ${playerAnim}`}
              style={{ display: 'inline-block', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}>
              🧙
            </div>
            <HPBar current={playerHP} max={maxPlayerHP} color="green" label="英雄" />
          </div>

          {/* ── CENTER (VS + effects) ── */}
          <div className="flex flex-col items-center gap-2 flex-1 relative">
            {/* VS */}
            <div className="text-white/20 font-black text-2xl tracking-widest">VS</div>

            {/* Combo */}
            {battle.combo >= COMBO_THRESHOLD && (
              <div key={battle.combo}
                className="animate-combo-pop text-yellow-300 font-black text-xl drop-shadow-[0_0_10px_rgba(250,204,21,0.9)] leading-none">
                🔥 ×{battle.combo}
              </div>
            )}

            {/* Rage */}
            {battle.bossRage && (
              <div className="animate-rage-glow text-red-400 text-xs font-black bg-red-950/60 px-2 py-0.5 rounded-full border border-red-800">
                😡 RAGE
              </div>
            )}

            {/* Result flash */}
            {battle.selectedIndex !== null && (
              <div className={`text-sm font-black tracking-wider px-3 py-1 rounded-full border
                ${battle.isCorrect
                  ? 'text-green-300 bg-green-950/60 border-green-700'
                  : 'text-red-300 bg-red-950/60 border-red-700'}`}>
                {battle.isCorrect ? '✅ 答对！' : '❌ 答错！'}
              </div>
            )}

            {/* Damage number */}
            {prevDmg && <Damage amount={prevDmg.amount} isBoss={prevDmg.isBoss} id={prevDmg.id} />}
          </div>

          {/* ── BOSS (right) ── */}
          <div className="flex flex-col items-center gap-2 w-28 sm:w-36">
            {/* Rage badge */}
            <div className="h-5 flex items-center">
              {battle.bossRage
                ? <span className="text-[10px] font-black text-red-400 bg-red-950/80 px-1.5 py-0.5 rounded-full border border-red-800 animate-pulse">ENRAGED</span>
                : <span className="text-[10px] text-white/30 font-medium">{stage.boss}</span>}
            </div>
            {/* Boss sprite — BIG */}
            <div className={`text-7xl sm:text-8xl select-none leading-none ${bossAnim}`}
              style={{ display: 'inline-block', filter: `drop-shadow(0 4px 20px rgba(0,0,0,0.6)) ${battle.bossRage ? 'drop-shadow(0 0 16px rgba(239,68,68,0.7))' : ''}` }}>
              {stage.bossEmoji}
            </div>
            <HPBar current={bossHP} max={maxBossHP} color="red" label="Boss" />
          </div>
        </div>
      </div>

      {/* ── Question + Choices panel (bottom ~45%) ── */}
      <div className="flex-shrink-0 bg-black/65 backdrop-blur-xl rounded-t-3xl border-t border-white/10 px-4 pt-4 pb-3 space-y-3"
        style={{ maxHeight: '52%', overflowY: 'auto' }}>

        {/* Question */}
        <div className="flex items-start gap-2">
          <button
            className="flex-1 min-w-0 text-left"
            onClick={() => setModal({ type: 'q' })}
            title="查看完整题目"
          >
            {/* Deck category badge */}
            {currentCard?.deckName && (
              <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-violet-800/60 text-violet-200 px-1.5 py-0.5 rounded mb-1.5 border border-violet-700/40">
                {currentCard.deckName}
              </span>
            )}
            <p className="text-white font-semibold text-sm leading-snug line-clamp-3">
              {questionIsLong
                ? (currentCard?.front ?? '').slice(0, QUESTION_MAX) + '…'
                : (currentCard?.front ?? '')}
            </p>
          </button>
          <button onClick={() => setModal({ type: 'q' })}
            className="flex-shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-colors" title="查看完整题目">
            <Eye className="h-5 w-5" />
          </button>
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 gap-2">
          {battle.choices.map((choice, idx) => (
            <div key={idx} className="relative">
              <button
                className={choiceClass(idx)}
                onClick={() => idx !== battle.eliminatedIndex && battle.selectedIndex === null && onAnswer(idx)}
                disabled={idx === battle.eliminatedIndex || battle.selectedIndex !== null}
              >
                {/* Letter badge */}
                <span className={`flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-xs font-black transition-colors mt-0.5
                  ${idx === battle.correctIndex && battle.selectedIndex !== null ? 'bg-green-500 text-white' :
                    idx === battle.selectedIndex && !battle.isCorrect ? 'bg-red-500 text-white' :
                    'bg-white/12 text-white/60'}`}>
                  {CHOICE_LETTERS[idx]}
                </span>
                <span className="flex-1 text-sm leading-snug text-white/90 line-clamp-3">{choice}</span>
                {/* Expand button — Eye icon, bigger touch target */}
                <button
                  className="flex-shrink-0 p-2 rounded-xl hover:bg-white/15 text-white/40 hover:text-white/90 transition-colors"
                  onClick={e => { e.stopPropagation(); setModal({ type: 'a', idx }); }}
                  title="查看完整答案">
                  <Eye className="h-5 w-5" />
                </button>
              </button>
            </div>
          ))}
        </div>

        {/* Item bag */}
        {battle.inventory.length > 0 && (
          <div className="flex items-center gap-2 justify-center pt-0.5">
            <span className="text-[10px] text-white/30 font-bold uppercase tracking-wider">道具</span>
            {battle.inventory.map((item, idx) => (
              <button key={idx}
                onClick={() => onUseItem(idx)}
                disabled={battle.animState !== 'IDLE' || battle.selectedIndex !== null}
                className="group relative text-xl w-10 h-10 rounded-xl bg-white/8 hover:bg-white/15 border border-white/12 hover:border-white/30 transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed active:scale-90"
                title={`${item.name}: ${item.desc}`}>
                {item.emoji}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-white/15 rounded-xl px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30 whitespace-nowrap shadow-2xl">
                  <div className="text-white font-semibold text-xs">{item.name}</div>
                  <div className="text-white/55 text-[10px]">{item.desc}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === 'q' && (
        <ContentModal title="完整题目" content={currentCard?.front ?? ''} badge="Q" onClose={() => setModal(null)} />
      )}
      {modal?.type === 'a' && (
        <ContentModal
          title="完整答案"
          content={battle.choicesFull[modal.idx]}
          badge={CHOICE_LETTERS[modal.idx]}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
