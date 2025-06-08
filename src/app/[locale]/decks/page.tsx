
import PageContainer from '@/components/PageContainer';
import DecksClient from './DecksClient';
import { getI18n } from '@/lib/i18n/server';

export default async function ManageDecksPage() {
  const t = await getI18n();
  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t('decks.title')}</h1>
        {/* Button to create new deck will be inside DecksClient */}
      </div>
      <DecksClient />
    </PageContainer>
  );
}
