"use client";

import AiChatWidget from "@/components/AiChatWidget";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { LanguageProvider } from "@/i18n/language-provider";
import { LocalizedTextBoundary } from "@/i18n/localized-text-boundary";

export function I18nClientRoot({ children }) {
  return (
    <LanguageProvider>
      <LocalizedTextBoundary />
      {children}
      <AiChatWidget />
      <LanguageSwitcher />
    </LanguageProvider>
  );
}
