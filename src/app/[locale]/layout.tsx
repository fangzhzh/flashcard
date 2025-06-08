
import type { Metadata, Viewport } from 'next';
import { I18nProviderClient } from '@/lib/i18n/client';
import { getI18n } from '@/lib/i18n/server';
import Header from '@/components/Header';
import { PomodoroProvider } from '@/contexts/PomodoroContext'; // Ensure this is imported

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }): Promise<Metadata> {
  const t = await getI18n(); // Gets translations for the current server-side locale
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
      <PomodoroProvider> {/* PomodoroProvider now wraps content inside I18nProviderClient */}
        <>
          <Header />
          {children}
        </>
      </PomodoroProvider>
    </I18nProviderClient>
  );
}
