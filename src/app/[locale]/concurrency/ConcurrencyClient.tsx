"use client";

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { CHALLENGES } from '@/lib/concurrency-challenges';
import { db } from '@/lib/firebase';
import { collection, doc, getDocs, setDoc } from 'firebase/firestore';
import { useI18n } from '@/lib/i18n/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Brain,
  Code,
  Terminal,
  CheckCircle,
  Circle,
  RotateCcw,
  Play,
  Check,
  X,
  Info,
  Lock,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ChallengeLevel {
  id: string;
  title: string;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  concepts: string[];
  requirements: string;
  starterCode: string;
  completed?: boolean;
}

interface Challenge {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  levels: ChallengeLevel[];
}

interface ConcurrencyBug {
  description: string;
  lineSnippet: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  fixSuggestion: string;
}

interface ConcurrencyReviewResult {
  passed: boolean;
  score: number;
  bugs: ConcurrencyBug[];
  summary: string;
  optimizations: string[];
}

const simulatedSteps = [
  'Initializing Gemini concurrency safety scanner...',
  'Constructing abstract syntax tree (AST)...',
  'Analyzing JMM happens-before relationships...',
  'Checking volatile read/write ordering rules...',
  'Auditing lock acquisition graph for deadlocks...',
  'Scanning for busy-spinning or CPU starvation...',
  'Static analysis complete. Formulating report...'
];

export default function ConcurrencyClient() {
  const { user, loading: authLoading } = useAuth();
  const t = useI18n();
  const { toast } = useToast();
  const router = useRouter();

  // States
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loadingChallenges, setLoadingChallenges] = useState(true);
  
  const [selectedChallengeId, setSelectedChallengeId] = useState<string | null>(null);
  const [selectedLevelId, setSelectedLevelId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [draftCodes, setDraftCodes] = useState<Record<string, string>>({});
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [reviewResult, setReviewResult] = useState<ConcurrencyReviewResult | null>(null);
  const [activeResultTab, setActiveResultTab] = useState<'summary' | 'bugs' | 'optimizations' | 'console'>('summary');

  // Refs for editor scrolling synchronization
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch challenges on mount or when user changes
  const fetchChallenges = useCallback(async () => {
    if (!user) return;
    try {
      setLoadingChallenges(true);
      const colRef = collection(db, `users/${user.uid}/concurrencyProgress`);
      const querySnap = await getDocs(colRef);
      const progressMap: Record<string, Record<string, boolean>> = {};
      querySnap.forEach((doc) => {
        progressMap[doc.id] = doc.data() as Record<string, boolean>;
      });

      setChallenges(CHALLENGES.map((challenge) => {
        const challengeProgress = progressMap[challenge.id] || {};
        return {
          ...challenge,
          levels: challenge.levels.map((level) => ({
            ...level,
            completed: !!challengeProgress[level.id],
          })),
        };
      }));
    } catch (err: any) {
      console.error('Error loading challenges:', err);
      toast({
        title: t('error'),
        description: err.message || 'Failed to load challenges data.',
        variant: 'destructive',
      });
    } finally {
      setLoadingChallenges(false);
    }
  }, [user, toast, t]);

  useEffect(() => {
    if (user) {
      fetchChallenges();
    }
  }, [user, fetchChallenges]);

  // Load code drafts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('concurrency_drafts');
      if (saved) {
        setDraftCodes(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load drafts from localStorage:', e);
    }
  }, []);

  // Sync scroll for editor
  const handleScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Handle Tab key inside textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      const newValue = value.substring(0, start) + '    ' + value.substring(end);
      
      // Update editor state & draft
      handleCodeChange(newValue);

      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Change code draft and save to state / localStorage
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (selectedChallengeId && selectedLevelId) {
      const key = `${selectedChallengeId}_${selectedLevelId}`;
      const updated = { ...draftCodes, [key]: newCode };
      setDraftCodes(updated);
      localStorage.setItem('concurrency_drafts', JSON.stringify(updated));
    }
  };

  // Select level
  const selectLevel = (challengeId: string, levelId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    const level = challenge?.levels.find(l => l.id === levelId);
    if (!level) return;

    setSelectedChallengeId(challengeId);
    setSelectedLevelId(levelId);
    setReviewResult(null);
    setTerminalLogs([]);
    setActiveResultTab('summary');

    const key = `${challengeId}_${levelId}`;
    const initialCode = draftCodes[key] ?? level.starterCode;
    setCode(initialCode);
  };

  // Reset starter template
  const handleResetCode = () => {
    if (!selectedChallengeId || !selectedLevelId) return;
    const challenge = challenges.find(c => c.id === selectedChallengeId);
    const level = challenge?.levels.find(l => l.id === selectedLevelId);
    if (level) {
      if (window.confirm(t('concurrency.reset.confirm'))) {
        handleCodeChange(level.starterCode);
      }
    }
  };

  // Verify code via API with simulated logs
  const handleVerify = async () => {
    if (!selectedChallengeId || !selectedLevelId || isSubmitting) return;

    setIsSubmitting(true);
    setReviewResult(null);
    setActiveResultTab('summary');

    const logs = ['> [AUDIT START] Initiating Java Concurrency Audit...'];
    setTerminalLogs([...logs]);

    let step = 0;
    let responseData: ConcurrencyReviewResult | null = null;
    let apiFinished = false;
    let apiError: string | null = null;

    // Trigger API call
    fetch('/api/concurrency/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ challengeId: selectedChallengeId, levelId: selectedLevelId, code })
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then(async (result) => {
        // If passed, save progress to client-side Firestore
        if (result.passed && user) {
          const docRef = doc(db, `users/${user.uid}/concurrencyProgress`, selectedChallengeId);
          await setDoc(docRef, {
            [selectedLevelId]: true,
            [`${selectedLevelId}_completedAt`]: new Date().toISOString(),
          }, { merge: true });
        }
        responseData = result;
        apiFinished = true;
      })
      .catch((err) => {
        apiError = err.message || 'An error occurred during verification.';
        apiFinished = true;
      });

    // Simulated terminal logs interval
    const logInterval = setInterval(() => {
      if (step < simulatedSteps.length) {
        logs.push(`> [ANALYSIS] ${simulatedSteps[step]}`);
        setTerminalLogs([...logs]);
        step++;
      } else {
        if (apiFinished) {
          clearInterval(logInterval);
          finalizeAudit();
        } else {
          if (logs[logs.length - 1] !== '> [WAIT] Waiting for response from Gemini AI...') {
            logs.push('> [WAIT] Waiting for response from Gemini AI...');
            setTerminalLogs([...logs]);
          }
        }
      }
    }, 450);

    const finalizeAudit = () => {
      setIsSubmitting(false);
      if (apiError) {
        logs.push(`> [ERROR] Concurrency audit failed: ${apiError}`);
        setTerminalLogs([...logs]);
        toast({
          title: t('error'),
          description: apiError,
          variant: 'destructive',
        });
        return;
      }

      if (responseData) {
        if (responseData.passed) {
          logs.push('> [PASSED] Concurrency audit SUCCESSFUL. No critical bugs found.');
          toast({
            title: t('success'),
            description: 'Level completed! Progress saved to Firestore.',
          });
          // Refresh challenges state to show green checkbox
          fetchChallenges();
        } else {
          logs.push('> [REJECTED] Concurrency audit REJECTED. Potential race conditions or bugs found.');
          toast({
            title: 'Audit Rejected',
            description: 'Please review detected bugs in the console panel.',
            variant: 'destructive',
          });
        }
        setTerminalLogs([...logs]);
        setReviewResult(responseData);
      }
    };

    // Watcher interval to finalize when API finishes after log simulation
    const checkInterval = setInterval(() => {
      if (step >= simulatedSteps.length && apiFinished) {
        clearInterval(logInterval);
        clearInterval(checkInterval);
        finalizeAudit();
      }
    }, 100);
  };

  // Find currently selected objects
  const selectedLevel = useMemo(() => {
    if (!selectedChallengeId || !selectedLevelId) return null;
    const challenge = challenges.find(c => c.id === selectedChallengeId);
    return challenge?.levels.find(l => l.id === selectedLevelId) || null;
  }, [challenges, selectedChallengeId, selectedLevelId]);

  // Line count for editor line numbers
  const lineNumbers = useMemo(() => {
    const count = code.split('\n').length;
    return Array.from({ length: Math.max(count, 15) }, (_, i) => i + 1);
  }, [code]);

  // Loading spinner during auth check
  if (authLoading || (user && loadingChallenges)) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
        <span className="text-sm text-muted-foreground">Initializing Concurrency Arena...</span>
      </div>
    );
  }

  // Not signed in state
  if (!user) {
    return (
      <div className="flex items-center justify-center p-6 min-h-[calc(100vh-8rem)]">
        <div className="max-w-md w-full bg-card border rounded-2xl p-8 shadow-xl text-center space-y-6">
          <div className="mx-auto h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20 shadow-[0_0_20px_rgba(var(--primary),0.15)] animate-pulse">
            <Lock className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight">{t('concurrency.title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('concurrency.welcome.description')}
            </p>
          </div>
          <Button 
            className="w-full bg-gradient-to-r from-primary to-primary/95 shadow-md hover:shadow-lg transition-all"
            onClick={() => router.push('/auth')}
          >
            Sign In / Register
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden bg-background">
      
      {/* 1. Left Sidebar: Challenge Tree Navigation */}
      <div className="w-full lg:w-80 border-r flex flex-col h-[280px] lg:h-full bg-card/40 flex-shrink-0">
        <div className="p-4 border-b flex items-center justify-between bg-card/60">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-sm tracking-tight">{t('concurrency.sidebar.title')}</h2>
          </div>
          <div className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono font-bold">
            {challenges.reduce((sum, c) => sum + c.levels.filter(l => l.completed).length, 0)} / {challenges.reduce((sum, c) => sum + c.levels.length, 0)} Passed
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {challenges.map((challenge) => (
            <div 
              key={challenge.id} 
              className="border rounded-lg bg-zinc-900/10 dark:bg-zinc-900/20 overflow-hidden transition-all duration-300 hover:border-zinc-800"
            >
              <div className="bg-muted/30 px-3 py-2 border-b flex flex-col">
                <span className="font-bold text-xs text-foreground tracking-tight">{challenge.title}</span>
                <span className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{challenge.subtitle}</span>
              </div>
              <div className="p-1.5 space-y-1 bg-card/10">
                {challenge.levels.map((level) => {
                  const isSelected = selectedChallengeId === challenge.id && selectedLevelId === level.id;
                  return (
                    <button
                      key={level.id}
                      onClick={() => selectLevel(challenge.id, level.id)}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-md text-xs flex items-center justify-between transition-all duration-200 border",
                        isSelected 
                          ? "bg-primary/10 border-primary/25 text-primary font-semibold shadow-sm"
                          : "hover:bg-muted/50 border-transparent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {level.completed ? (
                          <CheckCircle className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground/45 flex-shrink-0" />
                        )}
                        <span className="truncate leading-none">{level.title}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-extrabold uppercase scale-90",
                        level.difficulty === 'EASY' && "bg-emerald-500/10 text-emerald-500 dark:text-emerald-400",
                        level.difficulty === 'MEDIUM' && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                        level.difficulty === 'HARD' && "bg-rose-500/10 text-rose-500 dark:text-rose-400"
                      )}>
                        {t(`concurrency.difficulty.${level.difficulty}` as any, {})}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Middle Panel: Level Handbook / requirements & Code workspace */}
      <div className="flex-1 flex flex-col h-full border-r overflow-hidden min-w-0">
        {selectedLevel ? (
          <div className="flex flex-col h-full min-h-0">
            {/* Title / Header */}
            <div className="p-4 border-b bg-card/30 flex items-center justify-between flex-shrink-0">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="font-bold text-sm text-foreground truncate leading-none">{selectedLevel.title}</h1>
                  <span className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded font-extrabold",
                    selectedLevel.difficulty === 'EASY' && "bg-emerald-500/15 text-emerald-500",
                    selectedLevel.difficulty === 'MEDIUM' && "bg-amber-500/15 text-amber-600",
                    selectedLevel.difficulty === 'HARD' && "bg-rose-500/15 text-rose-500"
                  )}>
                    {t(`concurrency.difficulty.${selectedLevel.difficulty}` as any, {})}
                  </span>
                </div>
                {selectedLevel.concepts && selectedLevel.concepts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {selectedLevel.concepts.map((concept, idx) => (
                      <span key={idx} className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                        {concept}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Split view: Requirements + Editor */}
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
              
              {/* Requirements block */}
              <div className="bg-muted/15 border-b p-4 overflow-y-auto max-h-[220px] flex-shrink-0">
                <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-2">
                  <Info className="h-3.5 w-3.5" />
                  <span>{t('concurrency.requirements')}</span>
                </div>
                <div className="markdown-content text-xs text-muted-foreground leading-relaxed">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {selectedLevel.requirements}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 flex flex-col p-4 min-h-[300px]">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Code className="h-3.5 w-3.5" />
                    <span>{t('concurrency.editor.title')}</span>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleResetCode}
                    className="h-7 text-[10px] px-2.5"
                  >
                    <RotateCcw className="h-3 w-3 mr-1" />
                    {t('concurrency.btn.reset')}
                  </Button>
                </div>
                
                {/* Code Container */}
                <div className="flex-1 relative flex font-mono bg-zinc-950 dark:bg-black rounded-lg border border-zinc-800 text-xs overflow-hidden min-h-0 shadow-inner">
                  {/* Line Numbers */}
                  <div 
                    ref={lineNumbersRef}
                    className="bg-zinc-900/40 text-zinc-600 select-none py-3 text-right pr-2.5 pl-3 border-r border-zinc-850/80 text-[10px] leading-6 overflow-hidden w-10 flex-shrink-0 font-mono"
                  >
                    {lineNumbers.map(n => (
                      <div key={n}>{n}</div>
                    ))}
                  </div>
                  
                  {/* Textarea */}
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    onScroll={handleScroll}
                    onKeyDown={handleKeyDown}
                    placeholder={t('concurrency.editor.placeholder')}
                    className="flex-1 h-full bg-transparent text-zinc-200 py-3 px-3.5 outline-none resize-none leading-6 font-mono text-[11px] overflow-y-auto whitespace-pre tab-size-4 border-none"
                    spellCheck={false}
                  />
                </div>

                <div className="flex justify-end mt-3">
                  <Button
                    onClick={handleVerify}
                    disabled={isSubmitting || !code.trim()}
                    className="w-full sm:w-auto px-6 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>{t('concurrency.btn.submitting')}</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>{t('concurrency.btn.submit')}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* Empty / Welcome State */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
              <Sparkles className="h-8 w-8 text-indigo-500" />
            </div>
            <div className="max-w-md space-y-2">
              <h2 className="text-xl font-bold text-foreground">{t('concurrency.welcome.title')}</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {t('concurrency.welcome.description')}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Right Panel: Retro Console Logs / AI Dashboard */}
      <div className="w-full lg:w-96 flex flex-col h-[350px] lg:h-full bg-zinc-950 text-zinc-300 border-l border-zinc-900 flex-shrink-0 overflow-hidden">
        
        {/* Terminal Header */}
        <div className="p-3.5 border-b border-zinc-900 bg-zinc-950 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 font-mono">
            <Terminal className="h-4 w-4 text-indigo-400" />
            <span>{t('concurrency.terminal.title')}</span>
          </div>
          {reviewResult && (
            <button 
              onClick={() => { setReviewResult(null); setTerminalLogs([]); }}
              className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 font-mono transition-colors"
            >
              <RotateCcw className="h-3 w-3" />
              Reset Console
            </button>
          )}
        </div>

        {/* Dashboard/Console Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0a0d10]">
          {isSubmitting ? (
            /* Live Simulating Console */
            <div className="font-mono text-[11px] text-zinc-400 leading-6 space-y-1">
              {terminalLogs.map((log, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "transition-opacity duration-300",
                    log.includes('[ERROR]') && "text-red-400",
                    log.includes('[WAIT]') && "text-amber-400",
                    log.includes('[ANALYSIS]') && "text-indigo-300"
                  )}
                >
                  {log}
                </div>
              ))}
              <div className="flex items-center gap-1 text-primary">
                <span>&gt; Running JMM analysis</span>
                <span className="h-3.5 w-1.5 bg-primary animate-pulse inline-block" />
              </div>
            </div>
          ) : reviewResult ? (
            /* AI Audit Results Rich Dashboard */
            <div className="space-y-4">
              
              {/* Passed / Rejected Badge */}
              {reviewResult.passed ? (
                <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <Check className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-emerald-400 font-bold text-sm tracking-wide">AUDIT PASSED</div>
                    <div className="text-zinc-400 text-[10px] mt-0.5">Gemini confirmed JVM thread safety.</div>
                  </div>
                </div>
              ) : (
                <div className="bg-rose-950/20 border border-rose-500/20 rounded-xl p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                    <X className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-rose-400 font-bold text-sm tracking-wide">AUDIT REJECTED</div>
                    <div className="text-zinc-400 text-[10px] mt-0.5">Critical thread-safety bugs detected.</div>
                  </div>
                </div>
              )}

              {/* Score Meter */}
              <div className="bg-zinc-900/30 border border-zinc-900 rounded-xl p-3.5">
                <div className="flex justify-between items-center text-xs mb-1.5">
                  <span className="text-zinc-400 font-medium">{t('concurrency.review.score')}</span>
                  <span className={cn(
                    "font-bold text-sm font-mono",
                    reviewResult.score >= 80 ? "text-emerald-400" : reviewResult.score >= 50 ? "text-amber-400" : "text-rose-400"
                  )}>
                    {reviewResult.score} / 100
                  </span>
                </div>
                <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-800">
                  <div 
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      reviewResult.score >= 80 ? "bg-emerald-500" : reviewResult.score >= 50 ? "bg-amber-500" : "bg-rose-500"
                    )}
                    style={{ width: `${reviewResult.score}%` }}
                  />
                </div>
              </div>

              {/* Tab Pills */}
              <div className="flex border-b border-zinc-900 mb-2 p-1 bg-zinc-900/40 rounded-lg text-[10px] font-mono gap-1">
                {(['summary', 'bugs', 'optimizations', 'console'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveResultTab(tab)}
                    className={cn(
                      "flex-1 py-1 rounded-md capitalize font-bold transition-all",
                      activeResultTab === tab 
                        ? "bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/50" 
                        : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    {tab === 'bugs' ? 'Issues' : tab}
                    {tab === 'bugs' && reviewResult.bugs.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 bg-rose-500/20 text-rose-400 text-[9px] rounded-full">
                        {reviewResult.bugs.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tab Content Display */}
              <div className="min-h-0">
                {activeResultTab === 'summary' && (
                  <div className="text-xs text-zinc-300 leading-relaxed markdown-content max-h-[350px] overflow-y-auto space-y-2 pr-1 font-sans">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {reviewResult.summary}
                    </ReactMarkdown>
                  </div>
                )}

                {activeResultTab === 'bugs' && (
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                    {reviewResult.bugs.length === 0 ? (
                      <div className="text-center py-6 text-zinc-500 text-xs flex flex-col items-center gap-2 font-mono">
                        <CheckCircle className="h-8 w-8 text-emerald-500/40" />
                        <span>No concurrency safety issues found!</span>
                      </div>
                    ) : (
                      reviewResult.bugs.map((bug, index) => (
                        <div key={index} className="border border-zinc-900 rounded-lg bg-zinc-950/40 p-3 space-y-2.5 text-xs">
                           <div className="flex justify-between items-center">
                            <span className={cn(
                              "text-[9px] font-mono font-black px-2 py-0.5 rounded border leading-none",
                              bug.severity === 'HIGH' && "bg-rose-500/10 text-rose-400 border-rose-500/20",
                              bug.severity === 'MEDIUM' && "bg-amber-500/10 text-amber-500 border-amber-500/20",
                              bug.severity === 'LOW' && "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            )}>
                              {bug.severity} SEVERITY
                            </span>
                          </div>
                          <div className="text-zinc-200 font-semibold leading-tight">{bug.description}</div>
                          {bug.lineSnippet && (
                            <pre className="p-2.5 bg-zinc-900 border border-zinc-850 rounded text-[10px] font-mono text-zinc-400 overflow-x-auto whitespace-pre leading-relaxed">
                              <code>{bug.lineSnippet}</code>
                            </pre>
                          )}
                          <div className="text-zinc-400 text-[11px] leading-relaxed">
                            <span className="text-indigo-400 font-mono font-bold">Fix Recommendation: </span>
                            {bug.fixSuggestion}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeResultTab === 'optimizations' && (
                  <div className="max-h-[350px] overflow-y-auto pr-1">
                    {reviewResult.optimizations.length === 0 ? (
                      <div className="text-center py-6 text-zinc-500 text-xs font-mono">
                        No additional performance optimizations suggested.
                      </div>
                    ) : (
                      <ul className="space-y-2.5 text-xs text-zinc-300 list-disc pl-4 leading-relaxed font-sans">
                        {reviewResult.optimizations.map((opt, i) => (
                          <li key={i}>{opt}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {activeResultTab === 'console' && (
                  <div className="font-mono text-[10px] text-zinc-500 leading-5 bg-zinc-950/60 p-3 rounded-lg border border-zinc-900 overflow-y-auto max-h-[350px]">
                    {terminalLogs.map((log, i) => (
                      <div key={i} className={cn(
                        log.includes('[ERROR]') && "text-red-400",
                        log.includes('[PASSED]') && "text-emerald-400",
                        log.includes('[REJECTED]') && "text-rose-450"
                      )}>
                        {log}
                      </div>
                    ))}
                    <div className="text-zinc-400 mt-1">&gt; AUDIT COMPLETE.</div>
                  </div>
                )}
              </div>

            </div>
          ) : (
            /* Idle Terminal Screen */
            <div className="font-mono text-[10px] text-emerald-500/80 leading-5 space-y-4">
              <div>
                <div>GEMINI CONCURRENCY AUDITOR (v1.0.0)</div>
                <div>===================================</div>
                <div>ENVIRONMENT: Java Virtual Machine (JMM-17)</div>
                <div>CRITERIA: Happens-before, CAS, Deadlock Ordering</div>
              </div>
              <div className="text-zinc-400 leading-normal border border-zinc-900/60 rounded bg-zinc-900/10 p-2 text-[10px]">
                {t('concurrency.terminal.welcome')}
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <span>&gt; Ready for input</span>
                <span className="h-3 w-1 bg-emerald-400 animate-pulse inline-block" />
              </div>
            </div>
          )}
        </div>
        
      </div>
      
    </div>
  );
}
