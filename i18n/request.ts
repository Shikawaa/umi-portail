import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

export const locales = routing.locales;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = routing.defaultLocale;
export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value as Locale);
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !isLocale(locale)) {
    locale = defaultLocale;
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
