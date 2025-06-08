
"use client";
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import ProgressDashboard from '@/components/ProgressDashboard';
import { Button } from '@/components/ui/button';
import { Layers, ClipboardCheck, PlusCircle, ShieldAlert } from 'lucide-react';
import { getI18n, useI18n } from '@/lib/i18n/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';


export default function DashboardPage() {
  const t = useI18n();
  const { user, loading: authLoading } = useAuth();

  if (authLoading) {
     return (
      <PageContainer>
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.welcome')}</h1>
        
        {!user ? (
           <Alert variant="destructive" className="my-8">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
          </Alert>
        ) : (
          <>
            <ProgressDashboard />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Link href="/flashcards/new" passHref>
                <Button size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
                  <PlusCircle className="mr-3 h-6 w-6" /> {t('dashboard.button.create')}
                </Button>
              </Link>
              <Link href="/flashcards" passHref>
                <Button variant="secondary" size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
                  <Layers className="mr-3 h-6 w-6" /> {t('dashboard.button.manage')}
                </Button>
              </Link>
              <Link href="/review" passHref>
                <Button variant="outline" size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
                  <ClipboardCheck className="mr-3 h-6 w-6" /> {t('dashboard.button.review')}
                </Button>
              </Link>
            </div>
          </>
        )}
        
        <div className="mt-12 p-6 bg-card border rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">{t('dashboard.howTo.title')}</h2>
          <p className="text-muted-foreground">
            1. <span className="font-medium text-foreground">{t('dashboard.howTo.step1')}</span>
            <br />
            2. <span className="font-medium text-foreground">{t('dashboard.howTo.step2')}</span>
            <br />
            3. <span className="font-medium text-foreground">{t('dashboard.howTo.step3')}</span>
          </p>
        </div>

      </div>
    </PageContainer>
  );
}
