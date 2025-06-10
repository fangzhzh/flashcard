
import PageContainer from '@/components/PageContainer';
import ReviewModeClient from './ReviewModeClient'; 
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

// Helper component for Suspense fallback
function ReviewLoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default function ReviewPage() {
  return (
    <PageContainer className="max-w-4xl">
      <Suspense fallback={<ReviewLoadingFallback />}>
        <ReviewModeClient />
      </Suspense>
    </PageContainer>
  );
}

    