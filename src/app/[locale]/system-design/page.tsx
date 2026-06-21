import PageContainer from '@/components/PageContainer';
import SystemDesignClient from './SystemDesignClient';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'System Design Prep',
  description: 'Interactive system design mock interviews and capacity estimation calculators.',
};

export default function SystemDesignPage() {
  return (
    <PageContainer>
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <SystemDesignClient />
      </Suspense>
    </PageContainer>
  );
}
