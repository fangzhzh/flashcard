"use client";
import Link from 'next/link';
import { BookOpenText, LayoutDashboard, Layers, ClipboardCheck, Languages } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePathname } from 'next/navigation'; // Keep for active link styling
import { cn } from '@/lib/utils';
import { useI18n, useChangeLocale, useCurrentLocale } from '@/lib/i18n/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';


export default function Header() {
  const t = useI18n();
  const changeLocale = useChangeLocale();
  const currentLocale = useCurrentLocale();
  const pathname = usePathname(); // Get the full path including current locale

  const navItems = [
    { href: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard },
    { href: '/flashcards', labelKey: 'nav.manage', icon: Layers },
    { href: '/review', labelKey: 'nav.review', icon: ClipboardCheck },
  ];

  // Remove locale prefix for comparison if present, as navItems.href are relative to locale root
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
        <nav className="flex items-center gap-2 md:gap-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href} // next-international middleware handles locale prefixing
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                // Ensure basePathname comparison works correctly
                (basePathname === item.href || (basePathname === '' && item.href === '/'))
                  ? "text-primary" 
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="inline-block h-5 w-5 md:hidden" />
              <span className="hidden md:inline-block">{t(item.labelKey as any)}</span>
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Languages className="h-[1.2rem] w-[1.2rem]" />
                <span className="sr-only">{t('theme.toggle')}</span> {/* Re-use for SR, or add new key */}
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
        </nav>
      </div>
    </header>
  );
}
