
"use client";
import Link from 'next/link';
import { BookOpenText, LayoutDashboard, Layers, ClipboardCheck, Languages, LogIn, LogOut, UserCircle, Library, Timer } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useI18n, useChangeLocale, useCurrentLocale } from '@/lib/i18n/client';
import { useAuth } from '@/contexts/AuthContext';
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
  const { user, signInWithGoogle, signOut, loading: authLoading } = useAuth();

  const navItems = [
    { href: '/', labelKey: 'nav.pomodoro', icon: Timer },
    { href: '/flashcards-hub', labelKey: 'nav.flashcards', icon: LayoutDashboard },
    { href: '/decks', labelKey: 'nav.decks', icon: Library },
    { href: '/flashcards', labelKey: 'nav.manage', icon: Layers },
    { href: '/review', labelKey: 'nav.review', icon: ClipboardCheck },
  ];

  const basePathname = pathname.startsWith(`/${currentLocale}`)
    ? pathname.substring(`/${currentLocale}`.length) || '/'
    : pathname;


  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold tracking-tight">{t('header.title')}</span>
        </Link>
        <nav className="flex items-center gap-1 md:gap-2">
          {user && navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary px-2 py-1 md:px-3 rounded-md",
                (basePathname === item.href || (item.href !== '/' && basePathname.startsWith(item.href))) 
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="inline-block h-5 w-5 md:hidden" />
              <span className="hidden md:inline-block">{t(item.labelKey as any)}</span>
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="ml-2">
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
            <Button variant="outline" size="icon" disabled>
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
            <Button variant="outline" onClick={signInWithGoogle}>
              <LogIn className="mr-2 h-4 w-4" />
              {t('auth.signInWithGoogle')}
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

