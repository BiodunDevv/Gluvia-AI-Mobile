/**
 * rule-store
 *
 * Online-first: rules live in sync-store (server truth).
 * This store is a thin selector layer on top of sync-store.
 * Falls back to SQLite cache when sync-store is empty.
 * No separate network calls — sync-store owns all rule fetching.
 */

import {
  CachedRule,
  getCachedRuleBySlug,
  getCachedRules,
} from "@/lib/offline-db";
import { toast } from "@/lib/toast";
import { create } from "zustand";
import { useSyncStore } from "./sync-store";

interface RuleTemplate {
  _id: string;
  slug: string;
  title: string;
  type:
    | "constraint"
    | "scoring"
    | "substitution"
    | "portion_adjustment"
    | "alert";
  definition: Record<string, any>;
  nlTemplate?: string;
  appliesTo?: string[];
  deleted: boolean;
  version: number;
  createdBy?: string;
  __v?: number;
  createdAt: string;
  updatedAt: string;
}

interface RuleState {
  rules: RuleTemplate[];
  currentRule: RuleTemplate | null;
  isLoading: boolean;
  isOffline: boolean;
  fetchRules: () => Promise<void>;
  getRuleBySlug: (slug: string) => Promise<RuleTemplate | null>;
  clearCurrentRule: () => void;
  syncRules: () => Promise<void>;
}

function cachedToRule(cached: CachedRule): RuleTemplate {
  return {
    _id: cached.id,
    slug: cached.slug,
    title: cached.title,
    type: cached.type,
    definition: cached.definition,
    nlTemplate: cached.nlTemplate,
    appliesTo: cached.appliesTo,
    deleted: cached.deleted,
    version: cached.version,
    createdBy: cached.createdBy,
    createdAt: cached.createdAt,
    updatedAt: cached.updatedAt,
  };
}

export const useRuleStore = create<RuleState>((set) => ({
  rules: [],
  currentRule: null,
  isLoading: false,
  isOffline: false,

  fetchRules: async () => {
    set({ isLoading: true });
    try {
      const syncedRules = useSyncStore.getState().rules;

      if (syncedRules.length > 0) {
        set({ rules: syncedRules, isLoading: false, isOffline: false });
        return;
      }

      // sync-store empty — check SQLite cache
      const cachedRules = await getCachedRules();
      if (cachedRules.length > 0) {
        set({ rules: cachedRules.map(cachedToRule), isLoading: false, isOffline: true });
        return;
      }

      // Nothing cached — trigger a full sync
      await useSyncStore.getState().getFullSync();
      const freshRules = useSyncStore.getState().rules;
      set({ rules: freshRules, isLoading: false, isOffline: false });
    } catch {
      toast.error("Failed to load rules. Please check your connection.");
      set({ isLoading: false });
    }
  },

  getRuleBySlug: async (slug: string) => {
    set({ isLoading: true });
    try {
      const synced = useSyncStore.getState().rules.find((r) => r.slug === slug);
      if (synced) {
        set({ currentRule: synced, isLoading: false, isOffline: false });
        return synced;
      }

      const cached = await getCachedRuleBySlug(slug);
      if (cached) {
        const rule = cachedToRule(cached);
        set({ currentRule: rule, isLoading: false, isOffline: true });
        return rule;
      }

      throw new Error("Rule not found");
    } catch {
      toast.error("Failed to fetch rule details");
      set({ isLoading: false, currentRule: null });
      return null;
    }
  },

  clearCurrentRule: () => {
    set({ currentRule: null });
  },

  syncRules: async () => {
    set({ isLoading: true });
    try {
      await useSyncStore.getState().getFullSync();
      const rules = useSyncStore.getState().rules;
      set({ rules, isLoading: false });
      toast.success(`Synced ${rules.length} rules`);
    } catch {
      set({ isLoading: false });
      toast.error("Failed to sync rules");
    }
  },
}));
