
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
  manifest: '/manifest.json', // Added manifest link
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
        {/* It's good practice to also link the manifest here, though Next.js 13+ handles it via metadata */}
        {/* <link rel="manifest" href="/manifest.json" /> */}
        <meta name="theme-color" content="#7E57C2" /> {/* Primary color */}
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" /> {/* Placeholder, replace with actual icon */}
      </head>
      <body className={`${inter.variable} antialiased`}>
        <div className="h-screen flex flex-col overflow-x-hidden"> {/* Changed min-h-screen to h-screen */}
          <main className="flex-1 flex flex-col overflow-hidden">{children}</main> {/* Added flex flex-col overflow-hidden */}
        </div>
        <Toaster />
      </body>
    </html>
  );
}

