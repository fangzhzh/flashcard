import PageContainer from '@/components/PageContainer';
import ConcurrencyClient from './ConcurrencyClient';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getI18n } from '@/lib/i18n/server';

function ConcurrencyLoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default async function ConcurrencyPage() {
  const t = await getI18n();
  return (
    <PageContainer className="flex-1 flex flex-col overflow-hidden !p-0 !max-w-full h-[calc(100vh-4rem)]">
      <Suspense fallback={<ConcurrencyLoadingFallback />}>
        <ConcurrencyClient />
      </Suspense>
    </PageContainer>
  );
}
