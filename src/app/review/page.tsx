import PageContainer from '@/components/PageContainer';
import ReviewModeClient from './ReviewModeClient';

export default function ReviewPage() {
  return (
    <PageContainer className="max-w-4xl">
      {/* Removed explicit title as ReviewModeClient handles its own states */}
      <ReviewModeClient />
    </PageContainer>
  );
}
