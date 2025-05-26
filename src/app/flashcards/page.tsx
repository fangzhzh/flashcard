import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import FlashcardListClient from './FlashcardListClient';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function ManageFlashcardsPage() {
  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Your Flashcards</h1>
        <Link href="/flashcards/new" passHref>
          <Button className="w-full sm:w-auto text-base py-3">
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Card
          </Button>
        </Link>
      </div>
      <FlashcardListClient />
    </PageContainer>
  );
}
