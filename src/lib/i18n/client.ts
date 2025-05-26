// src/lib/i18n/client.ts
'use client';
import { createI18nClient } from 'next-international/client';

export const { useI18n, useScopedI18n, I18nProviderClient, useChangeLocale, useCurrentLocale } = createI18nClient({
  en: () => import('./locales/en'),
  zh: () => import('./locales/zh'),
});
