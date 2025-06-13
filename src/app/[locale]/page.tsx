
"use client"; 

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import PageContainer from '@/components/PageContainer';
import PomodoroLocalClient from './PomodoroLocalClient'; 
import { PomodoroLocalProvider } from '@/contexts/PomodoroLocalContext'; 
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';

export default function LandingRootPage() { 
  const { user, loading: authLoading } = useAuth();
  const t = useI18n();
  const router = useRouter();
  const currentLocale = useCurrentLocale();

  useEffect(() => {
    if (!authLoading && user) {
      router.replace(`/${currentLocale}/tasks`); // Use replace to avoid adding to history
    }
  }, [user, authLoading, router, currentLocale]);

  if (authLoading || (!authLoading && user)) { 
    return (
      <PageContainer className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </PageContainer>
    );
  }

  // If not loading and no user, show PomodoroLocalClient at the root
  return (
    <PageContainer>
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('pomodoro.title')}</h1>
      </div>
      <PomodoroLocalProvider>
        <PomodoroLocalClient />
      </PomodoroLocalProvider>
    </PageContainer>
  );
}
