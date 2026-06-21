import PageContainer from '@/components/PageContainer';
import LeetCodeClient from './LeetCodeClient';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LeetCode 刷题 | FlashCard',
  description: 'FAANG 面试算法题库，按类别练习，AI 代码评判，追踪熟悉度',
};

function LoadingFallback() {
  return (
    <div className="flex justify-center items-center min-h-[calc(100vh-4rem)]">
      <Loader2 className="h-10 w-10 animate-spin text-primary" />
    </div>
  );
}

export default function LeetCodePage() {
  return (
    <PageContainer className="flex-1 flex flex-col overflow-hidden !p-0 !max-w-full h-[calc(100vh-4rem)]">
      <Suspense fallback={<LoadingFallback />}>
        <LeetCodeClient />
      </Suspense>
    </PageContainer>
  );
}
