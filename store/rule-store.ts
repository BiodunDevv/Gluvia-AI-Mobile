import { api } from "@/lib/api";
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
  fetchRules: () => Promise<void>;
  getRuleBySlug: (slug: string) => Promise<RuleTemplate | null>;
  clearCurrentRule: () => void;
}

export const useRuleStore = create<RuleState>((set) => ({
  rules: [],
  currentRule: null,
  isLoading: false,

  fetchRules: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get("/rules");
      const rulesData =
        response.data.data?.rules ||
        response.data.rules ||
        response.data.data ||
        [];
      set({
        rules: Array.isArray(rulesData) ? rulesData : [],
        isLoading: false,
      });
    } catch (error: any) {
      toast.error("Failed to fetch rules");
      set({ isLoading: false, rules: [] });
    }
  },

  getRuleBySlug: async (slug: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/rules/${slug}`);
      const rule = response.data.data;
      set({ currentRule: rule, isLoading: false });
      return rule;
    } catch (error: any) {
      toast.error("Failed to fetch rule details");
      set({ isLoading: false, currentRule: null });
      return null;
    }
  },

  clearCurrentRule: () => {
    set({ currentRule: null });
  },
}));
