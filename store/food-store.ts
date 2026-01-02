import { api } from "@/lib/api";
import { toast } from "@/lib/toast";
import { create } from "zustand";

interface Food {
  _id: string;
  localName: string;
  canonicalName?: string;
  category?: string;
  nutrients: {
    calories: number;
    carbs_g: number;
    protein_g: number;
    fat_g: number;
    fibre_g: number;
    gi: number | null;
  };
  portionSizes: Array<{
    name: string;
    grams: number;
    carbs_g?: number;
  }>;
  affordability?: "low" | "medium" | "high";
  tags?: string[];
  imageUrl?: string;
  regionVariants?: Array<{
    region: string;
    note: string;
  }>;
  source?: "manual" | "validated" | "estimated";
  version: number;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FoodPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FoodFilters {
  search?: string;
  tags?: string;
  maxGI?: number;
  category?: string;
  affordability?: string;
  page?: number;
  limit?: number;
}

interface FoodState {
  foods: Food[];
  currentFood: Food | null;
  pagination: FoodPagination | null;
  isLoading: boolean;
  filters: FoodFilters;
  fetchFoods: (filters?: FoodFilters) => Promise<void>;
  getFoodById: (id: string) => Promise<Food | null>;
  setFilters: (filters: FoodFilters) => void;
  clearFilters: () => void;
  clearCurrentFood: () => void;
}

const defaultFilters: FoodFilters = {
  page: 1,
  limit: 20,
};

export const useFoodStore = create<FoodState>((set, get) => ({
  foods: [],
  currentFood: null,
  pagination: null,
  isLoading: false,
  filters: defaultFilters,

  fetchFoods: async (filters = {}) => {
    set({ isLoading: true });
    try {
      const mergedFilters = { ...get().filters, ...filters };
      const params = new URLSearchParams();
      
      Object.entries(mergedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });

      const response = await api.get(`/foods?${params.toString()}`);

      set({
        foods: response.data.data,
        pagination: response.data.pagination,
        filters: mergedFilters,
        isLoading: false,
      });
    } catch (error: any) {
      toast.error("Failed to fetch foods");
      set({ isLoading: false, foods: [], pagination: null });
    }
  },

  getFoodById: async (id: string) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/foods/${id}`);
      const food = response.data.data;
      set({ currentFood: food, isLoading: false });
      return food;
    } catch (error: any) {
      toast.error("Failed to fetch food details");
      set({ isLoading: false, currentFood: null });
      return null;
    }
  },

  setFilters: (filters: FoodFilters) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  clearFilters: () => {
    set({ filters: defaultFilters });
  },

  clearCurrentFood: () => {
    set({ currentFood: null });
  },
}));
