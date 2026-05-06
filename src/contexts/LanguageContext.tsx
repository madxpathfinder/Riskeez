import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, getTranslation } from '../i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: any; // Type-safe translation accessor would be better but keeping it simple for deep keys
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('riskeez_language');
    return (saved as Language) || 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('riskeez_language', lang);
  };

  // Helper to access nested keys like 'navigation.dashboard'
  const t = (path: string, params?: Record<string, string | number>) => {
    const dict = getTranslation(language);
    const keys = path.split('.');
    let result: any = dict;
    
    for (const key of keys) {
      if (result && typeof result === 'object' && result[key]) {
        result = result[key];
      } else {
        // Fallback sequence: 
        // 1. Try English dictionary for the same key
        const engDict = translations.en;
        let engResult: any = engDict;
        let foundInEng = true;
        for (const engKey of keys) {
          if (engResult && typeof engResult === 'object' && engResult[engKey]) {
            engResult = engResult[engKey];
          } else {
            foundInEng = false;
            break;
          }
        }

        if (foundInEng && typeof engResult === 'string') {
          result = engResult;
          break;
        }

        // 2. Convert key to readable text if absolutely missing
        const lastSegments = keys[keys.length - 1];
        const humanReadable = lastSegments
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (str) => str.toUpperCase())
          .trim();
        return humanReadable;
      }
    }

    if (typeof result === 'string' && params) {
      Object.entries(params).forEach(([key, value]) => {
        result = result.replace(`{{${key}}}`, String(value));
      });
    }

    return typeof result === 'string' ? result : path;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
