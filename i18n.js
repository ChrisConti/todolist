import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'expo-localization';
import translations from './translations.json';

const resources = {
  en: { translation: translations.en },
  fr: { translation: translations.fr },
  es: { translation: translations.es },
};

const fallbackLanguage = 'fr'; // Fallback language in case detection fails
const supportedLanguages = ['en', 'fr', 'es'];

const detectLanguage = () => {
  const locales = RNLocalize.getLocales();
  if (locales && locales.length > 0) {
    const detectedLanguage = locales[0].languageCode;
    if (supportedLanguages.includes(detectedLanguage)) {
      console.log(`Detected Language: ${detectedLanguage}`); // Log the detected language
      return detectedLanguage;
    }
  }
  console.log(`Fallback Language: ${fallbackLanguage}`); // Log fallback language
  return fallbackLanguage;
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: detectLanguage(),
    fallbackLng: fallbackLanguage,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

export default i18n;
