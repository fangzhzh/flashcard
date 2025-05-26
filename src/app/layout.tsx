import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { FlashcardsProvider } from '@/contexts/FlashcardsContext';
import { Toaster } from '@/components/ui/toaster';
import Header from '@/components/Header';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FlashFlow',
  description: 'Master your studies with AI-powered flashcards.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} antialiased`}>
        <FlashcardsProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </FlashcardsProvider>
      </body>
    </html>
  );
}
