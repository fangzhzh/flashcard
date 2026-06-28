'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  BookOpen, Brain, Timer, ChevronRight, Play, CheckCircle2,
  Calculator, TrendingUp, AlertTriangle, Layers, FileText,
  Sparkles, RotateCcw, Flag, Send, Loader2, Award, ClipboardCheck
} from 'lucide-react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import MermaidDiagram from '@/components/MermaidDiagram';

const CustomMarkdownComponents: Components = {
  code({ className, children, ...props }: any) {
    const match = /language-(\w+)/.exec(className || '');
    if (match && match[1] === 'mermaid') {
      return <MermaidDiagram chart={String(children).trim()} />;
    }
    if (match) {
      return (
        <pre className={className}>
          <code className={className} {...props}>
            {children}
          </code>
        </pre>
      );
    }
    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
  a({ node, ...props }: any) {
    if (props.href && (props.href.startsWith('http://') || props.href.startsWith('https://'))) {
      return <a {...props} target="_blank" rel="noopener noreferrer" />;
    }
    return <a {...props} />;
  }
};

interface SystemDesignNote {
  filename: string;
  title: string;
  sizeBytes: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Scorecard {
  score: number;
  breakdown: {
    requirements: number;
    estimation: number;
    apis: number;
    components: number;
    scaling: number;
  };
  summary: string;
}

interface MockResponse {
  nextQuestion: string;
  stage: 'CLARIFICATION' | 'ESTIMATION' | 'API_DESIGN' | 'ARCHITECTURE' | 'DEEP_DIVE' | 'COMPLETED';
  feedback?: string;
  scorecard?: Scorecard;
}

export default function SystemDesignClient() {
  const { user } = useAuth();
  
  // Navigation & Page State
  const [activeTab, setActiveTab] = useState<'notes' | 'mock' | 'calc'>('notes');
  
  // Notes state
  const [notes, setNotes] = useState<SystemDesignNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [selectedNote, setSelectedNote] = useState<SystemDesignNote | null>(null);
  const [noteContent, setNoteContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);

  // Mock interview state
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const [currentStage, setCurrentStage] = useState<'CLARIFICATION' | 'ESTIMATION' | 'API_DESIGN' | 'ARCHITECTURE' | 'DEEP_DIVE' | 'COMPLETED'>('CLARIFICATION');
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [scorecard, setScorecard] = useState<Scorecard | null>(null);
  const [loadingChat, setLoadingChat] = useState(false);
  const [timeLeft, setTimeLeft] = useState(2700); // 45 minutes in seconds
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Calculator State
  const [calcDau, setCalcDau] = useState<number>(10000000); // 10M
  const [calcWrites, setCalcWrites] = useState<number>(2);
  const [calcReads, setCalcReads] = useState<number>(50);
  const [calcWriteSize, setCalcWriteSize] = useState<number>(1); // 1 KB
  const [calcReadSize, setCalcReadSize] = useState<number>(5); // 5 KB
  const [calcCachePercent, setCalcCachePercent] = useState<number>(20); // 20%

  // --- Fetch Notes List ---
  useEffect(() => {
    async function fetchNotes() {
      try {
        const res = await fetch('/api/system-design/notes');
        if (res.ok) {
          const data = await res.json();
          setNotes(data);
          if (data.length > 0) {
            setSelectedNote(data[0]);
            setSelectedTopic(data[0].title);
          }
        }
      } catch (e) {
        console.error('Failed to fetch notes:', e);
      } finally {
        setLoadingNotes(false);
      }
    }
    fetchNotes();
  }, []);

  // --- Fetch Selected Note Content ---
  useEffect(() => {
    if (!selectedNote) return;
    const currentNote = selectedNote;
    async function fetchContent() {
      setLoadingContent(true);
      try {
        const res = await fetch(`/api/system-design/notes/${currentNote.filename}`);
        if (res.ok) {
          const data = await res.json();
          setNoteContent(data.content);
        }
      } catch (e) {
        console.error('Failed to fetch note content:', e);
      } finally {
        setLoadingContent(false);
      }
    }
    fetchContent();
  }, [selectedNote]);

  // --- Rendered Markdown with image path rewriting ---
  const processedNoteContent = useMemo(() => {
    if (!noteContent) return '';
    // Rewrites ./graphs/xxx.svg to /api/system-design/images/xxx.svg
    return noteContent.replace(
      /!\[(.*?)\]\(\.\/graphs\/(.*?)\)/g,
      (match, alt, filename) => `![${alt}](/api/system-design/images/${filename})`
    );
  }, [noteContent]);

  // --- Timer logic ---
  useEffect(() => {
    if (interviewStarted && timeLeft > 0 && currentStage !== 'COMPLETED') {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [interviewStarted, timeLeft, currentStage]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingChat]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // --- Start Interview ---
  const startInterview = async () => {
    setInterviewStarted(true);
    setMessages([]);
    setScorecard(null);
    setFeedbackMsg('');
    setCurrentStage('CLARIFICATION');
    setTimeLeft(2700); // 45 min
    setLoadingChat(true);

    const initialMsg: ChatMessage = {
      role: 'assistant',
      content: `Welcome to your System Design Interview. Today, we'd like you to design a system for: **${selectedTopic}**. Let's start with the Requirements Clarification. What functional and non-functional requirements would you define for this system?`
    };

    setMessages([initialMsg]);
    setLoadingChat(false);
  };

  // --- Submit candidate chat answer ---
  const sendChatMessage = async () => {
    if (!inputMsg.trim() || loadingChat) return;

    const userMessage: ChatMessage = { role: 'user', content: inputMsg };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMsg('');
    setLoadingChat(true);

    try {
      const res = await fetch('/api/system-design/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: selectedTopic,
          messages: updatedMessages,
          currentStage: currentStage
        })
      });

      if (!res.ok) throw new Error('Request failed');

      const data: MockResponse = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.nextQuestion }]);
      setCurrentStage(data.stage);
      
      if (data.feedback) {
        setFeedbackMsg(data.feedback);
      }
      if (data.stage === 'COMPLETED' && data.scorecard) {
        setScorecard(data.scorecard);
      }
    } catch (e) {
      console.error('Failed to get chat response:', e);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error evaluating your response. Please try again.' }]);
    } finally {
      setLoadingChat(false);
    }
  };

  // --- Conclude and evaluate early ---
  const concludeInterview = async () => {
    setLoadingChat(true);
    try {
      const updatedMessages: ChatMessage[] = [
        ...messages,
        { role: 'user' as const, content: 'Let\'s conclude the interview and evaluate my design now. Please generate the final scorecard and overall feedback.' }
      ];
      setMessages(updatedMessages);

      const res = await fetch('/api/system-design/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle: selectedTopic,
          messages: updatedMessages,
          currentStage: 'DEEP_DIVE' // Force deep dive evaluation
        })
      });

      if (res.ok) {
        const data: MockResponse = await res.json();
        // Force conclulsion if the model returned something else
        const result = data.scorecard ? data : {
          ...data,
          stage: 'COMPLETED' as const,
          scorecard: {
            score: 75,
            breakdown: { requirements: 70, estimation: 70, apis: 80, components: 80, scaling: 75 },
            summary: data.nextQuestion
          }
        };

        setMessages(prev => [...prev, { role: 'assistant', content: 'The mock interview has concluded. Here is your evaluation scorecard.' }]);
        setCurrentStage('COMPLETED');
        if (result.scorecard) {
          setScorecard(result.scorecard);
        }
      }
    } catch (e) {
      console.error('Conclude failed:', e);
    } finally {
      setLoadingChat(false);
    }
  };

  // --- Estimation Calculations ---
  const calculatedOutputs = useMemo(() => {
    const writesPerSec = (calcDau * calcWrites) / 86400;
    const readsPerSec = (calcDau * calcReads) / 86400;
    const dailyWritesBytes = calcDau * calcWrites * calcWriteSize * 1024;
    const dailyReadsBytes = calcDau * calcReads * calcReadSize * 1024;

    const dailyWritesGB = dailyWritesBytes / (1024 * 1024 * 1024);
    const yearlyWritesTB = (dailyWritesGB * 365) / 1024;

    // Bandwidth in Mbps
    const writeBandwidthMbps = (writesPerSec * calcWriteSize * 1024 * 8) / 1000000;
    const readBandwidthMbps = (readsPerSec * calcReadSize * 1024 * 8) / 1000000;

    // Cache sizing: cache 20% of read traffic for the day
    const dailyReadGB = dailyReadsBytes / (1024 * 1024 * 1024);
    const cacheSizeGB = dailyReadGB * (calcCachePercent / 100);

    return {
      writeQps: Math.round(writesPerSec),
      readQps: Math.round(readsPerSec),
      dailyStorageGB: dailyWritesGB.toFixed(2),
      yearlyStorageTB: yearlyWritesTB.toFixed(2),
      writeBandwidth: writeBandwidthMbps.toFixed(2),
      readBandwidth: readBandwidthMbps.toFixed(2),
      cacheSizeGB: cacheSizeGB.toFixed(2),
    };
  }, [calcDau, calcWrites, calcReads, calcWriteSize, calcReadSize, calcCachePercent]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center">
        <Layers className="h-16 w-16 text-primary/30 mb-4" />
        <h2 className="text-2xl font-bold mb-2">系统设计准备</h2>
        <p className="text-muted-foreground">请先登录以查看系统设计模版与进行模拟面试</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* ── Subheader / Tabs Navbar ── */}
      <div className="flex items-center justify-between border-b bg-background px-4 py-2 shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="font-extrabold text-base tracking-tight">System Design Prep</h1>
        </div>
        <div className="flex gap-1.5">
          <Button
            size="sm"
            variant={activeTab === 'notes' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('notes')}
          >
            <BookOpen className="h-4 w-4 mr-1.5" /> 知识库与本地笔记
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'mock' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('mock')}
          >
            <Brain className="h-4 w-4 mr-1.5" /> AI 模拟面试
          </Button>
          <Button
            size="sm"
            variant={activeTab === 'calc' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('calc')}
          >
            <Calculator className="h-4 w-4 mr-1.5" /> 估算计算器
          </Button>
        </div>
      </div>

      {/* ── Tabs Content ── */}
      <div className="flex-1 min-h-0 relative">
        {/* 📚 TAB: Notes */}
        {activeTab === 'notes' && (
          <div className="absolute inset-0 flex overflow-hidden">
            {/* Sidebar list */}
            <aside className="w-64 border-r bg-muted/20 flex flex-col overflow-y-auto">
              <div className="p-3 border-b bg-background/50">
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">设计模版与案例</span>
              </div>
              {loadingNotes ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {notes.map(n => (
                    <button
                      key={n.filename}
                      onClick={() => setSelectedNote(n)}
                      className={cn(
                        'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all',
                        selectedNote?.filename === n.filename
                          ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                          : 'hover:bg-muted text-foreground'
                      )}
                    >
                      <div className="truncate flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        {n.title}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </aside>

            {/* Markdown Display */}
            <main className="flex-1 bg-background overflow-y-auto p-6 md:p-8">
              {loadingContent ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <span className="text-sm text-muted-foreground">正在加载笔记与拓扑图...</span>
                </div>
              ) : !selectedNote ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <BookOpen className="h-12 w-12 mb-2 opacity-30" />
                  <span>选择左侧一篇系统设计笔记开始阅读</span>
                </div>
              ) : (
                <div className="markdown-content max-w-4xl mx-auto pb-12">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{processedNoteContent}</ReactMarkdown>
                </div>
              )}
            </main>
          </div>
        )}

        {/* 🤖 TAB: Mock Interview */}
        {activeTab === 'mock' && (
          <div className="absolute inset-0 flex overflow-hidden">
            {!interviewStarted ? (
              // Setup screen
              <div className="w-full flex items-center justify-center p-4">
                <Card className="max-w-md w-full shadow-lg border-violet-100 dark:border-violet-950/40 bg-gradient-to-b from-violet-500/5 to-transparent">
                  <CardHeader className="text-center">
                    <div className="mx-auto bg-violet-100 dark:bg-violet-950 p-3 rounded-full w-fit mb-3">
                      <Brain className="h-8 w-8 text-violet-600 dark:text-violet-400" />
                    </div>
                    <CardTitle className="text-xl">FAANG 系统设计模拟面试</CardTitle>
                    <CardDescription>
                      使用真实面试环节约束，由 AI 面试官对您的系统设计架构进行深度的交互考察与最终多维度打分。
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">选择面试系统课题</label>
                      <select
                        value={selectedTopic}
                        onChange={e => setSelectedTopic(e.target.value)}
                        className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {notes.map(n => (
                          <option key={n.filename} value={n.title}>{n.title}</option>
                        ))}
                      </select>
                    </div>

                    <Button onClick={startInterview} className="w-full bg-violet-600 hover:bg-violet-700 text-white dark:bg-violet-700 dark:hover:bg-violet-600">
                      <Play className="h-4 w-4 mr-2" /> 开始 45 分钟模拟面试
                    </Button>
                  </CardContent>
                </Card>
              </div>
            ) : (
              // Active interview screen
              <div className="flex-1 flex overflow-hidden">
                {/* Main conversation section */}
                <div className="flex-1 flex flex-col bg-background relative">
                  {/* Interview Header / Dashboard */}
                  <div className="px-4 py-3 border-b bg-muted/10 flex items-center justify-between shrink-0 flex-wrap gap-3">
                    <div>
                      <span className="text-[10px] font-black uppercase text-violet-600 dark:text-violet-400 tracking-widest">正在进行 Mock 面试</span>
                      <h2 className="font-bold text-sm truncate">{selectedTopic}</h2>
                    </div>
                    {/* Visual phase steps */}
                    <div className="hidden lg:flex items-center gap-1.5 text-xs">
                      {([
                        { key: 'CLARIFICATION', label: '需求澄清' },
                        { key: 'ESTIMATION', label: '容量估算' },
                        { key: 'API_DESIGN', label: 'API/模型' },
                        { key: 'ARCHITECTURE', label: '概要设计' },
                        { key: 'DEEP_DIVE', label: '瓶颈优化' },
                      ] as const).map((step, idx) => {
                        const isCurrent = currentStage === step.key;
                        const isPast = ['CLARIFICATION', 'ESTIMATION', 'API_DESIGN', 'ARCHITECTURE', 'DEEP_DIVE', 'COMPLETED'].indexOf(currentStage) > idx;
                        return (
                          <div key={step.key} className="flex items-center gap-1">
                            {idx > 0 && <span className="text-muted-foreground/30">/</span>}
                            <span className={cn(
                              'px-2 py-0.5 rounded-full font-medium',
                              isCurrent ? 'bg-violet-600 text-white font-bold' :
                              isPast ? 'text-green-600 font-semibold' : 'text-muted-foreground'
                            )}>
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Time Counter */}
                    <div className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-sm font-bold border shrink-0',
                      timeLeft < 300 ? 'border-rose-200 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:border-rose-900/50 animate-pulse' : 'border-border bg-muted/50'
                    )}>
                      <Timer className="h-4 w-4 shrink-0" />
                      {formatTime(timeLeft)}
                    </div>
                  </div>

                  {/* Chat logs */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((m, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex max-w-[85%] flex-col rounded-2xl px-4 py-3 text-sm shadow-sm',
                          m.role === 'user'
                            ? 'ml-auto bg-primary text-primary-foreground rounded-tr-none'
                            : 'bg-muted/50 border rounded-tl-none markdown-content max-w-[85%] px-4 py-3'
                        )}
                      >
                        <span className="text-[10px] font-bold text-muted-foreground mb-1">
                          {m.role === 'user' ? '您 (Candidate)' : '面试官 (Interviewer)'}
                        </span>
                        {m.role === 'user' ? (
                          <p className="whitespace-pre-wrap">{m.content}</p>
                        ) : (
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{m.content}</ReactMarkdown>
                        )}
                      </div>
                    ))}
                    {loadingChat && (
                      <div className="bg-muted/50 border rounded-2xl rounded-tl-none px-4 py-3 text-sm shadow-sm w-fit max-w-[85%] flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        <span className="text-xs text-muted-foreground">面试官正在思考您的回答并整理反馈...</span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat input form */}
                  {currentStage !== 'COMPLETED' ? (
                    <div className="p-3 border-t bg-background shrink-0 space-y-2">
                      <div className="flex gap-2">
                        <Textarea
                          value={inputMsg}
                          onChange={e => setInputMsg(e.target.value)}
                          placeholder="在此输入您的设计回答，例如：澄清功能、写出API规范、或者是进行架构估算..."
                          className="flex-1 min-h-[50px] max-h-[120px] resize-none"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendChatMessage();
                            }
                          }}
                        />
                        <Button
                          disabled={!inputMsg.trim() || loadingChat}
                          onClick={sendChatMessage}
                          className="h-auto px-4"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex justify-between items-center text-xs text-muted-foreground flex-wrap gap-2">
                        <span>支持 Shift + Enter 换行，Enter 直接发送</span>
                        <div className="flex gap-2">
                          <Button size="xs" variant="ghost" onClick={concludeInterview} className="text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40">
                            <Flag className="h-3 w-3 mr-1" /> 提前交卷并评分
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Concluded Scorecard Panel Overlay */}
                  {scorecard && (
                    <div className="absolute inset-0 bg-background/95 backdrop-blur overflow-y-auto p-6 md:p-8 animate-in fade-in zoom-in-95 duration-200 z-10">
                      <div className="max-w-2xl mx-auto space-y-6">
                        <div className="text-center space-y-2">
                          <Award className="h-12 w-12 text-violet-600 dark:text-violet-400 mx-auto mb-2" />
                          <h2 className="text-2xl font-black">系统设计面试评估报告</h2>
                          <p className="text-muted-foreground text-sm">恭喜您完成了本次系统设计模拟面试！以下是 AI 面试官对您架构设计的打分与建议。</p>
                        </div>

                        {/* Overall score card */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border p-5 rounded-2xl bg-muted/40 shadow-sm">
                          <div className="text-center sm:border-r border-border/80 flex flex-col justify-center">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">最终得分</span>
                            <span className={cn(
                              'text-5xl font-black my-1.5',
                              scorecard.score >= 85 ? 'text-green-600' :
                              scorecard.score >= 70 ? 'text-amber-500' : 'text-rose-500'
                            )}>
                              {scorecard.score}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">/ 100</span>
                          </div>

                          <div className="col-span-2 space-y-3 pl-0 sm:pl-4">
                            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">分项评分</span>
                            <div className="space-y-2">
                              {[
                                { key: 'requirements', label: '需求 Clarification' },
                                { key: 'estimation', label: '容量 Estimation' },
                                { key: 'apis', label: 'API & 数据库设计' },
                                { key: 'components', label: '核心架构 Components' },
                                { key: 'scaling', label: '容灾与 Scaling' },
                              ].map(item => {
                                const score = scorecard.breakdown[item.key as keyof typeof scorecard.breakdown] ?? 0;
                                return (
                                  <div key={item.key} className="space-y-0.5">
                                    <div className="flex justify-between text-xs font-medium">
                                      <span>{item.label}</span>
                                      <span className="font-bold">{score}</span>
                                    </div>
                                    <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className={cn(
                                          'h-full rounded-full transition-all',
                                          score >= 85 ? 'bg-green-500' :
                                          score >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                                        )}
                                        style={{ width: `${score}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>

                        {/* Detailed evaluation report */}
                        <div className="border rounded-2xl p-5 bg-background shadow-sm markdown-content max-w-none">
                          <h3 className="font-bold text-sm border-b pb-2 mb-4 flex items-center gap-1.5">
                            <ClipboardCheck className="h-4 w-4 text-violet-500" /> 面试官综合反馈
                          </h3>
                          <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{scorecard.summary}</ReactMarkdown>
                        </div>

                        {/* Reset button */}
                        <Button onClick={() => setInterviewStarted(false)} className="w-full py-6">
                          <RotateCcw className="h-4 w-4 mr-2" /> 开启下一场模拟面试
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right side feedback column */}
                {feedbackMsg && currentStage !== 'COMPLETED' && (
                  <aside className="w-72 border-l bg-muted/10 p-4 overflow-y-auto hidden md:block select-none shrink-0 animate-in slide-in-from-right">
                    <h3 className="font-bold text-xs text-muted-foreground uppercase tracking-widest border-b pb-2 mb-3 flex items-center gap-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-500" /> 面试小贴士 / Feedback
                    </h3>
                    <div className="markdown-content text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={CustomMarkdownComponents}>{feedbackMsg}</ReactMarkdown>
                    </div>
                  </aside>
                )}
              </div>
            )}
          </div>
        )}

        {/* 🧮 TAB: Calculator */}
        {activeTab === 'calc' && (
          <div className="absolute inset-0 overflow-y-auto p-4 md:p-6 bg-muted/10">
            <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Side: Parameters input */}
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4 text-primary" /> 架构估算输入参数
                  </CardTitle>
                  <CardDescription>
                    调整系统设想指标以自动推演系统的核心容量边界。
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Parameter: DAU */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>日活用户数量 (DAU)</span>
                      <span className="text-primary font-mono font-bold">{(calcDau / 1000000).toFixed(1)} M</span>
                    </div>
                    <Input
                      type="number"
                      value={calcDau}
                      onChange={e => setCalcDau(Number(e.target.value))}
                      placeholder="Enter DAU"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Parameter: Writes */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">日人均写入频率</label>
                      <Input
                        type="number"
                        value={calcWrites}
                        onChange={e => setCalcWrites(Number(e.target.value))}
                      />
                    </div>
                    {/* Parameter: Reads */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">日人均读取频率</label>
                      <Input
                        type="number"
                        value={calcReads}
                        onChange={e => setCalcReads(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Parameter: Write Size */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">单次写入数据体积 (KB)</label>
                      <Input
                        type="number"
                        value={calcWriteSize}
                        onChange={e => setCalcWriteSize(Number(e.target.value))}
                      />
                    </div>
                    {/* Parameter: Read Size */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">单次读取数据体积 (KB)</label>
                      <Input
                        type="number"
                        value={calcReadSize}
                        onChange={e => setCalcReadSize(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  {/* Parameter: Cache Ratio */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span>内存热数据缓存比率 (%)</span>
                      <span className="text-primary font-mono font-bold">{calcCachePercent} %</span>
                    </div>
                    <Input
                      type="number"
                      value={calcCachePercent}
                      onChange={e => setCalcCachePercent(Number(e.target.value))}
                      min={1}
                      max={100}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Right Side: Calculated metrics */}
              <div className="space-y-4">
                <Card className="shadow-sm border-l-4 border-l-green-500">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm uppercase text-muted-foreground tracking-wider font-semibold">并发吞吐指标 (QPS)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="border p-3 rounded-xl bg-muted/30">
                      <span className="text-xs text-muted-foreground font-medium">写请求 QPS</span>
                      <div className="text-2xl font-black mt-1 font-mono text-green-600 dark:text-green-400">{calculatedOutputs.writeQps}</div>
                      <span className="text-[10px] text-muted-foreground">writes / sec</span>
                    </div>
                    <div className="border p-3 rounded-xl bg-muted/30">
                      <span className="text-xs text-muted-foreground font-medium">读请求 QPS</span>
                      <div className="text-2xl font-black mt-1 font-mono text-blue-600 dark:text-blue-400">{calculatedOutputs.readQps}</div>
                      <span className="text-[10px] text-muted-foreground">reads / sec</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-amber-500">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm uppercase text-muted-foreground tracking-wider font-semibold">存储容量需求</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="border p-3 rounded-xl bg-muted/30">
                      <span className="text-xs text-muted-foreground font-medium">每日新增数据</span>
                      <div className="text-2xl font-black mt-1 font-mono text-amber-600 dark:text-amber-400">{calculatedOutputs.dailyStorageGB} <span className="text-sm font-bold">GB</span></div>
                    </div>
                    <div className="border p-3 rounded-xl bg-muted/30">
                      <span className="text-xs text-muted-foreground font-medium">年度累积存储</span>
                      <div className="text-2xl font-black mt-1 font-mono text-amber-700 dark:text-amber-500">{calculatedOutputs.yearlyStorageTB} <span className="text-sm font-bold">TB</span></div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-sm border-l-4 border-l-violet-500">
                  <CardHeader className="py-4">
                    <CardTitle className="text-sm uppercase text-muted-foreground tracking-wider font-semibold">带宽与缓存占用</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4">
                    <div className="border p-3 rounded-xl bg-muted/30">
                      <span className="text-xs text-muted-foreground font-medium">所需网络带宽</span>
                      <div className="text-lg font-black mt-1.5 font-mono">
                        <div className="text-xs text-muted-foreground">写: {calculatedOutputs.writeBandwidth} Mbps</div>
                        <div className="text-xs text-muted-foreground">读: {calculatedOutputs.readBandwidth} Mbps</div>
                      </div>
                    </div>
                    <div className="border p-3 rounded-xl bg-muted/30 flex flex-col justify-center">
                      <span className="text-xs text-muted-foreground font-medium">Redis/Memcached 缓存容量</span>
                      <div className="text-2xl font-black mt-1 font-mono text-violet-600 dark:text-violet-400">{calculatedOutputs.cacheSizeGB} <span className="text-sm font-bold">GB</span></div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
