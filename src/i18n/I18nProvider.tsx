import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSettings, saveSettings } from '../storage';
import {
  Language,
  LocalizedMessage,
  TranslationKey,
  TranslationValues,
  resolveLocalizedMessage,
  translate,
} from './messages';

interface I18nContextValue {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, values?: TranslationValues) => string;
  resolveMessage: (message: LocalizedMessage | undefined, fallback: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => getSettings().language ?? 'zh');

  const setLanguage = useCallback((nextLanguage: Language) => {
    setLanguageState(nextLanguage);
    saveSettings({ language: nextLanguage });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((current) => {
      const nextLanguage = current === 'zh' ? 'en' : 'zh';
      saveSettings({ language: nextLanguage });
      return nextLanguage;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, values?: TranslationValues) => translate(language, key, values),
    [language],
  );

  const resolveMessage = useCallback(
    (message: LocalizedMessage | undefined, fallback: string) =>
      resolveLocalizedMessage(language, message, fallback),
    [language],
  );

  useEffect(() => {
    document.documentElement.lang = language === 'zh' ? 'zh-CN' : 'en';
    document.title = t('app.title');
  }, [language, t]);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage, t, resolveMessage }),
    [language, resolveMessage, setLanguage, t, toggleLanguage],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
