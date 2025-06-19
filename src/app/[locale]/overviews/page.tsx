
import PageContainer from '@/components/PageContainer';
import OverviewsClient from './OverviewsClient';
import { getI18n } from '@/lib/i18n/server';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

function OverviewsLoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default async function ManageOverviewsPage() {
  const t = await getI18n();
  return (
    <PageContainer>
      {/* Title is handled within OverviewsClient for dynamic display and button placement */}
      <Suspense fallback={<OverviewsLoadingFallback />}>
        <OverviewsClient />
      </Suspense>
    </PageContainer>
  );
}
