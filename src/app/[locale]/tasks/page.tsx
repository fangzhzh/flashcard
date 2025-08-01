
import PageContainer from '@/components/PageContainer';
import TasksClient from './TasksClient'; // Changed to default import
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
    <PageContainer className="flex-1 flex flex-col overflow-hidden !p-0 !max-w-full">
      {/* 
        Applied special classes to PageContainer for TasksPage:
        - flex-1 flex flex-col: Makes it fill available vertical space from LocaleLayout.
        - overflow-hidden: Prevents this container itself from scrolling.
        - !p-0: Removes default padding from PageContainer (container, px, py).
        - !max-w-full: Removes the max-width constraint from PageContainer.
        This allows TasksClient to take full width and height.
      */}
      <Suspense fallback={<TasksLoadingFallback />}>
        <TasksClient /> {/* This now correctly renders the wrapper with the provider */}
      </Suspense>
    </PageContainer>
  );
}
