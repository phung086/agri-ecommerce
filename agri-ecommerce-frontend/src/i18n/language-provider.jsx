"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { translateText } from "@/i18n/phrase-dictionary";

const STORAGE_KEY = "agrimarket_locale";
const DEFAULT_LOCALE = "vi";
const SUPPORTED_LOCALES = ["vi", "en"];
const DOCUMENT_TITLES = {
  en: "AgriMarket - Online agricultural marketplace",
  vi: "AgriMarket - S\u00e0n n\u00f4ng s\u1ea3n tr\u1ef1c tuy\u1ebfn",
};

const LanguageContext = createContext(null);

function normalizeLocale(value) {
  return SUPPORTED_LOCALES.includes(value) ? value : DEFAULT_LOCALE;
}

export function LanguageProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);
  const [hydrated, setHydrated] = useState(false);

  const setLocale = useCallback((nextLocale) => {
    setLocaleState(normalizeLocale(nextLocale));
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((current) => (current === "vi" ? "en" : "vi"));
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocaleState(normalizeLocale(window.localStorage.getItem(STORAGE_KEY)));
      setHydrated(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    document.documentElement.lang = locale;
    document.title = DOCUMENT_TITLES[locale] || DOCUMENT_TITLES.vi;
    window.localStorage.setItem(STORAGE_KEY, locale);
    window.dispatchEvent(
      new CustomEvent("agrimarket-language-changed", { detail: { locale } })
    );
  }, [hydrated, locale]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const desiredTitle = DOCUMENT_TITLES[locale] || DOCUMENT_TITLES.vi;

    function applyDocumentTitle() {
      if (document.title !== desiredTitle) {
        document.title = desiredTitle;
      }
    }

    applyDocumentTitle();

    const titleElement = document.querySelector("title");
    const observer = new MutationObserver(applyDocumentTitle);
    if (titleElement) {
      observer.observe(titleElement, { childList: true });
    }

    const frame = window.requestAnimationFrame(applyDocumentTitle);
    const timeout = window.setTimeout(applyDocumentTitle, 250);

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [hydrated, locale]);

  const value = useMemo(
    () => ({
      locale,
      isEnglish: locale === "en",
      setLocale,
      toggleLocale,
      t: (text) => translateText(text, locale),
    }),
    [locale, setLocale, toggleLocale]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}
