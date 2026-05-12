"use client";
import React, { useEffect, useRef, useState } from 'react';
import type { BattleState } from './CardWarGame';
import { X, ChevronDown, Maximize2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { useI18n } from '@/lib/i18n/client';

const COMBO_THRESHOLD = 3;
const QUESTION_PREVIEW_LEN = 160; // chars before we show expand button

interface Props {
  battle: BattleState;
  onAnswer: (idx: number) => void;
  onUseItem: (idx: number) => void;
  onAnimationDone: () => void;
}

const CHOICE_LETTERS = ['A', 'B', 'C', 'D'];
const ANIM_DURATION = 900;

// ── Markdown renderer tuned for dark glass backgrounds ─────────────────────
function DarkMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-3 mb-1">{children}</h1>,
        h2: ({ children }) => <h2 className="text-base font-bold text-white mt-3 mb-1">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold text-white/90 mt-2 mb-1">{children}</h3>,
        p: ({ children }) => <p className="text-white/90 text-sm leading-relaxed my-1.5">{children}</p>,
        ul: ({ children }) => <ul className="list-disc list-inside my-2 space-y-1 text-white/90 text-sm">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside my-2 space-y-1 text-white/90 text-sm">{children}</ol>,
        li: ({ children }) => <li className="text-white/85 text-sm">{children}</li>,
        strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-white/80">{children}</em>,
        code: ({ inline, children }: any) =>
          inline
            ? <code className="bg-white/10 text-violet-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>
            : <pre className="bg-black/40 border border-white/10 rounded-lg p-3 my-2 overflow-x-auto text-xs font-mono text-violet-200 leading-relaxed"><code>{children}</code></pre>,
        blockquote: ({ children }) => <blockquote className="border-l-4 border-violet-500/60 pl-3 my-2 italic text-white/70 text-sm">{children}</blockquote>,
        table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse border border-white/10">{children}</table></div>,
        th: ({ children }) => <th className="border border-white/10 px-2 py-1 bg-white/10 text-white font-semibold text-left">{children}</th>,
        td: ({ children }) => <td className="border border-white/10 px-2 py-1 text-white/80">{children}</td>,
        hr: () => <hr className="border-white/10 my-3" />,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-400 underline hover:text-violet-300">{children}</a>,
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

// ── Full-content modal (shared for question & answer) ──────────────────────
function ContentModal({
  title,
  content,
  onClose,
  badge,
  badgeColor,
  closeLabel,
}: {
  title: string;
  content: string;
  onClose: () => void;
  badge?: string;
  badgeColor?: string;
  closeLabel: string;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-950/95 border border-white/15 rounded-t-3xl sm:rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <h3 className="text-white font-semibold flex items-center gap-2.5">
            {badge && (
              <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${badgeColor ?? 'bg-violet-700 text-violet-100'}`}>
                {badge}
              </span>
            )}
            {title}
          </h3>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4">
          <DarkMarkdown>{content}</DarkMarkdown>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HP bar ─────────────────────────────────────────────────────────────────
function HPBar({ current, max, color, label }: { current: number; max: number; color: 'green' | 'red'; label: string }) {
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
      <div className="text-[10px] text-white/40 font-bold uppercase tracking-wider text-center mb-1">{label}</div>
      <div className="h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/10 shadow-inner">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-center text-[9px] text-white/50 mt-1 font-mono">
        {current} / {max}
      </div>
    </div>
  );
}

// ── Floating damage number ─────────────────────────────────────────────────
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
      className={`
        absolute text-3xl font-black pointer-events-none animate-damage-float z-10
        ${isBoss ? 'text-yellow-300 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)] right-1/4' : 'text-red-400 drop-shadow-[0_0_8px_rgba(248,113,113,0.8)] left-1/4'}
        top-0
      `}
    >
      -{amount}
    </div>
  );
}

// ── Main BattleScene ────────────────────────────────────────────────────────
export default function BattleScene({ battle, onAnswer, onUseItem, onAnimationDone }: Props) {
  const t = useI18n();
  const { stage, playerHP, maxPlayerHP, bossHP, maxBossHP } = battle;
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Which modal is open: null | { type: 'answer', idx } | { type: 'question' }
  const [modal, setModal] = useState<{ type: 'answer'; idx: number } | { type: 'question' } | null>(null);

  const currentCard = battle.deck[battle.deckIndex];
  const questionText = currentCard?.front ?? '';
  const questionIsLong = questionText.length > QUESTION_PREVIEW_LEN;

  // Animation resolution timer
  useEffect(() => {
    if (animTimerRef.current) clearTimeout(animTimerRef.current);
    if (battle.animState === 'SHOW_WRONG') {
      animTimerRef.current = setTimeout(onAnimationDone, 1600);
    } else if (battle.animState !== 'IDLE') {
      animTimerRef.current = setTimeout(onAnimationDone, ANIM_DURATION + 100);
    }
    return () => { if (animTimerRef.current) clearTimeout(animTimerRef.current); };
  }, [battle.animState, battle.selectedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  const getChoiceStyle = (idx: number): string => {
    const base = 'relative w-full text-left rounded-xl border-2 px-3 py-2.5 text-sm font-medium transition-all duration-200 flex items-start gap-2.5';
    if (idx === battle.eliminatedIndex) return `${base} border-slate-700 bg-slate-900/40 opacity-25 cursor-not-allowed`;
    if (battle.selectedIndex === null)
      return `${base} border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/30 cursor-pointer active:scale-[0.98]`;
    if (idx === battle.correctIndex) return `${base} border-green-500 bg-green-900/50 cursor-default shadow-[0_0_15px_rgba(34,197,94,0.3)]`;
    if (idx === battle.selectedIndex && !battle.isCorrect) return `${base} border-red-500 bg-red-900/50 cursor-default shadow-[0_0_15px_rgba(239,68,68,0.3)]`;
    return `${base} border-white/10 bg-white/5 opacity-40 cursor-default`;
  };

  const playerAnimClass = battle.animState === 'PLAYER_ATTACK' ? 'animate-player-attack' : '';
  const bossAnimClass   = battle.animState === 'BOSS_ATTACK'   ? 'animate-boss-attack'   : '';
  const playerHitClass  = battle.animState === 'BOSS_ATTACK'   ? 'animate-shake animate-flash-red' : '';
  const bossHitClass    = battle.animState === 'PLAYER_ATTACK' ? 'animate-shake animate-flash-red' : '';

  const progress = (battle.deckIndex / battle.deck.length) * 100;

  return (
    <div className={`h-full w-full flex flex-col bg-gradient-to-b ${stage.bgFrom} ${stage.bgVia} ${stage.bgTo} overflow-hidden`}>

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 backdrop-blur-sm border-b border-white/10 flex-shrink-0">
        <div className="text-white font-bold text-xs tracking-tight">{stage.name}</div>
        <div className="flex items-center gap-2 text-[10px] text-white/50 font-bold uppercase">
          <span>{stage.bossEmoji} {stage.boss}</span>
          <span className="opacity-30">|</span>
          <span>{t('game.battle.card', { cur: battle.deckIndex + 1, total: battle.deck.length })}</span>
        </div>
      </div>

      {/* Stage progress */}
      <div className="h-1 bg-black/40 flex-shrink-0">
        <div className="h-full bg-violet-400 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Battle Arena ── */}
      <div className="flex-1 flex items-center justify-around px-4 relative min-h-0">

        {/* Player */}
        <div className="flex flex-col items-center gap-2 w-32">
          <div className={`text-8xl select-none ${playerAnimClass} ${playerHitClass}`} style={{ display: 'inline-block', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}>
            🧙
          </div>
          <HPBar current={playerHP} max={maxPlayerHP} color="green" label={t('game.battle.playerHP')} />
          <div className="flex gap-1.5 mt-1">
            {battle.lightningActive && <span className="text-xl animate-pulse" title={t('game.item.lightning')}>⚡</span>}
            {battle.shieldActive    && <span className="text-xl animate-pulse" title={t('game.item.shield')}>🛡️</span>}
          </div>
        </div>

        {/* Center */}
        <div className="flex flex-col items-center gap-2 relative">
          <div className="text-white/20 font-black text-2xl italic tracking-tighter">{t('game.battle.vs')}</div>
          {battle.combo >= COMBO_THRESHOLD && (
            <div key={battle.combo} className="animate-combo-pop text-yellow-300 font-black text-2xl drop-shadow-[0_0_12px_rgba(250,204,21,0.9)] italic uppercase">
              {t('game.battle.combo', { n: battle.combo })}
            </div>
          )}
          {battle.bossRage && (
            <div className="animate-rage-glow text-red-400 text-sm font-black uppercase tracking-widest italic">
              {t('game.battle.rage')}
            </div>
          )}
          {battle.damageAmount > 0 && (
            <DamageNumber amount={battle.damageAmount} isBoss={battle.damageToBoss} triggerKey={battle.damageKey} />
          )}
          {battle.selectedIndex !== null && (
            <div className={`text-sm font-black uppercase tracking-wide mt-2 px-3 py-1 rounded-lg ${battle.isCorrect ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
              {battle.isCorrect ? t('game.battle.correct') : t('game.battle.wrong')}
            </div>
          )}
        </div>

        {/* Boss */}
        <div className="flex flex-col items-center gap-2 w-32">
          <div className={`text-8xl select-none ${bossAnimClass} ${bossHitClass}`} style={{ display: 'inline-block', filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))' }}>
            {stage.bossEmoji}
          </div>
          <HPBar current={bossHP} max={maxBossHP} color="red" label={t('game.battle.bossHP')} />
          {battle.bossRage && <div className="text-[10px] text-red-500 animate-pulse font-black uppercase mt-1 tracking-widest">⚠️ RAGE</div>}
        </div>
      </div>

      {/* ── Question + Choices panel ── */}
      <div className="flex-shrink-0 bg-black/60 backdrop-blur-xl rounded-t-[2.5rem] border-t border-white/10 px-6 pt-6 pb-6 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">

        {/* Question row */}
        <div className="mb-4 px-1 flex items-start gap-4">
          <div className="flex-1 min-w-0">
            {/* Render markdown for question preview */}
            <div className="text-white font-bold text-base leading-relaxed line-clamp-3 [&_code]:text-violet-300 [&_code]:bg-white/10 [&_code]:px-1 [&_code]:rounded [&_strong]:text-violet-300">
              <DarkMarkdown>{questionIsLong ? questionText.slice(0, QUESTION_PREVIEW_LEN) + '…' : questionText}</DarkMarkdown>
            </div>
          </div>
          {/* Expand question button */}
          {questionIsLong && (
            <button
              onClick={() => setModal({ type: 'question' })}
              className="flex-shrink-0 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white/50 hover:text-white transition-all shadow-lg"
              title={t('game.battle.showFull')}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Choices */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
          {battle.choices.map((choice, idx) => {
            const isEliminated = idx === battle.eliminatedIndex;
            return (
              <div key={idx} className="relative">
                <button
                  className={getChoiceStyle(idx)}
                  onClick={() => !isEliminated && battle.selectedIndex === null && onAnswer(idx)}
                  disabled={isEliminated || battle.selectedIndex !== null}
                >
                  {/* Letter */}
                  <span className={`
                    flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black
                    ${idx === battle.correctIndex && battle.selectedIndex !== null ? 'bg-green-500 text-white shadow-lg' :
                      idx === battle.selectedIndex && !battle.isCorrect ? 'bg-red-500 text-white shadow-lg' :
                      'bg-white/10 text-white/40'}
                  `}>
                    {CHOICE_LETTERS[idx]}
                  </span>
                  {/* Choice text */}
                  <span className="flex-1 leading-snug text-xs font-medium">{choice}</span>
                  {/* Expand answer */}
                  <button
                    className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/20 hover:text-white/50 transition-colors"
                    onClick={e => { e.stopPropagation(); setModal({ type: 'answer', idx }); }}
                    title={t('game.battle.showFull')}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </button>
              </div>
            );
          })}
        </div>

        {/* Item bag */}
        {battle.inventory.length > 0 && (
          <div className="flex items-center gap-3 justify-center pt-2 border-t border-white/5">
            <span className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em]">{t('game.result.reward')}：</span>
            <div className="flex gap-2.5">
              {battle.inventory.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onUseItem(idx)}
                  disabled={battle.animState !== 'IDLE' || battle.selectedIndex !== null}
                  className="group relative text-2xl w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-violet-500/50 transition-all flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed hover:scale-110 active:scale-95 shadow-lg"
                  title={`${item.name}: ${item.desc}`}
                >
                  {item.emoji}
                  <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-xl px-3 py-2 text-xs text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-20 shadow-2xl scale-90 group-hover:scale-100 origin-bottom">
                    <div className="font-black text-violet-300 uppercase tracking-tighter">{item.name}</div>
                    <div className="text-white/60 font-medium text-[10px]">{item.desc}</div>
                    <div className="mt-1.5 text-[9px] text-violet-400 font-bold uppercase tracking-widest bg-violet-500/10 px-2 py-0.5 rounded text-center">
                      {t('game.battle.useItem')}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      {modal?.type === 'question' && (
        <ContentModal
          title={t('game.battle.fullAnswer')}
          content={questionText}
          onClose={() => setModal(null)}
          badge={t('game.battle.fullAnswer')}
          badgeColor="bg-indigo-700 text-indigo-100"
          closeLabel={t('game.battle.close')}
        />
      )}
      {modal?.type === 'answer' && (
        <ContentModal
          title={t('game.battle.fullAnswer')}
          content={battle.choicesFull[modal.idx]}
          onClose={() => setModal(null)}
          badge={CHOICE_LETTERS[modal.idx]}
          badgeColor={
            modal.idx === battle.correctIndex && battle.selectedIndex !== null ? 'bg-green-700 text-green-100' :
            modal.idx === battle.selectedIndex && !battle.isCorrect ? 'bg-red-700 text-red-100' :
            'bg-slate-700 text-slate-100'
          }
          closeLabel={t('game.battle.close')}
        />
      )}
    </div>
  );
}

