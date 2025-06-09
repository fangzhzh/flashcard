
import PageContainer from '@/components/PageContainer';
import AuthClient from './AuthClient';
import { getI18n } from '@/lib/i18n/server';

export default async function AuthPage() {
  const t = await getI18n();
  return (
    <PageContainer className="max-w-md">
      <div className="flex flex-col items-center mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t('auth.pageTitle')}</h1>
      </div>
      <AuthClient />
    </PageContainer>
  );
}
