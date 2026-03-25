import React from "react";

import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  translateText,
} from "@/lib/translations";
import { useTranslationStore } from "@/store/translation-store";

export function useTranslation() {
  const language = useTranslationStore((state) => state.language);
  const hydrated = useTranslationStore((state) => state.hydrated);
  const setLanguage = useTranslationStore((state) => state.setLanguage);

  return {
    language,
    hydrated,
    setLanguage,
    languages: SUPPORTED_LANGUAGES,
    t: (text: string) => translateText(text, language),
  };
}

export function T({
  children,
}: {
  children: string | number;
}) {
  const { t } = useTranslation();

  if (typeof children === "number") {
    return <>{children}</>;
  }

  return <>{t(children)}</>;
}

export type { SupportedLanguage };
