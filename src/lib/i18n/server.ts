// src/lib/i18n/server.ts
import { createI18nServer } from 'next-international/server';

export const { getI18n, getScopedI18n, getCurrentLocale, getStaticParams } = createI18nServer({
  en: () => import('./locales/en'),
  zh: () => import('./locales/zh'),
});
