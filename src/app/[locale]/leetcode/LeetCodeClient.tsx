'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  LEETCODE_CATEGORIES, FAMILIARITY_CONFIG,
  type LeetCodeCategory, type LeetCodeProblem, type Familiarity
} from '@/lib/leetcode-data';
import { useLeetCodeProgress } from '@/hooks/useLeetCodeProgress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ExternalLink, ChevronRight, X, Loader2, CheckCircle2,
  AlertTriangle, TrendingUp, Code2, Zap, Filter, Search,
  Plus, Trash2, RotateCcw, Star, Trophy, Brain, BarChart3
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

// ─── Difficulty Badge ────────────────────────────────────────
function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const cfg = {
    Easy: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
    Medium: 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
    Hard: 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300',
  }[difficulty] ?? 'bg-gray-100 text-gray-600';
  return <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', cfg)}>{difficulty}</span>;
}

// ─── Familiarity Picker ──────────────────────────────────────
function FamiliarityPicker({ value, onChange, compact }: {
  value: Familiarity; onChange: (f: Familiarity) => void; compact?: boolean;
}) {
  return (
    <div className={cn('flex gap-1', compact ? 'flex-row' : 'flex-wrap')}>
      {([0, 1, 2, 3, 4] as Familiarity[]).map(f => {
        const cfg = FAMILIARITY_CONFIG[f];
        return (
          <button
            key={f}
            onClick={() => onChange(f)}
            title={cfg.description}
            className={cn(
              'text-xs font-medium px-2 py-1 rounded-lg border transition-all',
              compact ? 'px-1.5 py-0.5 text-[10px]' : '',
              value === f
                ? cn(cfg.bgColor, cfg.color, 'border-current shadow-sm scale-105')
                : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
            )}
          >
            {compact ? f : cfg.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Category Stats Bar ──────────────────────────────────────
function CategoryStatsBar({ stats }: {
  stats: { notStarted: number; forgot: number; fuzzy: number; familiar: number; mastered: number; total: number }
}) {
  const { total } = stats;
  if (total === 0) return null;
  const pct = (n: number) => `${Math.round((n / total) * 100)}%`;
  return (
    <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden w-full">
      {stats.mastered > 0 && <div className="bg-green-500" style={{ width: pct(stats.mastered) }} title={`掌握 ${stats.mastered}`} />}
      {stats.familiar > 0 && <div className="bg-blue-500" style={{ width: pct(stats.familiar) }} title={`熟悉 ${stats.familiar}`} />}
      {stats.fuzzy > 0 && <div className="bg-amber-400" style={{ width: pct(stats.fuzzy) }} title={`模糊 ${stats.fuzzy}`} />}
      {stats.forgot > 0 && <div className="bg-rose-400" style={{ width: pct(stats.forgot) }} title={`又忘了 ${stats.forgot}`} />}
      {stats.notStarted > 0 && <div className="bg-gray-200 dark:bg-gray-700" style={{ width: pct(stats.notStarted) }} title={`未做 ${stats.notStarted}`} />}
    </div>
  );
}

// ─── AI Review Panel ─────────────────────────────────────────
function AIReviewPanel({ problem, onClose }: { problem: LeetCodeProblem; onClose: () => void }) {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('Java');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleJudge = async () => {
    if (!code.trim()) return;
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await fetch('/api/leetcode-judge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problemNum: problem.num, problemTitle: problem.title, code, language }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Request failed');
      setResult(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const scoreColor = (s: number) =>
    s >= 90 ? 'text-green-600' : s >= 80 ? 'text-blue-600' : s >= 60 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">AI 代码评判</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Problem link */}
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">{problem.num}. {problem.title}</span>
          <DifficultyBadge difficulty={problem.difficulty} />
          <a href={problem.url} target="_blank" rel="noopener noreferrer"
            className="text-primary hover:underline flex items-center gap-0.5 text-xs ml-auto">
            去 LeetCode <ExternalLink className="h-3 w-3" />
          </a>
        </div>

        {/* Language selector */}
        <div className="flex gap-2">
          {['Java', 'Python', 'C++', 'JavaScript', 'Go'].map(l => (
            <button key={l} onClick={() => setLanguage(l)}
              className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors',
                language === l ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/50')}>
              {l}
            </button>
          ))}
        </div>

        {/* Code input */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            粘贴你的代码：
          </label>
          <Textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            placeholder={`// ${language} solution for ${problem.num}. ${problem.title}\n`}
            className="font-mono text-sm min-h-[200px] resize-none"
          />
        </div>

        <Button onClick={handleJudge} disabled={!code.trim() || loading} className="w-full">
          {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> 分析中...</> : <><Zap className="h-4 w-4 mr-2" /> AI 评判</>}
        </Button>

        {error && (
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-sm">
            <AlertTriangle className="h-4 w-4 inline mr-1" />{error}
          </div>
        )}

        {result && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
            {/* Score */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border">
              <div className={cn('text-4xl font-black', scoreColor(result.score))}>{result.score}</div>
              <div>
                <div className="flex items-center gap-2">
                  {result.passed
                    ? <span className="flex items-center gap-1 text-green-600 font-semibold text-sm"><CheckCircle2 className="h-4 w-4" />可过面试</span>
                    : <span className="flex items-center gap-1 text-rose-600 font-semibold text-sm"><AlertTriangle className="h-4 w-4" />需要改进</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1 space-x-3">
                  <span><TrendingUp className="h-3 w-3 inline mr-0.5" />时间 {result.timeComplexity}</span>
                  <span><Code2 className="h-3 w-3 inline mr-0.5" />空间 {result.spaceComplexity}</span>
                </div>
              </div>
            </div>

            {/* Summary */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{result.summary}</ReactMarkdown>
            </div>

            {/* Issues */}
            {result.issues?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">发现的问题</h4>
                <div className="space-y-2">
                  {result.issues.map((issue: any, i: number) => (
                    <div key={i} className={cn('p-3 rounded-lg border text-sm',
                      issue.severity === 'HIGH' ? 'bg-rose-50 dark:bg-rose-950 border-rose-200 dark:border-rose-800' :
                      issue.severity === 'MEDIUM' ? 'bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800' :
                      'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800')}>
                      <div className="font-medium">[{issue.severity}] {issue.description}</div>
                      <div className="text-muted-foreground mt-1">{issue.suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimizations */}
            {result.optimizations?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">优化建议</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {result.optimizations.map((o: string, i: number) => (
                    <li key={i} className="flex gap-2"><span className="text-primary">•</span>{o}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.suggestedApproach && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
                <div className="font-medium text-primary mb-1">更优解法</div>
                <div className="text-muted-foreground">{result.suggestedApproach}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Problem Row ─────────────────────────────────────────────
function ProblemRow({ problem, familiarity, onFamiliarityChange, onOpenJudge, onRemove, canRemove }: {
  problem: LeetCodeProblem;
  familiarity: Familiarity;
  onFamiliarityChange: (f: Familiarity) => void;
  onOpenJudge: () => void;
  onRemove?: () => void;
  canRemove?: boolean;
}) {
  const cfg = FAMILIARITY_CONFIG[familiarity];
  return (
    <div className={cn(
      'group flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-muted/30 transition-colors',
    )}>
      {/* Number */}
      <span className="text-xs text-muted-foreground w-8 text-right flex-shrink-0">{problem.num}</span>

      {/* Title & tags */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <a href={problem.url} target="_blank" rel="noopener noreferrer"
            className="font-medium text-sm hover:text-primary hover:underline truncate flex items-center gap-1">
            {problem.title}
            <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-50 flex-shrink-0" />
          </a>
          <DifficultyBadge difficulty={problem.difficulty} />
          {problem.companies?.map(c => (
            <span key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-950 text-violet-700 dark:text-violet-300 font-medium">
              {c}
            </span>
          ))}
        </div>
        <div className="flex gap-1 mt-0.5 flex-wrap">
          {problem.tags.slice(0, 4).map(t => (
            <span key={t} className="text-[10px] text-muted-foreground">{t}</span>
          ))}
        </div>
      </div>

      {/* Familiarity */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={cn('text-xs font-medium w-12 text-right', cfg.color)}>{cfg.label}</span>
        <FamiliarityPicker value={familiarity} onChange={onFamiliarityChange} compact />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        <Button size="sm" variant="ghost" onClick={onOpenJudge} className="h-7 px-2 text-xs">
          <Brain className="h-3 w-3 mr-1" />AI
        </Button>
        {canRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove} className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────
export default function LeetCodeClient() {
  const { user } = useAuth();
  const { loadAll, getFamiliarity, updateFamiliarity, getCategoryStats, loaded, loading } = useLeetCodeProgress();

  const [selectedCategoryId, setSelectedCategoryId] = useState('faang');
  const [judgeTarget, setJudgeTarget] = useState<LeetCodeProblem | null>(null);
  const [search, setSearch] = useState('');
  const [filterDiff, setFilterDiff] = useState<string>('All');
  const [filterFamiliarity, setFilterFamiliarity] = useState<string>('All');
  const [customProblems, setCustomProblems] = useState<LeetCodeProblem[]>([]);
  const [addingProblem, setAddingProblem] = useState(false);
  const [newProblemUrl, setNewProblemUrl] = useState('');

  useEffect(() => {
    if (user && !loaded) loadAll();
  }, [user, loaded, loadAll]);

  const selectedCategory = useMemo(
    () => LEETCODE_CATEGORIES.find(c => c.id === selectedCategoryId),
    [selectedCategoryId]
  );

  const allProblems = useMemo(() => {
    const base = selectedCategory?.problems ?? [];
    const custom = selectedCategoryId === 'faang' ? customProblems : [];
    return [...base, ...custom];
  }, [selectedCategory, customProblems, selectedCategoryId]);

  const filteredProblems = useMemo(() => {
    return allProblems.filter(p => {
      const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) ||
        String(p.num).includes(search) || p.tags.some(t => t.includes(search.toLowerCase()));
      const matchDiff = filterDiff === 'All' || p.difficulty === filterDiff;
      const f = getFamiliarity(p.id);
      const matchFam = filterFamiliarity === 'All' ||
        (filterFamiliarity === 'not-started' && f === 0) ||
        (filterFamiliarity === 'weak' && (f === 1 || f === 2)) ||
        (filterFamiliarity === 'strong' && (f === 3 || f === 4));
      return matchSearch && matchDiff && matchFam;
    });
  }, [allProblems, search, filterDiff, filterFamiliarity, getFamiliarity]);

  // Sort: not-started / forgot first, mastered last
  const sortedProblems = useMemo(() => {
    return [...filteredProblems].sort((a, b) => getFamiliarity(a.id) - getFamiliarity(b.id));
  }, [filteredProblems, getFamiliarity]);

  const addCustomProblem = useCallback(() => {
    const urlMatch = newProblemUrl.match(/problems\/([^/]+)/);
    if (!urlMatch) return;
    const slug = urlMatch[1];
    const numMatch = newProblemUrl.match(/(\d+)/);
    const num = numMatch ? parseInt(numMatch[1]) : Date.now();
    const title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const p: LeetCodeProblem = {
      id: `custom-${slug}`,
      num, title, difficulty: 'Medium', category: 'faang',
      tags: [], url: newProblemUrl.startsWith('http') ? newProblemUrl : `https://leetcode.com/problems/${slug}/`,
      isCustom: true,
    };
    setCustomProblems(prev => [...prev, p]);
    setNewProblemUrl('');
    setAddingProblem(false);
  }, [newProblemUrl]);

  const removeCustom = useCallback((id: string) => {
    setCustomProblems(prev => prev.filter(p => p.id !== id));
  }, []);

  const categoryStats = useMemo(() => {
    return getCategoryStats(allProblems.map(p => p.id));
  }, [allProblems, getCategoryStats]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Trophy className="h-16 w-16 text-primary/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">FAANG 面试题库</h2>
        <p className="text-muted-foreground">请先登录以追踪你的刷题进度</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-64 flex-shrink-0 border-r bg-background overflow-y-auto">
        <div className="p-3 border-b">
          <h2 className="font-bold text-sm text-muted-foreground uppercase tracking-wider px-1">算法分类</h2>
        </div>
        <nav className="p-2 space-y-0.5">
          {LEETCODE_CATEGORIES.map(cat => {
            const stats = getCategoryStats(cat.problems.map(p => p.id));
            const doneCount = stats.familiar + stats.mastered;
            const isActive = selectedCategoryId === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => { setSelectedCategoryId(cat.id); setSearch(''); setFilterDiff('All'); setFilterFamiliarity('All'); }}
                className={cn(
                  'w-full text-left px-3 py-2.5 rounded-lg transition-all group',
                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-foreground'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium truncate">{cat.name}</span>
                  <span className={cn('text-xs ml-1 flex-shrink-0', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {doneCount}/{stats.total}
                  </span>
                </div>
                <div className="mt-1.5">
                  <CategoryStatsBar stats={stats} />
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 p-3 border-b bg-background/95 backdrop-blur flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索题目、标签..."
              className="w-full pl-8 pr-3 py-1.5 text-sm border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {/* Difficulty filter */}
          <div className="flex gap-1">
            {['All', 'Easy', 'Medium', 'Hard'].map(d => (
              <button key={d} onClick={() => setFilterDiff(d)}
                className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors',
                  filterDiff === d ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {d}
              </button>
            ))}
          </div>

          {/* Familiarity filter */}
          <div className="flex gap-1">
            {[
              { key: 'All', label: '全部' },
              { key: 'not-started', label: '未做' },
              { key: 'weak', label: '薄弱' },
              { key: 'strong', label: '掌握' },
            ].map(f => (
              <button key={f.key} onClick={() => setFilterFamiliarity(f.key)}
                className={cn('text-xs px-2.5 py-1 rounded-lg border transition-colors',
                  filterFamiliarity === f.key ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:border-primary/40')}>
                {f.label}
              </button>
            ))}
          </div>

          {/* Add problem button (FAANG category only) */}
          {selectedCategoryId === 'faang' && (
            <Button size="sm" variant="outline" onClick={() => setAddingProblem(true)} className="h-7 text-xs">
              <Plus className="h-3 w-3 mr-1" />添加题目
            </Button>
          )}
        </div>

        {/* Category header */}
        <div className="px-4 py-3 border-b bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-lg">{selectedCategory?.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5">{selectedCategory?.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-primary">{categoryStats.mastered + categoryStats.familiar}</div>
              <div className="text-xs text-muted-foreground">/ {categoryStats.total} 已掌握</div>
            </div>
          </div>
          {/* Overall stats bar */}
          <div className="mt-2">
            <CategoryStatsBar stats={categoryStats} />
          </div>
          <div className="flex gap-3 mt-1.5 text-[10px] text-muted-foreground">
            {[
              { label: '掌握', val: categoryStats.mastered, color: 'bg-green-500' },
              { label: '熟悉', val: categoryStats.familiar, color: 'bg-blue-500' },
              { label: '模糊', val: categoryStats.fuzzy, color: 'bg-amber-400' },
              { label: '又忘了', val: categoryStats.forgot, color: 'bg-rose-400' },
              { label: '未做', val: categoryStats.notStarted, color: 'bg-gray-300 dark:bg-gray-600' },
            ].map(s => (
              <span key={s.label} className="flex items-center gap-1">
                <span className={cn('inline-block w-2 h-2 rounded-full', s.color)} />
                {s.label} {s.val}
              </span>
            ))}
          </div>
        </div>

        {/* Add problem form */}
        {addingProblem && (
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-primary/5">
            <input
              value={newProblemUrl}
              onChange={e => setNewProblemUrl(e.target.value)}
              placeholder="粘贴 LeetCode 题目 URL 或题号..."
              className="flex-1 text-sm border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => e.key === 'Enter' && addCustomProblem()}
              autoFocus
            />
            <Button size="sm" onClick={addCustomProblem} disabled={!newProblemUrl.trim()}>确认</Button>
            <Button size="sm" variant="ghost" onClick={() => { setAddingProblem(false); setNewProblemUrl(''); }}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Problem list */}
        <div className="flex-1 overflow-y-auto">
          {loading && !loaded ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : sortedProblems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
              <Search className="h-8 w-8 mb-2 opacity-30" />
              没有匹配的题目
            </div>
          ) : (
            <div>
              <div className="px-4 py-1.5 text-xs text-muted-foreground border-b bg-muted/10">
                显示 {sortedProblems.length} / {allProblems.length} 题
              </div>
              {sortedProblems.map(problem => (
                <ProblemRow
                  key={problem.id}
                  problem={problem}
                  familiarity={getFamiliarity(problem.id)}
                  onFamiliarityChange={f => updateFamiliarity(problem.id, f)}
                  onOpenJudge={() => setJudgeTarget(problem)}
                  canRemove={problem.isCustom}
                  onRemove={() => removeCustom(problem.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── AI Judge Panel ── */}
      {judgeTarget && (
        <div className="w-[420px] flex-shrink-0 border-l bg-background overflow-hidden flex flex-col animate-in slide-in-from-right">
          <AIReviewPanel problem={judgeTarget} onClose={() => setJudgeTarget(null)} />
        </div>
      )}
    </div>
  );
}
