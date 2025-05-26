import PageContainer from '@/components/PageContainer';
import ReviewModeClient from './ReviewModeClient'; // Relative path updated

export default function ReviewPage() {
  return (
    <PageContainer className="max-w-4xl">
      <ReviewModeClient />
    </PageContainer>
  );
}
