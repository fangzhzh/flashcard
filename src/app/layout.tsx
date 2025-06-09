
import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Changed from Geist to Inter
import './globals.css';
// Removed FlashcardsProvider and AuthProvider from here
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({ // Changed from geistSans to inter
  variable: '--font-inter', // Changed variable name
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
    <html suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className={`${inter.variable} antialiased`}>
        <div className="flex min-h-screen flex-col">
          <main className="flex-1">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
