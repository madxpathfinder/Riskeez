import { en } from './en';
import { az } from './az';

export const translations = {
  en,
  az
};

export type Language = 'en' | 'az';
export type TranslationKey = typeof en;

export const getTranslation = (lang: Language) => translations[lang] || translations.en;
