
import PageContainer from '@/components/PageContainer';
import PomodoroClient from './PomodoroClient'; // Updated import path
import { getI18n } from '@/lib/i18n/server';

export default async function PomodoroAsDefaultPage() { // Renamed component
  const t = await getI18n();
  return (
    <PageContainer>
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('pomodoro.title')}</h1>
      </div>
      <PomodoroClient />
    </PageContainer>
  );
}

