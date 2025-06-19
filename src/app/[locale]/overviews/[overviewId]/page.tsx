
import PageContainer from '@/components/PageContainer';
import OverviewDetailClient from './OverviewDetailClient';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getI18n } from '@/lib/i18n/server';

function OverviewDetailLoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default async function OverviewDetailPage({ params }: { params: { overviewId: string; locale: string } }) {
  const t = await getI18n();
  // The specific overview title will be fetched and displayed within OverviewDetailClient
  return (
    <PageContainer className="max-w-4xl">
      <Suspense fallback={<OverviewDetailLoadingFallback />}>
        <OverviewDetailClient overviewId={params.overviewId} />
      </Suspense>
    </PageContainer>
  );
}
