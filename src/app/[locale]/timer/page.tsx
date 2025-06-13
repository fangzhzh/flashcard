
"use client";

import PageContainer from '@/components/PageContainer';
import PomodoroClient from '../PomodoroClient'; // Path relative to the current directory
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from 'next/link';

export default function TimerPage() {
  const { user, loading: authLoading } = useAuth();
  const t = useI18n();
  const currentLocale = useCurrentLocale();

  if (authLoading) {
    return (
      <PageContainer className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </PageContainer>
    );
  }

  if (!user) {
    return (
      <PageContainer className="max-w-md mx-auto">
        <Alert variant="destructive" className="mt-8">
          <ShieldAlert className="h-5 w-5" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {t('auth.pleaseSignIn')}{' '}
            <Link href={`/${currentLocale}/auth`} className="underline font-semibold hover:text-destructive-foreground/80">
              {t('auth.signIn')}
            </Link>
          </AlertDescription>
        </Alert>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('pomodoro.title')}</h1>
      </div>
      <PomodoroClient />
    </PageContainer>
  );
}
