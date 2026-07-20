import { createI18n } from 'vue-i18n';
import en from '@/locales/en';
import pt from '@/locales/pt';

// Automatically detect browser language
const getBrowserLanguage = (): string => {
  if (typeof navigator !== 'undefined') {
    const lang = navigator.language || (navigator as any).userLanguage;
    if (lang && lang.toLowerCase().startsWith('pt')) {
      return 'pt';
    }
  }
  return 'en';
};

const i18n = createI18n({
  legacy: false, // Set to false to support Composition API
  locale: getBrowserLanguage(),
  fallbackLocale: 'en',
  messages: {
    en,
    pt,
  },
});

export default i18n;
