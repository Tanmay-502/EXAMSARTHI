'use client'

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { dictionaries, Lang } from './dictionaries';

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof dictionaries['en-IN']) => string;
  tParams: (key: keyof typeof dictionaries['en-IN'], params: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en-IN');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('examsarthi_lang') as Lang;
    if (savedLang && (savedLang === 'en-IN' || savedLang === 'hi-IN' || savedLang === 'te-IN')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLangState(savedLang);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      document.documentElement.lang = lang;
    }
  }, [lang, mounted]);

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('examsarthi_lang', newLang);
  };

  const t = (key: keyof typeof dictionaries['en-IN']) => dictionaries[lang][key] || key;
  
  const tParams = (key: keyof typeof dictionaries['en-IN'], params: Record<string, string | number>) => {
    let text = t(key);
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, 'g'), String(v));
    });
    return text;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t, tParams }}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {children}
      </div>
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
