import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import ProgressDashboard from '@/components/ProgressDashboard';
import { Button } from '@/components/ui/button';
import { Layers, Review, PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  return (
    <PageContainer>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Welcome to FlashFlow</h1>
        
        <ProgressDashboard />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/flashcards/new" passHref>
            <Button size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
              <PlusCircle className="mr-3 h-6 w-6" /> Create New Card
            </Button>
          </Link>
          <Link href="/flashcards" passHref>
            <Button variant="secondary" size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
              <Layers className="mr-3 h-6 w-6" /> Manage Cards
            </Button>
          </Link>
          <Link href="/review" passHref>
            <Button variant="outline" size="lg" className="w-full py-8 text-lg shadow-md hover:shadow-lg transition-shadow">
              <Review className="mr-3 h-6 w-6" /> Start Review
            </Button>
          </Link>
        </div>
        
        <div className="mt-12 p-6 bg-card border rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">How to use FlashFlow</h2>
          <p className="text-muted-foreground">
            1. <span className="font-medium text-foreground">Create flashcards</span> for topics you want to study.
            <br />
            2. <span className="font-medium text-foreground">Review your cards</span> regularly. The app uses a smart algorithm to schedule reviews.
            <br />
            3. <span className="font-medium text-foreground">Track your progress</span> on the dashboard and see how many cards you've mastered!
          </p>
        </div>

      </div>
    </PageContainer>
  );
}
