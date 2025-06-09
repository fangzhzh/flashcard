
"use client"; // Make this a client component to use hooks

import PageContainer from '@/components/PageContainer';
import PomodoroClient from './PomodoroClient'; 
import PomodoroLocalClient from './PomodoroLocalClient'; // Import the new local client
import { PomodoroLocalProvider } from '@/contexts/PomodoroLocalContext'; // Import the local provider
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/client'; // Use client hook for t

export default function PomodoroAsDefaultPage() { 
  const { user, loading: authLoading } = useAuth();
  const t = useI18n(); // Get t function

  if (authLoading) {
    return (
      <PageContainer className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('pomodoro.title')}</h1>
      </div>
      {user ? (
        <PomodoroClient /> /* Uses global PomodoroProvider (Firestore) from layout */
      ) : (
        <PomodoroLocalProvider>
          <PomodoroLocalClient />
        </PomodoroLocalProvider>
      )}
    </PageContainer>
  );
}

    