'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { ListChecks, PlusCircle, GripVertical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useRef, useCallback, useEffect } from 'react';
import TaskForm, { type TaskFormData } from '@/components/TaskForm';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { useToast } from '@/hooks/use-toast';
import FloatingPomodoroTimer from './FloatingPomodoroTimer';

const FAB_POS_KEY = 'fab_position_v1';
const DRAG_THRESHOLD = 6; // px — below this = tap, above = drag

// ─────────────────────────────────────────────────────────────────────────────

export default function UniversalFab() {
  const { user } = useAuth();
  const t = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = useCurrentLocale();
  const { addTask } = useFlashcards();
  const { toast } = useToast();

  const [isTaskDialogOpen, setIsTaskDialogOpen] = useState(false);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Drag state — null means "not yet loaded" (SSR-safe)
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fabRef  = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    startX: number; startY: number;
    startLeft: number; startTop: number;
    moved: boolean;
  } | null>(null);
  const wasDragged = useRef(false);

  // Load saved position (or compute default) after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FAB_POS_KEY);
      if (saved) {
        const p = JSON.parse(saved) as { x: number; y: number };
        setPos({
          x: Math.max(8, Math.min(window.innerWidth  - 88, p.x)),
          y: Math.max(8, Math.min(window.innerHeight - 88, p.y)),
        });
        return;
      }
    } catch {}
    // Default: bottom-right
    setPos({ x: window.innerWidth - 88, y: window.innerHeight - 220 });
  }, []);

  // ── Drag handlers ────────────────────────────────────────────────────────

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Only drag from the grip handle (the div itself, not child buttons/links)
    const target = e.target as HTMLElement;
    if (target.closest('button, a')) return;
    if (!fabRef.current) return;
    const rect = fabRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX, startY: e.clientY,
      startLeft: rect.left, startTop: rect.top,
      moved: false,
    };
    fabRef.current.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;

    if (!dragRef.current.moved) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      dragRef.current.moved = true;
      setIsDragging(true);
    }

    const newX = Math.max(8, Math.min(window.innerWidth  - 80, dragRef.current.startLeft + dx));
    const newY = Math.max(8, Math.min(window.innerHeight - 80, dragRef.current.startTop  + dy));
    setPos({ x: newX, y: newY });
  }, []);

  const onPointerUp = useCallback(() => {
    if (dragRef.current?.moved) {
      wasDragged.current = true;
      // Persist
      setPos(p => {
        if (p) {
          try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(p)); } catch {}
        }
        return p;
      });
    }
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  // Swallow the synthetic click that fires right after pointer-drag release
  const onClickCapture = useCallback((e: React.MouseEvent) => {
    if (wasDragged.current) {
      wasDragged.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }, []);

  // ── Guards ───────────────────────────────────────────────────────────────

  if (!user) return null;

  const basePathname = pathname.startsWith(`/${currentLocale}`)
    ? pathname.substring(`/${currentLocale}`.length) || '/'
    : pathname;

  if (basePathname === '/timer' || basePathname === '/') return null;

  // ── Contextual action ────────────────────────────────────────────────────

  const currentQueryString = searchParams.toString();
  const returnToPath = encodeURIComponent(basePathname + (currentQueryString ? `?${currentQueryString}` : ''));

  let contextualAction: React.ReactNode = null;
  if (
    basePathname.startsWith('/flashcards') ||
    basePathname.startsWith('/flashcards-hub') ||
    basePathname.startsWith('/review') ||
    basePathname.startsWith('/decks')
  ) {
    contextualAction = (
      <Link href={`/${currentLocale}/flashcards/new?returnTo=${returnToPath}`} passHref>
        <Button
          variant="default"
          className="h-14 w-14 rounded-full bg-primary p-0 shadow-lg text-primary-foreground"
          title={t('flashcards.button.create')}
        >
          <PlusCircle className="h-7 w-7" />
        </Button>
      </Link>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  // While pos hasn't loaded yet (SSR), fall back to CSS bottom-right
  const posStyle: React.CSSProperties = pos
    ? { position: 'fixed', left: pos.x, top: pos.y }
    : { position: 'fixed', right: 24, bottom: 24 };

  return (
    <div
      ref={fabRef}
      className={`z-40 flex flex-col items-center gap-3 select-none touch-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={posStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onClickCapture={onClickCapture}
    >
      {/* Drag handle indicator */}
      <div
        className={`flex items-center justify-center w-6 h-4 rounded opacity-0 hover:opacity-60 transition-opacity ${isDragging ? 'opacity-80' : ''}`}
        style={{ touchAction: 'none' }}
      >
        <GripVertical className="h-4 w-4 text-white/60 drop-shadow-md" />
      </div>

      {contextualAction}
      <FloatingPomodoroTimer />

      <Dialog open={isTaskDialogOpen} onOpenChange={setIsTaskDialogOpen}>
        <DialogTrigger asChild>
          <Button
            variant="default"
            className="h-14 w-14 rounded-full bg-primary p-0 shadow-lg text-primary-foreground"
            title={t('tasks.button.create')}
          >
            <ListChecks className="h-7 w-7" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl md:max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{t('task.form.page.title.create')}</DialogTitle>
          </DialogHeader>
          <TaskForm
            mode="create"
            onSubmit={async (data: TaskFormData) => {
              setIsSubmittingTask(true);
              try {
                await addTask(data);
                toast({ title: t('success'), description: t('toast.task.created') });
                setIsTaskDialogOpen(false);
              } catch {
                toast({ title: t('error'), description: t('toast.task.error.save'), variant: 'destructive' });
              } finally {
                setIsSubmittingTask(false);
              }
            }}
            isLoading={isSubmittingTask}
            onCancel={() => setIsTaskDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}