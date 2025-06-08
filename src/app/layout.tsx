
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { FlashcardsProvider } from '@/contexts/FlashcardsContext';
import { AuthProvider } from '@/contexts/AuthContext';
// PomodoroProvider is removed from here
import { Toaster } from '@/components/ui/toaster';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

// General metadata, specific title/description will be in [locale]/layout.tsx
export const metadata: Metadata = {
  title: 'FlashFlow', // Generic fallback
  description: 'Master your studies with AI-powered flashcards and Pomodoro timer.', // Generic fallback
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning><body className={`${geistSans.variable} antialiased`}>
      <AuthProvider>
        <FlashcardsProvider>
          {/* PomodoroProvider was here, now removed */}
          <div className="flex min-h-screen flex-col">
            <main className="flex-1">{children}</main>
          </div>
          <Toaster />
        </FlashcardsProvider>
      </AuthProvider>
      </body></html>
  );
}
