
import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import './globals.css';
import { FlashcardsProvider } from '@/contexts/FlashcardsContext';
import { AuthProvider } from '@/contexts/AuthContext'; 
import { PomodoroProvider } from '@/contexts/PomodoroContext'; // Import PomodoroProvider
import { Toaster } from '@/components/ui/toaster';

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
    <html suppressHydrationWarning><body className={`${geistSans.variable} antialiased`}>
      <AuthProvider> 
        <FlashcardsProvider>
          <PomodoroProvider> {/* PomodoroProvider wraps the main content */}
            <div className="flex min-h-screen flex-col">
              {/* Header moved to [locale]/layout.tsx */}
              <main className="flex-1">{children}</main>
            </div>
            <Toaster />
          </PomodoroProvider>
        </FlashcardsProvider>
      </AuthProvider>
      </body></html>
  );
}
