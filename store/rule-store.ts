import { api } from "@/lib/api";
import {
  CachedRule,
  cacheRules,
  getCachedRuleBySlug,
  getCachedRules,
} from "@/lib/offline-db";
import { toast } from "@/lib/toast";
import { create } from "zustand";

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

// Convert RuleTemplate to cached format
function ruleToCached(rule: RuleTemplate): CachedRule {
  return {
    id: rule._id,
    slug: rule.slug,
    title: rule.title,
    type: rule.type,
    definition: rule.definition,
    nlTemplate: rule.nlTemplate,
    appliesTo: rule.appliesTo,
    deleted: rule.deleted,
    version: rule.version,
    createdBy: rule.createdBy,
    createdAt: rule.createdAt,
    updatedAt: rule.updatedAt,
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
      try {
        // Try API first
        const response = await api.get("/rules");
        const rulesData =
          response.data.data?.rules ||
          response.data.rules ||
          response.data.data ||
          [];
        const rules = Array.isArray(rulesData) ? rulesData : [];

        // Cache rules for offline use
        await cacheRules(rules.map(ruleToCached));

        set({
          rules,
          isLoading: false,
          isOffline: false,
        });
      } catch (apiError) {
        // Fallback to cached data
        console.log("API unavailable, using cached rules");
        const cachedRules = await getCachedRules();

        set({
          rules: cachedRules.map(cachedToRule),
          isLoading: false,
          isOffline: true,
        });
      }
    } catch (error: any) {
      toast.error("Failed to fetch rules");
      set({ isLoading: false, rules: [] });
    }
  },

  getRuleBySlug: async (slug: string) => {
    set({ isLoading: true });
    try {
      try {
        // Try API first
        const response = await api.get(`/rules/${slug}`);
        const rule = response.data.data;

        // Cache the rule
        await cacheRules([ruleToCached(rule)]);

        set({ currentRule: rule, isLoading: false, isOffline: false });
        return rule;
      } catch (apiError) {
        // Fallback to cached data
        const cachedRule = await getCachedRuleBySlug(slug);
        if (cachedRule) {
          const rule = cachedToRule(cachedRule);
          set({ currentRule: rule, isLoading: false, isOffline: true });
          return rule;
        }
        throw new Error("Rule not found");
      }
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
    // Sync all rules to cache for offline use
    set({ isLoading: true });
    try {
      const response = await api.get("/rules");
      const rulesData =
        response.data.data?.rules ||
        response.data.rules ||
        response.data.data ||
        [];
      const rules = Array.isArray(rulesData) ? rulesData : [];
      await cacheRules(rules.map(ruleToCached));
      set({ isLoading: false });
      toast.success(`Synced ${rules.length} rules for offline use`);
    } catch (error) {
      console.error("Error syncing rules:", error);
      set({ isLoading: false });
      toast.error("Failed to sync rules");
    }
  },
}));
