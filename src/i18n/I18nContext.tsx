import React, { createContext, useContext, useState, useEffect } from 'react';
import { fr } from './fr.js';
import { en } from './en.js';

type Language = 'fr' | 'en';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: typeof fr;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('etsypilot_lang') as Language) || 'fr';
  });

  useEffect(() => {
    localStorage.setItem('etsypilot_lang', language);
  }, [language]);

  const t = language === 'fr' ? fr : en;

  return (
    <I18nContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
