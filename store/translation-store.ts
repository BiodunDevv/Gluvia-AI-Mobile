import { create } from "zustand";

import { SupportedLanguage, normalizeLanguage } from "@/lib/translations";

interface TranslationState {
  language: SupportedLanguage;
  hydrated: boolean;
  initializeLanguage: (preferredLanguage?: string | null) => Promise<void>;
  setLanguage: (language: SupportedLanguage) => Promise<void>;
}

export const useTranslationStore = create<TranslationState>((set) => ({
  language: "english",
  hydrated: false,

  initializeLanguage: async (preferredLanguage) => {
    const resolvedLanguage = normalizeLanguage(preferredLanguage);

    set({
      language: resolvedLanguage,
      hydrated: true,
    });
  },

  setLanguage: async (language) => {
    const normalized = normalizeLanguage(language);
    set({ language: normalized, hydrated: true });
  },
}));
