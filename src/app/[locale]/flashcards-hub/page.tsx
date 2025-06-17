
"use client";
import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import ProgressDashboard from '@/components/ProgressDashboard';
import { Button } from '@/components/ui/button';
import { Layers, ClipboardCheck, PlusCircle, ShieldAlert, Library, ListChecks } from 'lucide-react';
import { useI18n, useCurrentLocale } from '@/lib/i18n/client';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation'; // Added usePathname, useSearchParams


export default function FlashcardsHubPage() {
  const t = useI18n();
  const currentLocale = useCurrentLocale();
  const { user, loading: authLoading } = useAuth();
  const pathname = usePathname(); // For constructing returnTo path
  const searchParams = useSearchParams(); // For constructing returnTo path

  if (authLoading) {
     return (
      <PageContainer>
        <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </PageContainer>
    );
  }

  // Construct returnTo path including query parameters
  const currentPathWithoutLocale = pathname.replace(`/${currentLocale}`, '') || '/';
  const currentQueryString = searchParams.toString();
  const returnToPath = currentPathWithoutLocale + (currentQueryString ? `?${currentQueryString}` : '');

  return (
    <PageContainer>
      <div className="flex-1 space-y-8 overflow-y-auto pb-20 pt-6"> {/* Increased pb to 20 for FAB spacing */}
        <h1 className="text-3xl font-bold tracking-tight">{t('flashcards.dashboard.welcome')}</h1>

        {!user ? (
           <Alert variant="destructive" className="my-8">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle>{t('error')}</AlertTitle>
            <AlertDescription>{t('auth.pleaseSignIn')}</AlertDescription>
          </Alert>
        ) : (
          <>
            <ProgressDashboard />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
              <Link href={`/${currentLocale}/review`} passHref>
                <Button variant="default" size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow bg-accent text-accent-foreground hover:bg-accent/90">
                  <ClipboardCheck className="mr-3 h-6 w-6" /> {t('flashcards.dashboard.button.review')}
                </Button>
              </Link>
              <Link href={`/${currentLocale}/flashcards/new`} passHref>
                <Button size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
                  <PlusCircle className="mr-3 h-6 w-6" /> {t('flashcards.dashboard.button.create')}
                </Button>
              </Link>
              <Link href={`/${currentLocale}/decks`} passHref>
                <Button variant="secondary" size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
                  <Library className="mr-3 h-6 w-6" /> {t('flashcards.dashboard.button.decks')}
                </Button>
              </Link>
               <Link href={`/${currentLocale}/flashcards`} passHref>
                <Button variant="outline" size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
                  <Layers className="mr-3 h-6 w-6" /> {t('flashcards.dashboard.button.manageAll')}
                </Button>
              </Link>
            </div>
          </>
        )}

        <div className="mt-12 p-6 bg-card border rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">{t('flashcards.dashboard.howTo.title')}</h2>
          <ul className="list-decimal pl-5 space-y-1 text-muted-foreground">
            <li><span className="font-medium text-foreground">{t('flashcards.dashboard.howTo.step1')}</span></li>
            <li><span className="font-medium text-foreground">{t('flashcards.dashboard.howTo.step2')}</span></li>
            <li><span className="font-medium text-foreground">{t('flashcards.dashboard.howTo.step3')}</span></li>
            <li><span className="font-medium text-foreground">{t('flashcards.dashboard.howTo.step4')}</span></li>
          </ul>
        </div>

      </div>
      {user && (
        <Link href={`/${currentLocale}/tasks/new?returnTo=${encodeURIComponent(returnToPath)}`} passHref>
            <Button
                variant="default"
                className="fixed bottom-6 right-6 z-40 rounded-full h-14 w-14 p-0 shadow-lg"
                title={t('tasks.button.create')}
            >
                <ListChecks className="h-7 w-7" />
            </Button>
        </Link>
      )}
    </PageContainer>
  );
}

