
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { ListChecks, Play, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function UniversalFab() {
  const { user } = useAuth();
  const t = useI18n();
  const pathname = usePathname();
  const currentLocale = useCurrentLocale();

  if (!user) {
    return null;
  }

  const basePathname = pathname.startsWith(`/${currentLocale}`)
    ? pathname.substring(`/${currentLocale}`.length) || '/'
    : pathname;
    
  let contextualAction: React.ReactNode = null;

  const showContextualButton = 
    basePathname.startsWith('/flashcards') ||
    basePathname.startsWith('/flashcards-hub') ||
    basePathname.startsWith('/review');

  if (showContextualButton) {
    contextualAction = (
      <Link href={`/${currentLocale}/flashcards/new`} passHref>
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

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-4">
      {contextualAction}
      
      <Link href={`/${currentLocale}/timer`} passHref>
        <Button
          variant="outline"
          className="h-14 w-14 rounded-full p-0 shadow-lg border-2 border-primary bg-background text-primary hover:bg-muted"
          title={t('nav.pomodoro')}
        >
          <Play className="h-7 w-7" />
        </Button>
      </Link>
      
      <Link href={`/${currentLocale}/tasks/new`} passHref>
        <Button
          variant="default"
          className="h-14 w-14 rounded-full bg-primary p-0 shadow-lg text-primary-foreground"
          title={t('tasks.button.create')}
        >
          <ListChecks className="h-7 w-7" />
        </Button>
      </Link>
    </div>
  );
}
