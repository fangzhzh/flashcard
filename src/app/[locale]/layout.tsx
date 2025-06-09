
import type { Metadata, Viewport } from 'next';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getI18n } from '@/lib/i18n/server';
import Header from '@/components/Header';
import { AuthProvider } from '@/contexts/AuthContext'; // Added
import { FlashcardsProvider } from '@/contexts/FlashcardsContext'; // Added
import { PomodoroProvider } from '@/contexts/PomodoroContext';
import FloatingPomodoroTimer from '@/components/FloatingPomodoroTimer'; // Import the new component

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
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

export default function LocaleLayout({
  children,
  params: { locale }
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <I18nProviderClient locale={locale}>
      <AuthProvider>
        <FlashcardsProvider>
          <PomodoroProvider>
            <>
              <Header />
              {children}
              <FloatingPomodoroTimer /> {/* Add the floating timer here */}
            </>
          </PomodoroProvider>
        </FlashcardsProvider>
      </AuthProvider>
    </I18nProviderClient>
  );
}
