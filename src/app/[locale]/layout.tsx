
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
            <div className="flex flex-col flex-1"> {/* Root div takes full height from parent (RootLayout) */}
              <Header /> {/* Header takes its natural height */}
              <div className="flex-1 overflow-y-auto min-h-0"> {/* This area scrolls */}
                {children}
              </div>
              <FloatingPomodoroTimer />
            </div>
          </PomodoroProvider>
        </FlashcardsProvider>
      </AuthProvider>
    </I18nProviderClient>
  );
}
