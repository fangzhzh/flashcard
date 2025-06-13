
"use client";
import Link from 'next/link';
import { BookOpenText, LayoutDashboard, Timer, Languages, LogIn, LogOut, UserCircle, KeyRound, ListChecks } from 'lucide-react'; // Added ListChecks
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

  const navItems = [
    { href: '/tasks', labelKey: 'nav.tasks', icon: ListChecks },
    { href: '/timer', labelKey: 'nav.pomodoro', icon: Timer }, 
    { href: '/flashcards-hub', labelKey: 'nav.flashcards', icon: LayoutDashboard },
  ];

  const basePathname = pathname.startsWith(`/${currentLocale}`)
    ? pathname.substring(`/${currentLocale}`.length) || '/'
    : pathname;

  const stats = user ? getStatistics() : { dueToday: 0 }; 
  const dueTodayCount = stats.dueToday;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        {/* Left Section: Title and Main Navigation */}
        <div className="flex items-center gap-3 md:gap-6">
          <Link href="/" className="flex items-center gap-2">
            <BookOpenText className="h-7 w-7 text-primary" />
            <span className="text-2xl font-bold tracking-tight">{t('header.title')}</span>
          </Link>
          {user && (
            <nav className="flex items-center gap-1 md:gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative text-sm font-medium transition-colors hover:text-primary px-1 py-1 md:px-3 rounded-md", 
                    (basePathname === item.href || (item.href !== '/' && basePathname.startsWith(item.href)))
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground"
                  )}
                  title={t(item.labelKey as any)}
                >
                  <div className="flex items-center"> 
                    <item.icon className="inline-block h-5 w-5 md:hidden" />
                    <span className="hidden md:inline-block">{t(item.labelKey as any)}</span>
                  </div>
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
        <div className="flex items-center gap-2 md:gap-3">
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

          <ThemeToggle />

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
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  {user.displayName || user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  {t('auth.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" asChild className="h-9 text-sm px-3">
              <Link href="/auth">
                <KeyRound className="mr-2 h-4 w-4" />
                {t('auth.signIn')}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

