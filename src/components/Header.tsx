"use client";
import Link from 'next/link';
import { BookOpenText, LayoutDashboard, Layers, Review } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/flashcards', label: 'Manage Cards', icon: Layers },
  { href: '/review', label: 'Review', icon: Review },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <BookOpenText className="h-7 w-7 text-primary" />
          <span className="text-2xl font-bold tracking-tight">FlashFlow</span>
        </Link>
        <nav className="flex items-center gap-4 md:gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm font-medium transition-colors hover:text-primary",
                pathname === item.href ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className="inline-block h-5 w-5 md:hidden" />
              <span className="hidden md:inline-block">{item.label}</span>
            </Link>
          ))}
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
