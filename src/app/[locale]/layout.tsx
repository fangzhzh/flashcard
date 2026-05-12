import type { Metadata, Viewport } from 'next';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getI18n } from '@/lib/i18n/server';
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext';
import { FlashcardsProvider } from '@/contexts/FlashcardsContext';
import { PomodoroProvider } from '@/contexts/PomodoroContext';
import UniversalFab from '@/components/UniversalFab';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getI18n(); 
  return {
    title: t('metadata.title'),
    description: t('metadata.description'),
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <I18nProviderClient locale={locale}>
      <AuthProvider>
        <FlashcardsProvider>
          <PomodoroProvider>
            <div className="flex flex-col flex-1">
              <Header />
              <div className="flex-1 min-h-0">
                {children}
              </div>
              <UniversalFab />
            </div>
          </PomodoroProvider>
        </FlashcardsProvider>
      </AuthProvider>
    </I18nProviderClient>
  );
}
