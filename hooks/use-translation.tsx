import React from "react";

import {
  SUPPORTED_LANGUAGES,
  SupportedLanguage,
  translateText,
} from "@/lib/translations";
import { translateDynamicText } from "@/lib/translator";
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
  const { language, t } = useTranslation();
  const [dynamicText, setDynamicText] = React.useState<string | null>(null);
  const sourceText = typeof children === "string" ? children : null;
  const translated = sourceText ? t(sourceText) : String(children);

  React.useEffect(() => {
    let cancelled = false;

    if (!sourceText || language === "english" || translated !== sourceText) {
      setDynamicText(null);
      return;
    }

    translateDynamicText(sourceText, language)
      .then((value) => {
        if (!cancelled) {
          setDynamicText(value === sourceText ? null : value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDynamicText(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [language, sourceText, translated]);

  return <>{sourceText ? dynamicText || translated : children}</>;
}

export type { SupportedLanguage };
