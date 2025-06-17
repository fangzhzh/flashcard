
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'FlashFlow',
  description: 'Master your studies with AI-powered flashcards and Pomodoro timer.',
  manifest: '/manifest.json',
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
        <meta name="theme-color" content="#7E57C2" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={`${inter.variable} antialiased min-h-screen flex flex-col`}>
        <div className="flex-1 flex flex-col"> {/* Wrapper to allow main to take remaining space */}
          <main className="flex-1 flex flex-col">{children}</main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
