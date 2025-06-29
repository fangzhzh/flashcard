
'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { Button } from '@/components/ui/button';
import { ListChecks, Play, PlusCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePomodoro } from '@/contexts/PomodoroContext';

export default function UniversalFab() {
  const { user } = useAuth();
  const t = useI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentLocale = useCurrentLocale();
  const router = useRouter();
  const { sessionState, startPomodoro, isResting } = usePomodoro();

  if (!user) {
    return null;
  }

  const basePathname = pathname.startsWith(`/${currentLocale}`)
    ? pathname.substring(`/${currentLocale}`.length) || '/'
    : pathname;
    
  // Hide FABs on the main timer page to avoid redundancy
  if (basePathname === '/timer') {
    return null;
  }

  // Timer button logic
  const handleTimerClick = () => {
    // If idle, start the timer without navigating
    if (sessionState?.status === 'idle' && !isResting) {
      const duration = sessionState.userPreferredDurationMinutes || 25;
      startPomodoro(duration);
      return;
    }
    
    // Otherwise, navigate to the main timer page for full controls
    router.push(`/${currentLocale}/timer`);
  };

  // Contextual "Create" button logic
  let contextualAction: React.ReactNode = null;
  const showContextualButton = 
    basePathname.startsWith('/flashcards') ||
    basePathname.startsWith('/flashcards-hub') ||
    basePathname.startsWith('/review') ||
    basePathname.startsWith('/decks') ||
    basePathname.startsWith('/overviews');

  const currentQueryString = searchParams.toString();
  const returnToPath = encodeURIComponent(basePathname + (currentQueryString ? `?${currentQueryString}` : ''));

  if (showContextualButton) {
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
  
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-4">
      {contextualAction}
      
      <Button
        variant="outline"
        className="h-14 w-14 rounded-full p-0 shadow-lg border-2 border-primary bg-background text-primary hover:bg-muted"
        title={t('nav.pomodoro')}
        onClick={handleTimerClick}
      >
        <Play className="h-7 w-7" />
      </Button>
      
      <Link href={`/${currentLocale}/tasks/new?returnTo=${returnToPath}`} passHref>
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
