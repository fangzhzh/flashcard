
"use client";
import { useState } from 'react';
import Link from 'next/link';
import { BookOpenText, LayoutDashboard, Timer, Languages, LogIn, LogOut, UserCircle, KeyRound, ListChecks, GitFork, Swords, Brain, Code2, Settings2, Server } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n, useChangeLocale, useCurrentLocale } from '@/lib/i18n/client';
import { useAuth } from '@/contexts/AuthContext';
import { useFlashcards } from '@/contexts/FlashcardsContext';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2 } from 'lucide-react';


export default function Header() {
  const t = useI18n();
  const changeLocale = useChangeLocale();
  const currentLocale = useCurrentLocale();
  const pathname = usePathname();
  const { user, signOut, loading: authLoading } = useAuth();
  const { getStatistics, isLoading: flashcardsLoading } = useFlashcards();

  const useToggle = (key: string) => {
    const [enabled, setEnabled] = useState(() => {
      if (typeof window === 'undefined') return false;
      return localStorage.getItem(key) === 'true';
    });
    const toggle = () => {
      const next = !enabled;
      setEnabled(next);
      localStorage.setItem(key, String(next));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('feature-toggles-changed'));
      }
    };
    return [enabled, toggle] as const;
  };

  const [gameEnabled, toggleGame] = useToggle('feat.game');
  const [overviewEnabled, toggleOverview] = useToggle('feat.overview');
  const [flashcardEnabled, toggleFlashcard] = useToggle('feat.flashcard');
  const [taskEnabled, toggleTask] = useToggle('feat.task');

  const navItems = [
    { href: '/leetcode', labelKey: 'nav.leetcode', icon: Code2 },
    { href: '/concurrency', labelKey: 'nav.concurrency', icon: Brain },
    { href: '/system-design', labelKey: 'nav.systemDesign', icon: Server },
    { href: '/timer', labelKey: 'nav.pomodoro', icon: Timer },
    ...(taskEnabled ? [{ href: '/tasks', labelKey: 'nav.tasks', icon: ListChecks }] : []),
    ...(overviewEnabled ? [{ href: '/overviews', labelKey: 'nav.overviews', icon: GitFork }] : []),
    ...(flashcardEnabled ? [{ href: '/flashcards-hub', labelKey: 'nav.flashcards', icon: LayoutDashboard }] : []),
    ...(gameEnabled ? [{ href: '/game', labelKey: 'nav.game', icon: Swords }] : []),
  ];


  const basePathname = pathname.startsWith(`/${currentLocale}`)
    ? pathname.substring(`/${currentLocale}`.length) || '/'
    : pathname;

  const stats = user ? getStatistics() : { dueToday: 0 };
  const dueTodayCount = stats.dueToday;

  const handleSetTheme = (themePref: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    if (themePref === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(themePref);
    }
    localStorage.setItem('theme', themePref);
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-3 sm:px-6">
        {/* Left Section: Title and Main Navigation */}
        <div className="flex items-center gap-1.5 sm:gap-3 md:gap-6 min-w-0">
          <Link href="/" className="flex items-center gap-1.5">
            <BookOpenText className="h-6 w-6 sm:h-7 sm:w-7 text-primary flex-shrink-0" />
            <span className="text-xl sm:text-2xl font-bold tracking-tight hidden sm:inline-block">{t('header.title')}</span>
          </Link>
          {user && (
            <nav className="flex items-center gap-0.5 sm:gap-1.5 md:gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative text-sm font-medium transition-colors hover:text-primary px-1.5 sm:px-2 py-1 rounded-md flex items-center gap-1 sm:gap-1.5",
                    (basePathname === item.href || (item.href !== '/' && basePathname.startsWith(item.href)))
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground"
                  )}
                  title={t(item.labelKey as any, {})}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="hidden md:inline-block">{t(item.labelKey as any, {})}</span>
                  {item.labelKey === 'nav.flashcards' && user && !flashcardsLoading && dueTodayCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute top-0.5 right-0.5 h-4 min-w-[1rem] transform translate-x-1/2 -translate-y-1/2 p-0.5 text-[0.625rem] leading-tight flex items-center justify-center rounded-full"
                    >
                      {dueTodayCount > 9 ? '9+' : dueTodayCount}
                    </Badge>
                  )}
                </Link>
              ))}
            </nav>
          )}
        </div>

        {/* Right Section: Controls */}
        <div className="flex items-center gap-1 sm:gap-2 md:gap-3 flex-shrink-0">
          <div className="hidden sm:inline-flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8 md:h-9 md:w-9">
                  <Languages className="h-[1.2rem] w-[1.2rem]" />
                  <span className="sr-only">{t('theme.toggle')}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => changeLocale('en')} disabled={currentLocale === 'en'}>
                  {t('lang.switch.en')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => changeLocale('zh')} disabled={currentLocale === 'zh'}>
                  {t('lang.switch.zh')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="hidden sm:inline-flex">
            <ThemeToggle />
          </div>

          {authLoading ? (
            <Button variant="outline" size="icon" disabled className="h-8 w-8 md:h-9 md:w-9">
              <Loader2 className="h-[1.2rem] w-[1.2rem] animate-spin" />
            </Button>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.photoURL || undefined} alt={user.displayName || user.email || 'User'} />
                    <AvatarFallback>
                      {user.displayName ? user.displayName.charAt(0).toUpperCase() : <UserCircle className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user.displayName || user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                
                {/* Mobile-only settings dropdown items */}
                <div className="sm:hidden">
                  <div className="px-2 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    语言 / Language
                  </div>
                  <DropdownMenuItem onClick={() => changeLocale('en')} disabled={currentLocale === 'en'} className="text-xs pl-4">
                    🌐 English {currentLocale === 'en' && '✓'}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => changeLocale('zh')} disabled={currentLocale === 'zh'} className="text-xs pl-4">
                    🌐 中文 {currentLocale === 'zh' && '✓'}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                  
                  <div className="px-2 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                    主题 / Theme
                  </div>
                  <DropdownMenuItem onClick={() => handleSetTheme('light')} className="text-xs pl-4">
                    ☀️ {t('theme.light')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetTheme('dark')} className="text-xs pl-4">
                    🌙 {t('theme.dark')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleSetTheme('system')} className="text-xs pl-4">
                    💻 {t('theme.system')}
                  </DropdownMenuItem>
                  
                  <DropdownMenuSeparator />
                </div>

                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.signOut')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <div className="px-2 py-1 text-[10px] font-black text-muted-foreground uppercase tracking-widest">功能开关</div>
                <DropdownMenuItem onClick={toggleOverview} className="text-xs pl-4">
                  <GitFork className="mr-2 h-3.5 w-3.5" />
                  {overviewEnabled ? '✓ ' : ''}Overview 总览
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleFlashcard} className="text-xs pl-4">
                  <LayoutDashboard className="mr-2 h-3.5 w-3.5" />
                  {flashcardEnabled ? '✓ ' : ''}Flashcard 卡片
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleTask} className="text-xs pl-4">
                  <ListChecks className="mr-2 h-3.5 w-3.5" />
                  {taskEnabled ? '✓ ' : ''}Task 任务
                </DropdownMenuItem>
                <DropdownMenuItem onClick={toggleGame} className="text-xs pl-4">
                  <Swords className="mr-2 h-3.5 w-3.5" />
                  {gameEnabled ? '✓ ' : ''}Game 挑战
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" asChild className="h-8 px-2 sm:h-9 text-sm sm:px-3">
              <Link href="/auth">
                <KeyRound className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline-block">{t('auth.signIn')}</span>
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
