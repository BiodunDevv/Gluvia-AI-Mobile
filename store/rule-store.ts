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

// Convert cached rule to RuleTemplate interface
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
      // Get rules from sync store first
      const syncedRules = useSyncStore.getState().rules;

      // If sync store is empty, check cache
      if (syncedRules.length === 0) {
        const cachedRules = await getCachedRules();

        // If cache is also empty, trigger a full sync
        if (cachedRules.length === 0) {
          try {
            await useSyncStore.getState().getFullSync();
            // After sync, get the rules from sync store
            const freshRules = useSyncStore.getState().rules;

            set({
              rules: freshRules,
              isLoading: false,
              isOffline: false,
            });
            return;
          } catch (syncError) {
            console.error("Failed to sync:", syncError);
            toast.error("Failed to load rules. Please check your connection.");
            set({ isLoading: false });
            return;
          }
        }

        // Use cached data
        set({
          rules: cachedRules.map(cachedToRule),
          isLoading: false,
          isOffline: true,
        });
        return;
      }

      // Use synced rules
      set({
        rules: syncedRules,
        isLoading: false,
        isOffline: false,
      });
    } catch (error: any) {
      toast.error("Failed to fetch rules");
      set({ isLoading: false, rules: [] });
    }
  },

  getRuleBySlug: async (slug: string) => {
    set({ isLoading: true });
    try {
      // First check sync store
      const syncedRules = useSyncStore.getState().rules;
      let rule = syncedRules.find((r) => r.slug === slug);

      if (rule) {
        set({ currentRule: rule, isLoading: false, isOffline: false });
        return rule;
      }

      // Fallback to cached data
      const cachedRule = await getCachedRuleBySlug(slug);
      if (cachedRule) {
        rule = cachedToRule(cachedRule);
        set({ currentRule: rule, isLoading: false, isOffline: true });
        return rule;
      }

      throw new Error("Rule not found");
    } catch (error: any) {
      toast.error("Failed to fetch rule details");
      set({ isLoading: false, currentRule: null });
      return null;
    }
  },

  clearCurrentRule: () => {
    set({ currentRule: null });
  },

  syncRules: async () => {
    // Trigger sync store's full sync
    set({ isLoading: true });
    try {
      await useSyncStore.getState().getFullSync();
      const rules = useSyncStore.getState().rules;
      set({ rules, isLoading: false });
      toast.success(`Synced ${rules.length} rules for offline use`);
    } catch (error) {
      console.error("Error syncing rules:", error);
      set({ isLoading: false });
      toast.error("Failed to sync rules");
    }
  },
}));
