import api from "@/lib/api";
import { create } from "zustand";

export interface AppSettings {
  supportPhone: string;
  googleFormLink: string;
}

interface AppSettingsState {
  settings: AppSettings | null;
  isLoading: boolean;
  fetchSettings: () => Promise<AppSettings | null>;
}

export const useAppSettingsStore = create<AppSettingsState>((set) => ({
  settings: null,
  isLoading: false,

  fetchSettings: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get("/user/app-settings");
      const settings = response.data?.data || null;
      set({ settings, isLoading: false });
      return settings;
    } catch {
      set({ isLoading: false });
      return null;
    }
  },
}));
