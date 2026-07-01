"use client";

import { Languages } from "lucide-react";

import { useLanguage } from "@/i18n/language-provider";

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage();

  return (
    <div
      data-no-translate
      className="fixed bottom-5 left-5 z-50 flex items-center gap-1 rounded-[8px] border border-emerald-100 bg-white/95 p-1 text-xs font-black text-slate-700 shadow-lg shadow-emerald-950/10 backdrop-blur"
      aria-label="Language switcher"
    >
      <span className="flex size-8 items-center justify-center rounded-[8px] bg-emerald-50 text-emerald-700">
        <Languages className="size-4" />
      </span>
      {[
        { value: "vi", label: "VI" },
        { value: "en", label: "EN" },
      ].map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => setLocale(item.value)}
          className={`h-8 rounded-[8px] px-3 transition ${
            locale === item.value
              ? "bg-emerald-700 text-white shadow-sm"
              : "text-slate-500 hover:bg-emerald-50 hover:text-emerald-800"
          }`}
          aria-pressed={locale === item.value}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
