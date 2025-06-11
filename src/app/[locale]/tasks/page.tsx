
import PageContainer from '@/components/PageContainer';
import TasksClient from './TasksClient';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { getI18n } from '@/lib/i18n/server';

function TasksLoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
    </div>
  );
}

export default async function TasksPage() {
  const t = await getI18n();
  // Title and create button will be handled within TasksClient
  return (
    <PageContainer>
      <Suspense fallback={<TasksLoadingFallback />}>
        <TasksClient />
      </Suspense>
    </PageContainer>
  );
}
