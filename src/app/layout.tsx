import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { FlashcardsProvider } from '@/contexts/FlashcardsContext';
import { Toaster } from '@/components/ui/toaster';
// Note: Header is now in [locale]/layout.tsx
// Note: I18nProvider is in [locale]/layout.tsx

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// General metadata, specific title/description will be in [locale]/layout.tsx
export const metadata: Metadata = {
  title: 'FlashFlow', // Generic fallback
  description: 'Master your studies with AI-powered flashcards.', // Generic fallback
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> {/* Default lang, will be overridden by [locale] */}
      <body className={`${geistSans.variable} antialiased`}>
        <FlashcardsProvider>
          <div className="flex min-h-screen flex-col">
            {/* Header moved to [locale]/layout.tsx */}
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </FlashcardsProvider>
      </body>
    </html>
  );
}
