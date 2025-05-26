import Link from 'next/link';
import PageContainer from '@/components/PageContainer';
import FlashcardListClient from './FlashcardListClient'; // Relative path updated
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { getI18n } from '@/lib/i18n/server';

export default async function ManageFlashcardsPage() {
  const t = await getI18n();
  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('flashcards.title')}</h1>
        <Link href="/flashcards/new" passHref>
          <Button className="w-full sm:w-auto text-base py-3">
            <PlusCircle className="mr-2 h-5 w-5" /> {t('flashcards.button.create')}
          </Button>
        </Link>
      </div>
      <FlashcardListClient />
    </PageContainer>
  );
}
