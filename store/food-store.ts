import { api } from "@/lib/api";
import {
  CachedFood,
  cacheFoods,
  getCachedFoodById,
  getCachedFoods,
  getCachedFoodsCount,
} from "@/lib/offline-db";
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
  isOffline: boolean;
  filters: FoodFilters;
  fetchFoods: (filters?: FoodFilters, append?: boolean) => Promise<void>;
  getFoodById: (id: string) => Promise<Food | null>;
  searchFoods: (query: string) => Promise<Food[]>;
  setFilters: (filters: FoodFilters) => void;
  clearFilters: () => void;
  clearCurrentFood: () => void;
  syncFoods: () => Promise<void>;
  resetFoods: () => void;
}

const defaultFilters: FoodFilters = {
  page: 1,
  limit: 20,
};

// Convert cached food to Food interface
function cachedToFood(cached: CachedFood): Food {
  return {
    _id: cached.id,
    localName: cached.localName,
    canonicalName: cached.canonicalName,
    category: cached.category,
    nutrients: cached.nutrients,
    portionSizes: cached.portionSizes,
    affordability: cached.affordability,
    tags: cached.tags,
    imageUrl: cached.imageUrl,
    regionVariants: cached.regionVariants,
    source: cached.source,
    version: cached.version,
    deleted: cached.deleted,
    createdAt: cached.createdAt,
    updatedAt: cached.updatedAt,
  };
}

// Convert API Food to cached format (handles _id from API)
function foodToCached(food: Food): CachedFood {
  return {
    id: food._id,
    localName: food.localName,
    canonicalName: food.canonicalName,
    category: food.category,
    nutrients: food.nutrients,
    portionSizes: food.portionSizes,
    affordability: food.affordability,
    tags: food.tags,
    imageUrl: food.imageUrl,
    regionVariants: food.regionVariants,
    source: food.source,
    version: food.version,
    deleted: food.deleted,
    createdAt: food.createdAt,
    updatedAt: food.updatedAt,
  };
}

// Export function to get all cached foods for offline recommendations
export async function getAllCachedFoodsForRecommendation(): Promise<Food[]> {
  const cachedFoods = await getCachedFoods();
  return cachedFoods.map(cachedToFood);
}

// Export Food type for use in other modules
export type { Food };

export const useFoodStore = create<FoodState>((set, get) => ({
  foods: [],
  currentFood: null,
  pagination: null,
  isLoading: false,
  isOffline: false,
  filters: defaultFilters,

  fetchFoods: async (filters = {}, append = false) => {
    set({ isLoading: true });
    try {
      const mergedFilters = { ...get().filters, ...filters };
      const params = new URLSearchParams();

      Object.entries(mergedFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, String(value));
        }
      });

      // Determine if we should append (for pagination) or replace
      const currentPage = mergedFilters.page || 1;
      const shouldAppend = append && currentPage > 1;

      try {
        // Try API first
        const response = await api.get(`/foods?${params.toString()}`);
        const newFoods = response.data.data || [];

        // Cache foods for offline use
        await cacheFoods(newFoods.map(foodToCached));

        set((state) => ({
          foods: shouldAppend ? [...state.foods, ...newFoods] : newFoods,
          pagination: response.data.pagination,
          filters: mergedFilters,
          isLoading: false,
          isOffline: false,
        }));
      } catch (apiError) {
        // Fallback to cached data
        console.log("API unavailable, using cached foods");
        const page = mergedFilters.page || 1;
        const limit = mergedFilters.limit || 20;
        const offset = (page - 1) * limit;

        const cachedFoods = await getCachedFoods({
          search: mergedFilters.search,
          category: mergedFilters.category,
          maxGI: mergedFilters.maxGI,
          affordability: mergedFilters.affordability,
          limit,
          offset,
        });

        const total = await getCachedFoodsCount();
        const newFoods = cachedFoods.map(cachedToFood);

        set((state) => ({
          foods: shouldAppend ? [...state.foods, ...newFoods] : newFoods,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          filters: mergedFilters,
          isLoading: false,
          isOffline: true,
        }));
      }
    } catch (error: any) {
      console.error("Error fetching foods:", error);
      toast.error("Failed to fetch foods");
      set({ isLoading: false, foods: [], pagination: null });
    }
  },

  resetFoods: () => {
    set({ foods: [], pagination: null, filters: defaultFilters });
  },

  getFoodById: async (id: string) => {
    set({ isLoading: true });
    try {
      try {
        // Try API first
        const response = await api.get(`/foods/${id}`);
        const food = response.data.data;

        // Cache the food
        await cacheFoods([foodToCached(food)]);

        set({ currentFood: food, isLoading: false, isOffline: false });
        return food;
      } catch (apiError) {
        // Fallback to cached data
        const cachedFood = await getCachedFoodById(id);
        if (cachedFood) {
          const food = cachedToFood(cachedFood);
          set({ currentFood: food, isLoading: false, isOffline: true });
          return food;
        }
        throw new Error("Food not found");
      }
    } catch (error: any) {
      toast.error("Failed to fetch food details");
      set({ isLoading: false, currentFood: null });
      return null;
    }
  },

  searchFoods: async (query: string) => {
    try {
      try {
        // Try API first
        const response = await api.get(
          `/foods?search=${encodeURIComponent(query)}&limit=10`
        );
        return response.data.data || [];
      } catch {
        // Fallback to cached data
        const cachedFoods = await getCachedFoods({ search: query, limit: 10 });
        return cachedFoods.map(cachedToFood);
      }
    } catch {
      return [];
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

  syncFoods: async () => {
    // Sync all foods to cache for offline use
    set({ isLoading: true });
    try {
      const response = await api.get(`/foods?limit=1000`);
      const foods = response.data.data || [];
      await cacheFoods(foods.map(foodToCached));
      set({ isLoading: false });
      toast.success(`Synced ${foods.length} foods for offline use`);
    } catch (error) {
      console.error("Error syncing foods:", error);
      set({ isLoading: false });
      toast.error("Failed to sync foods");
    }
  },
}));
