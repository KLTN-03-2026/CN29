import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import translationEN from './locales/en/translation.json';
import translationVI from './locales/vi/translation.json';

const LEGACY_LANGUAGE_KEY = 'jobfinder-language';
const DETECTOR_LANGUAGE_KEY = 'i18nextLng';

if (typeof window !== 'undefined') {
  const legacyLanguage = window.localStorage.getItem(LEGACY_LANGUAGE_KEY);
  const detectedLanguage = window.localStorage.getItem(DETECTOR_LANGUAGE_KEY);

  if (legacyLanguage && !detectedLanguage) {
    window.localStorage.setItem(DETECTOR_LANGUAGE_KEY, legacyLanguage);
  }
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: 'vi',
    fallbackLng: 'vi',
    supportedLngs: ['en', 'vi'],
    defaultNS: 'translation',
    debug: false,
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: DETECTOR_LANGUAGE_KEY,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
    returnNull: false,
    returnEmptyString: false,
    resources: {
      en: {
        translation: translationEN,
      },
      vi: {
        translation: translationVI,
      },
    },
  });

if (typeof document !== 'undefined') {
  document.documentElement.lang = i18n.resolvedLanguage || i18n.language || 'vi';
}

i18n.on('languageChanged', (language) => {
  if (typeof document !== 'undefined') {
    document.documentElement.lang = String(language || 'vi').slice(0, 2);
  }
});

export default i18n;