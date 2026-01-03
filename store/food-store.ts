import {
  CachedFood,
  getCachedFoodById,
  getCachedFoods,
  getCachedFoodsCount,
} from "@/lib/offline-db";
import { toast } from "@/lib/toast";
import { create } from "zustand";
import { useSyncStore } from "./sync-store";

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

      // Get foods from sync store first
      const syncedFoods = useSyncStore.getState().foods;
      console.log(`[FOOD-STORE] Synced foods count: ${syncedFoods.length}`);

      // If sync store has foods, use them directly
      if (syncedFoods.length > 0) {
        // Apply filters locally
        let filteredFoods = syncedFoods;
        if (mergedFilters.search) {
          const searchLower = mergedFilters.search.toLowerCase();
          filteredFoods = filteredFoods.filter(
            (f) =>
              f.localName.toLowerCase().includes(searchLower) ||
              f.canonicalName?.toLowerCase().includes(searchLower)
          );
        }
        if (mergedFilters.category) {
          filteredFoods = filteredFoods.filter(
            (f) => f.category === mergedFilters.category
          );
        }
        if (mergedFilters.maxGI) {
          filteredFoods = filteredFoods.filter(
            (f) =>
              f.nutrients.gi !== null && f.nutrients.gi <= mergedFilters.maxGI!
          );
        }
        if (mergedFilters.affordability) {
          filteredFoods = filteredFoods.filter(
            (f) => f.affordability === mergedFilters.affordability
          );
        }

        // Pagination
        const page = mergedFilters.page || 1;
        const limit = mergedFilters.limit || 20;
        const start = (page - 1) * limit;
        const paginatedFoods = filteredFoods.slice(start, start + limit);

        set({
          foods: append ? [...get().foods, ...paginatedFoods] : paginatedFoods,
          pagination: {
            page,
            limit,
            total: filteredFoods.length,
            totalPages: Math.ceil(filteredFoods.length / limit),
          },
          filters: mergedFilters,
          isLoading: false,
          isOffline: false,
        });
        return;
      }

      // If sync store is empty, check cache
      const cachedCount = await getCachedFoodsCount();
      console.log(`[FOOD-STORE] Cached foods count: ${cachedCount}`);

      // If cache has data, use cached data
      if (cachedCount > 0) {
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

        const total = cachedCount;
        const newFoods = cachedFoods.map(cachedToFood);

        set({
          foods: append ? [...get().foods, ...newFoods] : newFoods,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          filters: mergedFilters,
          isLoading: false,
          isOffline: true,
        });
        return;
      }

      // No data available - user needs to sync first
      console.log(
        "[FOOD-STORE] No cached data available. User needs to sync first."
      );
      set({
        foods: [],
        pagination: null,
        filters: mergedFilters,
        isLoading: false,
        isOffline: true,
      });
    } catch (error) {
      console.error("Error fetching foods:", error);
      toast.error("Failed to load foods");
      set({ isLoading: false });
    }
  },

  resetFoods: () => {
    set({ foods: [], pagination: null, filters: defaultFilters });
  },

  getFoodById: async (id: string) => {
    set({ isLoading: true });
    try {
      // First check sync store
      const syncedFoods = useSyncStore.getState().foods;
      let food = syncedFoods.find((f) => f._id === id);

      if (food) {
        set({ currentFood: food, isLoading: false, isOffline: false });
        return food;
      }

      // Fallback to cached data
      const cachedFood = await getCachedFoodById(id);
      if (cachedFood) {
        food = cachedToFood(cachedFood);
        set({ currentFood: food, isLoading: false, isOffline: true });
        return food;
      }

      throw new Error("Food not found");
    } catch (error: any) {
      toast.error("Failed to fetch food details");
      set({ isLoading: false, currentFood: null });
      return null;
    }
  },

  searchFoods: async (query: string) => {
    try {
      // Get foods from sync store
      const syncedFoods = useSyncStore.getState().foods;

      // If sync store is empty, check cache
      if (syncedFoods.length === 0) {
        const cachedFoods = await getCachedFoods({ search: query, limit: 10 });
        return cachedFoods.map(cachedToFood);
      }

      // Search in synced foods
      const queryLower = query.toLowerCase();
      const results = syncedFoods
        .filter(
          (f) =>
            f.localName.toLowerCase().includes(queryLower) ||
            f.canonicalName?.toLowerCase().includes(queryLower)
        )
        .slice(0, 10);

      return results;
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
    // Trigger sync store's full sync
    set({ isLoading: true });
    try {
      await useSyncStore.getState().getFullSync();
      const foods = useSyncStore.getState().foods;
      set({ isLoading: false });
      toast.success(`Synced ${foods.length} foods for offline use`);
    } catch (error) {
      console.error("Error syncing foods:", error);
      set({ isLoading: false });
      toast.error("Failed to sync foods");
    }
  },
}));
