/**
 * food-store
 *
 * Online-first: foods live in sync-store (server truth).
 * This store is a thin selector/search layer on top of sync-store.
 * It reads from the SQLite cache only when sync-store has nothing yet.
 * No separate network calls — sync-store owns all food fetching.
 */

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
      const syncedFoods = useSyncStore.getState().foods;

      if (syncedFoods.length > 0) {
        // Apply filters locally — no network needed
        let filteredFoods = syncedFoods.filter((f) => !f.deleted);

        if (mergedFilters.search) {
          const q = mergedFilters.search.toLowerCase();
          filteredFoods = filteredFoods.filter(
            (f) =>
              f.localName.toLowerCase().includes(q) ||
              f.canonicalName?.toLowerCase().includes(q)
          );
        }
        if (mergedFilters.category) {
          filteredFoods = filteredFoods.filter(
            (f) => f.category === mergedFilters.category
          );
        }
        if (mergedFilters.maxGI) {
          filteredFoods = filteredFoods.filter(
            (f) => f.nutrients.gi !== null && f.nutrients.gi <= mergedFilters.maxGI!
          );
        }
        if (mergedFilters.affordability) {
          filteredFoods = filteredFoods.filter(
            (f) => f.affordability === mergedFilters.affordability
          );
        }

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

      // sync-store empty — check SQLite cache
      const cachedCount = await getCachedFoodsCount();
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

        set({
          foods: append ? [...get().foods, ...cachedFoods.map(cachedToFood)] : cachedFoods.map(cachedToFood),
          pagination: {
            page,
            limit,
            total: cachedCount,
            totalPages: Math.ceil(cachedCount / limit),
          },
          filters: mergedFilters,
          isLoading: false,
          isOffline: true,
        });
        return;
      }

      // Nothing cached — trigger a full sync from the server
      await useSyncStore.getState().getFullSync();
      // Recurse once with same filters — sync-store now has data
      set({ isLoading: false });
      await get().fetchFoods(filters, append);
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
      const synced = useSyncStore.getState().foods.find((f) => f._id === id);
      if (synced) {
        set({ currentFood: synced, isLoading: false, isOffline: false });
        return synced;
      }

      const cached = await getCachedFoodById(id);
      if (cached) {
        const food = cachedToFood(cached);
        set({ currentFood: food, isLoading: false, isOffline: true });
        return food;
      }

      throw new Error("Food not found");
    } catch {
      toast.error("Failed to fetch food details");
      set({ isLoading: false, currentFood: null });
      return null;
    }
  },

  searchFoods: async (query: string) => {
    try {
      const syncedFoods = useSyncStore.getState().foods;
      const source = syncedFoods.length > 0
        ? syncedFoods.filter((f) => !f.deleted)
        : (await getCachedFoods({ search: query, limit: 10 })).map(cachedToFood);

      const q = query.toLowerCase();
      return source
        .filter(
          (f) =>
            f.localName.toLowerCase().includes(q) ||
            f.canonicalName?.toLowerCase().includes(q)
        )
        .slice(0, 10);
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
    set({ isLoading: true });
    try {
      await useSyncStore.getState().getFullSync();
      const foods = useSyncStore.getState().foods;
      set({ isLoading: false });
      toast.success(`Synced ${foods.length} foods`);
    } catch {
      set({ isLoading: false });
      toast.error("Failed to sync foods");
    }
  },
}));
