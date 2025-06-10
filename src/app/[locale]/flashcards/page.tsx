
import PageContainer from '@/components/PageContainer';
import FlashcardListClient from './FlashcardListClient';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Helper component for Suspense fallback
function FlashcardListLoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default async function ManageFlashcardsPage() {
  // Title and create button are now handled within FlashcardListClient
  return (
    <PageContainer>
      <Suspense fallback={<FlashcardListLoadingFallback />}>
        <FlashcardListClient />
      </Suspense>
    </PageContainer>
  );
}

    