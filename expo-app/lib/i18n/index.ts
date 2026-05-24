import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import en from './en.json';
import de from './de.json';

const SUPPORTED_LANGS = ['en', 'de'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

function detectInitialLanguage(): SupportedLang {
  const locales = getLocales();
  const code = locales[0]?.languageCode ?? 'en';
  return (SUPPORTED_LANGS as readonly string[]).includes(code) ? (code as SupportedLang) : 'en';
}

void i18n
  .use(initReactI18next)
  .init({
    lng: detectInitialLanguage(),
    fallbackLng: 'en',
    supportedLngs: ['en', 'de'],
    resources: {
      en: { common: en.common, auth: en.auth, nav: en.nav },
      de: { common: de.common, auth: de.auth, nav: de.nav },
    },
    ns: ['common', 'auth', 'nav'],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false, // React handles escaping
    },
    pluralSeparator: '_',
    compatibilityJSON: 'v4', // Phase 2+ plural keys work without re-init
    react: {
      useSuspense: false, // CRITICAL: React Native does not support React Suspense (RESEARCH Pitfall 5)
    },
  });

export default i18n;
