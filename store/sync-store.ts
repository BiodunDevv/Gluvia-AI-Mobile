/**
 * Sync Store
 *
 * Handles synchronization of data with the server:
 * - Full sync for initial load (foods + rules)
 * - Delta updates to check for changes
 * - Meal and glucose log uploads
 * - Aggregations for user's logged data
 */

import { api } from "@/lib/api";
import {
  cacheFoods,
  cacheRules,
  clearAllCachedData,
  clearFoodsCache,
  clearRulesCache,
  getPendingGlucoseLogs,
  getPendingMealLogs,
  markGlucoseLogsSynced,
  markMealLogsSynced,
  savePendingGlucoseLog,
  savePendingMealLog,
} from "@/lib/offline-db";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

// ============ TYPES ============

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export type GlucoseUnit = "mg/dL" | "mmol/L";

export type GlucoseReadingType =
  | "fasting"
  | "before_meal"
  | "after_meal"
  | "bedtime"
  | "random"
  | "2hr_post_meal";

export type GlucoseSymptom =
  | "dizzy"
  | "shaky"
  | "sweaty"
  | "tired"
  | "hungry"
  | "thirsty"
  | "blurred_vision"
  | "none";

// Food type from API
export interface Food {
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

// Rule type from API
export interface RuleTemplate {
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
  createdAt: string;
  updatedAt: string;
}

// Meal log for upload
export interface MealLogFood {
  foodId: string;
  portionSize: string;
  quantity: number;
  localName?: string;
  canonicalName?: string;
  category?: string;
}

export interface MealLog {
  clientGeneratedId: string;
  timestamp: string;
  mealType?: MealType;
  foods: MealLogFood[];
  notes?: string;
  totalCalories?: number;
  totalCarbs?: number;
  totalProtein?: number;
  totalFat?: number;
}

// Glucose log for upload
export interface GlucoseLog {
  clientGeneratedId: string;
  timestamp: string;
  value: number;
  unit: GlucoseUnit;
  type: GlucoseReadingType;
  notes?: string;
  mealRelated?: boolean;
  mealLogId?: string;
  symptoms?: GlucoseSymptom[];
}

// Upload responses
export interface UploadMealLogsResponse {
  success: boolean;
  message: string;
  results: {
    added: number;
    duplicates: number;
    errors: Array<string | { clientGeneratedId?: string; error: string; code?: string }>;
  };
}

export interface UploadGlucoseLogsResponse {
  success: boolean;
  message: string;
  results: {
    added: number;
    duplicates: number;
    errors: string[];
  };
}

// Full sync response - returns all foods and rules
export interface FullSyncResponse {
  success: boolean;
  serverVersion: number;
  foods: Food[];
  rules: RuleTemplate[];
}

// Delta updates response - returns changed items since clientVersion
export interface DeltaUpdatesResponse {
  success: boolean;
  serverVersion: number;
  clientVersion: number;
  foodsChanged: Food[];
  rulesChanged: RuleTemplate[];
}

// Aggregation types - match actual API response
export interface AggregationFilters {
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface MealEntry {
  foodId: {
    _id: string;
    localName: string;
    category: string;
  };
  portionName: string;
  portionSize: string;
  grams: number;
  quantity: number;
  carbs_g: number;
}

export interface AggregatedMealLog {
  _id: string;
  userId: string;
  mealType: MealType;
  entries: MealEntry[];
  calculatedTotals: {
    calories: number;
    carbs: number;
    protein: number;
    fibre: number;
  };
  timestamp: string;
  clientGeneratedId: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AggregatedGlucoseLog {
  _id: string;
  userId: string;
  valueMgDl: number;
  unit: GlucoseUnit;
  type: GlucoseReadingType;
  clientGeneratedId: string;
  timestamp: string;
  notes?: string;
  mealRelated?: boolean;
  symptoms?: GlucoseSymptom[];
  createdAt: string;
  updatedAt: string;
}

export interface AggregationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AggregationsResponse {
  success: boolean;
  mealLogs: AggregatedMealLog[];
  glucoseLogs: AggregatedGlucoseLog[];
  meta: {
    meals: AggregationMeta;
    glucose: AggregationMeta;
  };
}

export interface AggregationSnapshot {
  key: string;
  filters: AggregationFilters;
  mealLogs: AggregatedMealLog[];
  glucoseLogs: AggregatedGlucoseLog[];
  lastGlucoseReading: AggregatedGlucoseLog | null;
  glucoseStats: GlucoseStats | null;
  mealStats: MealStats | null;
  meta: AggregationsResponse["meta"];
  fetchedAt: number;
}

export interface GlucoseStats {
  average: number;
  min: number;
  max: number;
  count: number;
  inRange: number;
  inRangePercent: number;
  unit: string;
}

export interface MealStats {
  totalMeals: number;
  totalCalories: number;
  totalCarbs: number;
  averageCarbs: number;
  averageCalories: number;
}

export interface SyncState {
  // State
  clientVersion: number;
  serverVersion: number;
  lastSyncAt: string | null;
  isSyncing: boolean;
  isUploading: boolean;
  isFetchingAggregations: boolean;
  aggregationsLoadedOnce: boolean;
  aggregationsInvalidatedAt: number;
  pendingMealLogs: MealLog[];
  pendingGlucoseLogs: GlucoseLog[];
  syncError: string | null;
  isOnline: boolean;

  // Synced data (foods & rules)
  foods: Food[];
  rules: RuleTemplate[];

  // Aggregated user data from server
  mealLogs: AggregatedMealLog[];
  glucoseLogs: AggregatedGlucoseLog[];
  lastGlucoseReading: AggregatedGlucoseLog | null;
  glucoseStats: GlucoseStats | null;
  mealStats: MealStats | null;
  aggregationSnapshots: Record<string, AggregationSnapshot>;

  // Actions
  uploadMealLogs: (mealLogs: MealLog[]) => Promise<UploadMealLogsResponse>;
  uploadGlucoseLogs: (
    glucoseLogs: GlucoseLog[]
  ) => Promise<UploadGlucoseLogsResponse>;
  logGlucoseReading: (
    log: Omit<GlucoseLog, "clientGeneratedId">,
    userId: string
  ) => Promise<void>;
  logMeal: (
    log: Omit<MealLog, "clientGeneratedId">,
    userId: string
  ) => Promise<void>;
  getFullSync: () => Promise<FullSyncResponse>;
  getDeltaUpdates: () => Promise<DeltaUpdatesResponse>;
  checkAndApplyUpdates: () => Promise<{
    hasChanges: boolean;
    foodsUpdated: number;
    rulesUpdated: number;
  }>;
  getAggregations: (
    filters?: AggregationFilters,
    options?: { force?: boolean; ttlMs?: number }
  ) => Promise<AggregationsResponse>;
  invalidateAggregations: () => void;
  addPendingMealLog: (log: MealLog) => void;
  addPendingGlucoseLog: (log: GlucoseLog) => void;
  clearPendingLogs: () => void;
  syncPendingLogs: (userId: string) => Promise<void>;
  loadPendingLogsFromDB: (userId: string) => Promise<void>;
  initializeClientVersion: () => Promise<void>;
  initializeFromCache: () => Promise<void>;
  clearAllDataAndReset: () => Promise<void>;
  isFirstTimeSync: () => boolean;
  setOnlineStatus: (isOnline: boolean) => void;
  setClientVersion: (version: number) => void;
  resetSyncState: () => void;
}

// ============ HELPERS ============

/**
 * Generate a unique client ID for logs
 * Format: {type}_{timestamp}_{random}
 */
export function generateClientId(type: "meal" | "glucose"): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${type}_${timestamp}_${random}`;
}

/**
 * Convert Food to cached format for offline-db
 */
function foodToCached(food: Food) {
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

/**
 * Convert RuleTemplate to cached format for offline-db
 */
function ruleToCached(rule: RuleTemplate) {
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

/**
 * Persist client version to AsyncStorage
 */
async function saveClientVersion(version: number) {
  try {
    await AsyncStorage.setItem("@sync_client_version", version.toString());
  } catch (error) {
    console.error("Failed to save client version:", error);
  }
}

/**
 * Load client version from AsyncStorage
 */
async function loadClientVersion(): Promise<number> {
  try {
    const value = await AsyncStorage.getItem("@sync_client_version");
    return value ? parseInt(value, 10) : 0;
  } catch (error) {
    console.error("Failed to load client version:", error);
    return 0;
  }
}

function getApiErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    fallback
  );
}

function parseSyncPayload<T>(
  responseData: any,
  key: string,
  fallback: T
): T {
  return (responseData?.data?.[key] ?? responseData?.[key] ?? fallback) as T;
}

async function hasAuthenticatedSyncSession() {
  const { useAuthStore } = await import("@/store/auth-store");
  const authState = useAuthStore.getState();

  return Boolean(
    authState.hasCheckedAuth &&
      authState.isAuthenticated &&
      authState.token &&
      authState.user?._id
  );
}

function isAuthError(error: any) {
  return error?.response?.status === 401 || error?.response?.status === 403;
}

function normalizeAggregationFilters(
  filters?: AggregationFilters
): AggregationFilters {
  return {
    from: filters?.from,
    to: filters?.to,
    page: filters?.page ?? 1,
    limit: filters?.limit ?? 50,
  };
}

export function getAggregationWindowKey(filters?: AggregationFilters) {
  const normalized = normalizeAggregationFilters(filters);
  return JSON.stringify(normalized);
}

function calculateAggregationSnapshot(
  filters: AggregationFilters,
  result: AggregationsResponse
): AggregationSnapshot {
  const sortedGlucose = [...(result.glucoseLogs || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const lastGlucoseReading = sortedGlucose[0] || null;

  let glucoseStats: GlucoseStats | null = null;
  if (sortedGlucose.length > 0) {
    const values = sortedGlucose.map((g) => g.valueMgDl);
    const inRangeCount = values.filter((v) => v >= 70 && v <= 180).length;
    glucoseStats = {
      average: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length,
      inRange: inRangeCount,
      inRangePercent: Math.round((inRangeCount / values.length) * 100),
      unit: "mg/dL",
    };
  }

  let mealStats: MealStats | null = null;
  if (result.mealLogs && result.mealLogs.length > 0) {
    const totalCarbs = result.mealLogs.reduce(
      (sum, m) => sum + (m.calculatedTotals?.carbs || 0),
      0
    );
    const totalCalories = result.mealLogs.reduce(
      (sum, m) => sum + (m.calculatedTotals?.calories || 0),
      0
    );
    mealStats = {
      totalMeals: result.mealLogs.length,
      totalCalories,
      totalCarbs,
      averageCarbs: totalCarbs / result.mealLogs.length,
      averageCalories: totalCalories / result.mealLogs.length,
    };
  }

  return {
    key: getAggregationWindowKey(filters),
    filters,
    mealLogs: result.mealLogs || [],
    glucoseLogs: result.glucoseLogs || [],
    lastGlucoseReading,
    glucoseStats,
    mealStats,
    meta: result.meta,
    fetchedAt: Date.now(),
  };
}

function buildAggregationsResponseFromSnapshot(
  snapshot: AggregationSnapshot
): AggregationsResponse {
  return {
    success: true,
    mealLogs: snapshot.mealLogs,
    glucoseLogs: snapshot.glucoseLogs,
    meta: snapshot.meta,
  };
}

// ============ STORE ============

export const useSyncStore = create<SyncState>((set, get) => ({
  // Initial state
  clientVersion: 0,
  serverVersion: 0,
  lastSyncAt: null,
  isSyncing: false,
  isUploading: false,
  isFetchingAggregations: false,
  aggregationsLoadedOnce: false,
  aggregationsInvalidatedAt: 0,
  pendingMealLogs: [],
  pendingGlucoseLogs: [],
  syncError: null,
  isOnline: true,

  // Synced data
  foods: [],
  rules: [],

  // Aggregated data
  mealLogs: [],
  glucoseLogs: [],
  lastGlucoseReading: null,
  glucoseStats: null,
  mealStats: null,
  aggregationSnapshots: {},

  /**
   * Upload meal logs to the server
   * Endpoint: POST /sync/meals
   */
  uploadMealLogs: async (mealLogs: MealLog[]) => {
    set({ isUploading: true, syncError: null });

    try {
      const response = await api.post("/sync/meals", { mealLogs });
      const results = response.data?.data || response.data?.results || {
        added: 0,
        duplicates: 0,
        errors: [],
      };

      const uploadErrors = Array.isArray(results.errors) ? results.errors : [];

      if (uploadErrors.length > 0 && (results.added || 0) === 0) {
        const firstError = uploadErrors[0];
        const message =
          typeof firstError === "string"
            ? firstError
            : firstError?.error || "Meal upload failed";
        throw new Error(message);
      }

      set({
        isUploading: false,
        lastSyncAt: new Date().toISOString(),
        aggregationsInvalidatedAt: Date.now(),
      });

      return {
        success: Boolean(response.data?.success),
        message:
          response.data?.message ||
          `${results.added || 0} meal(s) logged successfully`,
        results,
      };
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(
        error,
        "Failed to upload meal logs"
      );
      set({ isUploading: false, syncError: errorMessage });
      throw error;
    }
  },

  /**
   * Upload glucose logs to the server
   * Endpoint: POST /sync/glucose
   */
  uploadGlucoseLogs: async (glucoseLogs: GlucoseLog[]) => {
    set({ isUploading: true, syncError: null });

    try {
      const response = await api.post("/sync/glucose", { glucoseLogs });
      const results = response.data?.data || response.data?.results || {
        added: 0,
        duplicates: 0,
        errors: [],
      };

      set({
        isUploading: false,
        lastSyncAt: new Date().toISOString(),
        aggregationsInvalidatedAt: Date.now(),
      });

      return {
        success: Boolean(response.data?.success),
        message:
          response.data?.message ||
          `${results.added || 0} glucose reading(s) logged successfully`,
        results,
      };
    } catch (error: any) {
      const errorMessage = getApiErrorMessage(
        error,
        "Failed to upload glucose logs"
      );
      set({ isUploading: false, syncError: errorMessage });
      throw error;
    }
  },

  /**
   * Log a glucose reading - saves offline if needed, syncs when online
   */
  logGlucoseReading: async (
    log: Omit<GlucoseLog, "clientGeneratedId">,
    userId: string
  ) => {
    const clientGeneratedId = generateClientId("glucose");
    const glucoseLog: GlucoseLog = { ...log, clientGeneratedId };

    // Convert to mg/dL if needed for optimistic update
    const valueMgDl =
      log.unit === "mmol/L" ? Math.round(log.value * 18.0182) : log.value;

    // Optimistic update - immediately update lastGlucoseReading in the UI
    const optimisticReading: AggregatedGlucoseLog = {
      _id: clientGeneratedId, // Temporary ID until server responds
      userId,
      valueMgDl,
      unit: log.unit,
      type: log.type,
      clientGeneratedId,
      timestamp: log.timestamp,
      notes: log.notes,
      mealRelated: log.mealRelated,
      symptoms: log.symptoms,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Immediately update the store with optimistic data
    set((state) => {
      const updatedSnapshots: Record<string, AggregationSnapshot> = {};

      for (const [key, snapshot] of Object.entries(state.aggregationSnapshots)) {
        const snapshotFrom = snapshot.filters.from
          ? new Date(snapshot.filters.from).getTime()
          : Number.NEGATIVE_INFINITY;
        const snapshotTo = snapshot.filters.to
          ? new Date(snapshot.filters.to).getTime()
          : Number.POSITIVE_INFINITY;
        const readingTime = new Date(log.timestamp).getTime();

        if (readingTime < snapshotFrom || readingTime > snapshotTo) {
          updatedSnapshots[key] = snapshot;
          continue;
        }

        const nextGlucoseLogs = [optimisticReading, ...snapshot.glucoseLogs]
          .filter(
            (reading, index, array) =>
              array.findIndex((candidate) => candidate._id === reading._id) ===
              index
          )
          .sort(
            (left, right) =>
              new Date(right.timestamp).getTime() -
              new Date(left.timestamp).getTime()
          );

        updatedSnapshots[key] = calculateAggregationSnapshot(snapshot.filters, {
          success: true,
          mealLogs: snapshot.mealLogs,
          glucoseLogs: nextGlucoseLogs,
          meta: snapshot.meta,
        });
      }

      return {
        lastGlucoseReading: optimisticReading,
        aggregationSnapshots: updatedSnapshots,
        aggregationsInvalidatedAt: Date.now(),
      };
    });

    // Save to offline DB immediately
    try {
      await savePendingGlucoseLog({
        ...glucoseLog,
        userId,
      });
    } catch (err) {
      console.error("Failed to save glucose log offline:", err);
    }

    // Try to upload if online
    const { isOnline } = get();
    if (isOnline) {
      try {
        await get().uploadGlucoseLogs([glucoseLog]);
        // Mark as synced in DB
        await markGlucoseLogsSynced([clientGeneratedId]);
        // Invalidate all cached snapshots then force-refresh with history page params
        get().invalidateAggregations();
        await get().getAggregations({ page: 1, limit: 200 }, { force: true });
      } catch (err) {
        // If upload fails, log will remain in pending DB
        console.error("Failed to upload glucose log, will retry later:", err);
      }
    }
  },

  /**
   * Log a meal - saves offline if needed, syncs when online
   */
  logMeal: async (log: Omit<MealLog, "clientGeneratedId">, userId: string) => {
    const clientGeneratedId = generateClientId("meal");
    const mealLog: MealLog = { ...log, clientGeneratedId };

    const optimisticMealLog: AggregatedMealLog = {
      _id: clientGeneratedId,
      userId,
      mealType: mealLog.mealType || "snack",
      entries: mealLog.foods.map((food) => ({
        foodId: {
          _id: food.foodId,
          localName: food.localName || food.canonicalName || "Meal item",
          category: food.category || "Food",
        },
        portionName: food.portionSize,
        portionSize: food.portionSize,
        grams: 0,
        quantity: food.quantity,
        carbs_g: 0,
      })),
      calculatedTotals: {
        calories: mealLog.totalCalories || 0,
        carbs: mealLog.totalCarbs || 0,
        protein: mealLog.totalProtein || 0,
        fibre: 0,
      },
      timestamp: mealLog.timestamp,
      clientGeneratedId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    set((state) => {
      const updatedSnapshots: Record<string, AggregationSnapshot> = {};

      for (const [key, snapshot] of Object.entries(state.aggregationSnapshots)) {
        const snapshotFrom = snapshot.filters.from
          ? new Date(snapshot.filters.from).getTime()
          : Number.NEGATIVE_INFINITY;
        const snapshotTo = snapshot.filters.to
          ? new Date(snapshot.filters.to).getTime()
          : Number.POSITIVE_INFINITY;
        const mealTime = new Date(mealLog.timestamp).getTime();

        if (mealTime < snapshotFrom || mealTime > snapshotTo) {
          updatedSnapshots[key] = snapshot;
          continue;
        }

        const nextMealLogs = [optimisticMealLog, ...snapshot.mealLogs]
          .filter(
            (meal, index, array) =>
              array.findIndex((candidate) => candidate._id === meal._id) === index
          )
          .sort(
            (left, right) =>
              new Date(right.timestamp).getTime() -
              new Date(left.timestamp).getTime()
          );

        updatedSnapshots[key] = calculateAggregationSnapshot(snapshot.filters, {
          success: true,
          mealLogs: nextMealLogs,
          glucoseLogs: snapshot.glucoseLogs,
          meta: snapshot.meta,
        });
      }

      return {
        aggregationSnapshots: updatedSnapshots,
        aggregationsInvalidatedAt: Date.now(),
      };
    });

    // Save to offline DB immediately
    try {
      await savePendingMealLog({
        clientGeneratedId: mealLog.clientGeneratedId,
        userId,
        mealType: mealLog.mealType || "snack",
        foods: mealLog.foods,
        notes: mealLog.notes,
        timestamp: mealLog.timestamp,
      });
    } catch (err) {
      console.error("Failed to save meal log offline:", err);
    }

    // Try to upload if online
    const { isOnline } = get();
    if (isOnline) {
      try {
        const uploadResult = await get().uploadMealLogs([mealLog]);
        if (uploadResult.results.errors?.length) {
          throw new Error("Meal upload returned validation errors");
        }
        // Mark as synced in DB
        await markMealLogsSynced([clientGeneratedId]);
        // Invalidate all cached snapshots so history page re-fetches fresh data
        get().invalidateAggregations();
        await get().getAggregations({ page: 1, limit: 200 }, { force: true });
      } catch (err) {
        // If upload fails, log will remain in pending DB
        console.error("Failed to upload meal log, will retry later:", err);
      }
    }
  },

  /**
   * Get full sync data - complete foods and rules
   * Used for first-time sync or force refresh
   * Endpoint: GET /sync/full
   */
  getFullSync: async () => {
    if (!(await hasAuthenticatedSyncSession())) {
      const { clientVersion, foods, rules } = get();
      return {
        success: false,
        serverVersion: clientVersion,
        foods,
        rules,
      };
    }

    set({ isSyncing: true, syncError: null });

    try {
      console.log("[SYNC] Starting full sync...");
      const response = await api.get("/sync/full");
      const apiResponse = response.data;

      const foods = parseSyncPayload<Food[]>(apiResponse, "foods", []);
      const rules = parseSyncPayload<RuleTemplate[]>(apiResponse, "rules", []);
      const serverVersion =
        apiResponse?.data?.serverVersion ??
        apiResponse?.meta?.serverVersion ??
        apiResponse?.serverVersion ??
        0;

      console.log(
        `[SYNC] Full sync received: ${foods.length} foods, ${rules.length} rules, serverVersion: ${serverVersion}`
      );

      // Cache foods and rules for offline use
      if (foods.length > 0) {
        await clearFoodsCache();
        await cacheFoods(foods.map(foodToCached));
        console.log(`[SYNC] Cached ${foods.length} foods`);
      }

      if (rules.length > 0) {
        await clearRulesCache();
        await cacheRules(rules.map(ruleToCached));
        console.log(`[SYNC] Cached ${rules.length} rules`);
      }

      // Persist client version
      await saveClientVersion(serverVersion);
      console.log(`[SYNC] Client version saved: ${serverVersion}`);

      set({
        foods,
        rules,
        serverVersion,
        clientVersion: serverVersion,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
      });

      return {
        success: Boolean(apiResponse.success),
        serverVersion,
        foods,
        rules,
      };
    } catch (error: any) {
      if (isAuthError(error)) {
        set({ isSyncing: false, syncError: null });
        return {
          success: false,
          serverVersion: get().clientVersion,
          foods: get().foods,
          rules: get().rules,
        };
      }

      const errorMessage = getApiErrorMessage(
        error,
        "Failed to get full sync data"
      );
      set({ isSyncing: false, syncError: errorMessage });
      throw error;
    }
  },

  /**
   * Get delta updates since client version
   * Returns arrays of changed foods and rules
   * Endpoint: GET /sync/updates?clientVersion=X
   */
  getDeltaUpdates: async () => {
    if (!(await hasAuthenticatedSyncSession())) {
      const { clientVersion } = get();
      return {
        success: false,
        serverVersion: clientVersion,
        clientVersion,
        foodsChanged: [],
        rulesChanged: [],
      };
    }

    set({ isSyncing: true, syncError: null });

    try {
      const { clientVersion } = get();
      console.log(`[SYNC] Checking for updates since version ${clientVersion}`);

      const response = await api.get("/sync/updates", {
        params: { clientVersion },
      });

      const resultData = response.data?.data || response.data;
      const result: DeltaUpdatesResponse & {
        requiresFullSync?: boolean;
        reason?: string;
      } = {
        success: Boolean(response.data?.success),
        serverVersion:
          resultData?.serverVersion ?? response.data?.serverVersion ?? 0,
        clientVersion:
          resultData?.clientVersion ??
          response.data?.clientVersion ??
          clientVersion,
        foodsChanged:
          resultData?.foodsChanged ?? response.data?.foodsChanged ?? [],
        rulesChanged:
          resultData?.rulesChanged ?? response.data?.rulesChanged ?? [],
        requiresFullSync:
          resultData?.requiresFullSync ?? response.data?.requiresFullSync,
        reason: resultData?.reason ?? response.data?.reason,
      };

      console.log(
        `[SYNC] Delta update received: ${result.foodsChanged?.length || 0} foods changed, ${result.rulesChanged?.length || 0} rules changed, serverVersion: ${result.serverVersion}`
      );

      if (result.requiresFullSync) {
        set({
          serverVersion: result.serverVersion,
          isSyncing: false,
          lastSyncAt: new Date().toISOString(),
        });

        return result;
      }

      // Persist client version
      await saveClientVersion(result.serverVersion);
      console.log(`[SYNC] Client version updated to: ${result.serverVersion}`);

      // Update both server version and client version to match
      // Client version should match server version after getting updates
      set({
        serverVersion: result.serverVersion,
        clientVersion: result.serverVersion,
        isSyncing: false,
        lastSyncAt: new Date().toISOString(),
      });

      return result;
    } catch (error: any) {
      if (isAuthError(error)) {
        const { clientVersion } = get();
        set({ isSyncing: false, syncError: null });
        return {
          success: false,
          serverVersion: clientVersion,
          clientVersion,
          foodsChanged: [],
          rulesChanged: [],
        };
      }

      const errorMessage = getApiErrorMessage(error, "Failed to get updates");
      set({ isSyncing: false, syncError: errorMessage });
      throw error;
    }
  },

  /**
   * Check for updates and apply them to the store
   * Returns info about what changed
   * If no data exists yet, triggers a full sync automatically
   */
  checkAndApplyUpdates: async () => {
    const { getDeltaUpdates, getFullSync, foods, rules, clientVersion } = get();

    try {
      if (!(await hasAuthenticatedSyncSession())) {
        return { hasChanges: false, foodsUpdated: 0, rulesUpdated: 0 };
      }

      // If no data exists, do a full sync instead of delta
      if (clientVersion === 0 || (foods.length === 0 && rules.length === 0)) {
        console.log(
          "[SYNC] No existing data - performing full sync instead of delta"
        );
        const fullResult = await getFullSync();
        return {
          hasChanges: true,
          foodsUpdated: fullResult.foods.length,
          rulesUpdated: fullResult.rules.length,
        };
      }

      const updates = await getDeltaUpdates();

      if ((updates as any).requiresFullSync) {
        console.log(
          `[SYNC] Server requested full sync: ${(updates as any).reason || "unknown_reason"}`
        );
        const fullResult = await getFullSync();
        return {
          hasChanges: true,
          foodsUpdated: fullResult.foods.length,
          rulesUpdated: fullResult.rules.length,
        };
      }

      let foodsUpdated = 0;
      let rulesUpdated = 0;

      // Apply food changes
      if (updates.foodsChanged && updates.foodsChanged.length > 0) {
        const updatedFoods = [...foods];

        for (const changedFood of updates.foodsChanged) {
          const existingIndex = updatedFoods.findIndex(
            (f) => f._id === changedFood._id
          );

          if (changedFood.deleted) {
            // Remove deleted food
            if (existingIndex !== -1) {
              updatedFoods.splice(existingIndex, 1);
              foodsUpdated++;
            }
          } else if (existingIndex !== -1) {
            // Update existing food
            updatedFoods[existingIndex] = changedFood;
            foodsUpdated++;
          } else {
            // Add new food
            updatedFoods.push(changedFood);
            foodsUpdated++;
          }
        }

        await clearFoodsCache();
        await cacheFoods(updatedFoods.map(foodToCached));

        set({ foods: updatedFoods });
      }

      // Apply rule changes
      if (updates.rulesChanged && updates.rulesChanged.length > 0) {
        const updatedRules = [...rules];

        for (const changedRule of updates.rulesChanged) {
          const existingIndex = updatedRules.findIndex(
            (r) => r._id === changedRule._id
          );

          if (changedRule.deleted) {
            // Remove deleted rule
            if (existingIndex !== -1) {
              updatedRules.splice(existingIndex, 1);
              rulesUpdated++;
            }
          } else if (existingIndex !== -1) {
            // Update existing rule
            updatedRules[existingIndex] = changedRule;
            rulesUpdated++;
          } else {
            // Add new rule
            updatedRules.push(changedRule);
            rulesUpdated++;
          }
        }

        await clearRulesCache();
        await cacheRules(updatedRules.map(ruleToCached));

        set({ rules: updatedRules });
      }

      // clientVersion is already updated by getDeltaUpdates

      return {
        hasChanges: foodsUpdated > 0 || rulesUpdated > 0,
        foodsUpdated,
        rulesUpdated,
      };
    } catch (error) {
      if (isAuthError(error)) {
        return { hasChanges: false, foodsUpdated: 0, rulesUpdated: 0 };
      }

      console.error("Failed to check and apply updates:", error);
      return { hasChanges: false, foodsUpdated: 0, rulesUpdated: 0 };
    }
  },

  /**
   * Get user's aggregated meal and glucose data
   * Supports date filtering and pagination
   * Endpoint: GET /sync/aggregations
   */
  getAggregations: async (
    filters?: AggregationFilters,
    options?: { force?: boolean; ttlMs?: number }
  ) => {
    const normalizedFilters = normalizeAggregationFilters(filters);
    const cacheKey = getAggregationWindowKey(normalizedFilters);
    const ttlMs = options?.ttlMs ?? 120000;
    const cachedSnapshot = get().aggregationSnapshots[cacheKey];

    try {
      const invalidatedAt = get().aggregationsInvalidatedAt;

      if (
        cachedSnapshot &&
        !options?.force &&
        cachedSnapshot.fetchedAt >= invalidatedAt &&
        Date.now() - cachedSnapshot.fetchedAt < ttlMs
      ) {
        set({
          mealLogs: cachedSnapshot.mealLogs,
          glucoseLogs: cachedSnapshot.glucoseLogs,
          lastGlucoseReading: cachedSnapshot.lastGlucoseReading,
          glucoseStats: cachedSnapshot.glucoseStats,
          mealStats: cachedSnapshot.mealStats,
          isFetchingAggregations: false,
          aggregationsLoadedOnce: true,
        });

        return buildAggregationsResponseFromSnapshot(cachedSnapshot);
      }

      set({ isFetchingAggregations: true, syncError: null });

      const params: Record<string, any> = {};
      if (normalizedFilters.from) params.from = normalizedFilters.from;
      if (normalizedFilters.to) params.to = normalizedFilters.to;
      if (normalizedFilters.page) params.page = normalizedFilters.page;
      if (normalizedFilters.limit) params.limit = normalizedFilters.limit;

      const response = await api.get("/sync/aggregations", { params });
      const resultData = response.data?.data || response.data;
      const result: AggregationsResponse = {
        success: Boolean(response.data?.success),
        mealLogs: resultData?.mealLogs || response.data?.mealLogs || [],
        glucoseLogs: resultData?.glucoseLogs || response.data?.glucoseLogs || [],
        meta: response.data?.meta || {
          meals: { page: 1, limit: 50, total: 0, totalPages: 0 },
          glucose: { page: 1, limit: 50, total: 0, totalPages: 0 },
        },
      };

      const snapshot = calculateAggregationSnapshot(normalizedFilters, result);

      set({
        mealLogs: snapshot.mealLogs,
        glucoseLogs: snapshot.glucoseLogs,
        lastGlucoseReading: snapshot.lastGlucoseReading,
        glucoseStats: snapshot.glucoseStats,
        mealStats: snapshot.mealStats,
        aggregationsLoadedOnce: true,
        aggregationSnapshots: {
          ...get().aggregationSnapshots,
          [snapshot.key]: snapshot,
        },
        isFetchingAggregations: false,
      });

      return result;
    } catch (error: any) {
      if (cachedSnapshot) {
        set({
          mealLogs: cachedSnapshot.mealLogs,
          glucoseLogs: cachedSnapshot.glucoseLogs,
          lastGlucoseReading: cachedSnapshot.lastGlucoseReading,
          glucoseStats: cachedSnapshot.glucoseStats,
          mealStats: cachedSnapshot.mealStats,
          isFetchingAggregations: false,
          aggregationsLoadedOnce: true,
        });

        return buildAggregationsResponseFromSnapshot(cachedSnapshot);
      }

      const errorMessage = getApiErrorMessage(
        error,
        "Failed to get aggregations"
      );
      set({ isFetchingAggregations: false, syncError: errorMessage });
      throw error;
    }
  },

  invalidateAggregations: () => {
    set({ aggregationsInvalidatedAt: Date.now() });
  },

  /**
   * Add a meal log to pending queue for batch upload
   */
  addPendingMealLog: (log: MealLog) => {
    set((state) => ({
      pendingMealLogs: [...state.pendingMealLogs, log],
    }));
  },

  /**
   * Add a glucose log to pending queue for batch upload
   */
  addPendingGlucoseLog: (log: GlucoseLog) => {
    set((state) => ({
      pendingGlucoseLogs: [...state.pendingGlucoseLogs, log],
    }));
  },

  /**
   * Clear all pending logs (after successful sync)
   */
  clearPendingLogs: () => {
    set({
      pendingMealLogs: [],
      pendingGlucoseLogs: [],
    });
  },

  /**
   * Sync all pending logs to server from offline DB
   */
  syncPendingLogs: async (userId: string) => {
    try {
      // Load pending logs from DB
      const pendingGlucose = await getPendingGlucoseLogs(userId);
      const pendingMeals = await getPendingMealLogs(userId);

      if (pendingGlucose.length === 0 && pendingMeals.length === 0) {
        return;
      }

      // Upload glucose logs if any
      if (pendingGlucose.length > 0) {
        const glucoseLogs: GlucoseLog[] = pendingGlucose.map((log) => ({
          clientGeneratedId: log.clientGeneratedId,
          timestamp: log.timestamp,
          value: log.value,
          unit: log.unit as GlucoseUnit,
          type: log.type as GlucoseReadingType,
          notes: log.notes,
          mealRelated: log.mealRelated,
          mealLogId: log.mealLogId,
          symptoms: log.symptoms as GlucoseSymptom[],
        }));

        await get().uploadGlucoseLogs(glucoseLogs);
        await markGlucoseLogsSynced(
          glucoseLogs.map((l) => l.clientGeneratedId)
        );
      }

      // Upload meal logs if any
      if (pendingMeals.length > 0) {
        const mealLogs: MealLog[] = pendingMeals.map((log) => ({
          clientGeneratedId: log.clientGeneratedId,
          timestamp: log.timestamp,
          mealType: log.mealType as MealType,
          foods: log.foods,
          notes: log.notes,
        }));

        const uploadResult = await get().uploadMealLogs(mealLogs);
        const failedIds = new Set(
          (uploadResult.results.errors || [])
            .map((error) =>
              typeof error === "string" ? undefined : error.clientGeneratedId
            )
            .filter(Boolean)
        );
        const syncedMealIds = mealLogs
          .map((meal) => meal.clientGeneratedId)
          .filter((id) => !failedIds.has(id));
        if (syncedMealIds.length > 0) {
          await markMealLogsSynced(syncedMealIds);
        }
      }

      // Refresh aggregations with the same key used by history page
      get().invalidateAggregations();
      await get().getAggregations({ page: 1, limit: 200 }, { force: true });
    } catch (error) {
      // Logs remain in pending DB for retry
      console.error("Failed to sync pending logs:", error);
      throw error;
    }
  },

  /**
   * Load pending logs from DB into state
   */
  loadPendingLogsFromDB: async (userId: string) => {
    try {
      const pendingGlucose = await getPendingGlucoseLogs(userId);
      const pendingMeals = await getPendingMealLogs(userId);

      const glucoseLogs: GlucoseLog[] = pendingGlucose.map((log) => ({
        clientGeneratedId: log.clientGeneratedId,
        timestamp: log.timestamp,
        value: log.value,
        unit: log.unit as GlucoseUnit,
        type: log.type as GlucoseReadingType,
        notes: log.notes,
        mealRelated: log.mealRelated,
        mealLogId: log.mealLogId,
        symptoms: log.symptoms as GlucoseSymptom[],
      }));

      const mealLogs: MealLog[] = pendingMeals.map((log) => ({
        clientGeneratedId: log.clientGeneratedId,
        timestamp: log.timestamp,
        mealType: log.mealType as MealType,
        foods: log.foods,
        notes: log.notes,
      }));

      set({
        pendingGlucoseLogs: glucoseLogs,
        pendingMealLogs: mealLogs,
      });
    } catch (error) {
      console.error("Failed to load pending logs from DB:", error);
    }
  },

  /**
   * Initialize client version from AsyncStorage on app start
   */
  initializeClientVersion: async () => {
    const storedVersion = await loadClientVersion();
    if (storedVersion > 0) {
      set({ clientVersion: storedVersion });
      console.log(
        `[SYNC] Loaded client version from storage: ${storedVersion}`
      );
    }
  },

  /**
   * Initialize sync store from cached data if empty, then trigger a
   * background delta-sync to pick up any server changes since last session.
   */
  initializeFromCache: async () => {
    const { foods, rules } = get();

    if (foods.length === 0 || rules.length === 0) {
      console.log("[SYNC] Loading data from cache...");

      try {
        const { getCachedFoods, getCachedRules } =
          await import("@/lib/offline-db");

        if (foods.length === 0) {
          const cachedFoods = await getCachedFoods({ limit: 10000 });
          if (cachedFoods.length > 0) {
            const foodsArray = cachedFoods.map((cached: any) => ({
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
            }));
            set({ foods: foodsArray });
            console.log(`[SYNC] Loaded ${foodsArray.length} foods from cache`);
          }
        }

        if (rules.length === 0) {
          const cachedRules = await getCachedRules();
          if (cachedRules.length > 0) {
            const rulesArray = cachedRules.map((cached: any) => ({
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
            }));
            set({ rules: rulesArray });
            console.log(`[SYNC] Loaded ${rulesArray.length} rules from cache`);
          }
        }
      } catch (error) {
        console.error("[SYNC] Failed to load from cache:", error);
      }
    }

    // Background delta-sync to pick up any server-side changes since last session.
    // Runs after cache is hydrated so the UI has instant data while the update
    // applies silently in the background.
    if (get().isOnline) {
      get().checkAndApplyUpdates().catch((err) => {
        console.warn("[SYNC] Background delta check failed:", err);
      });
    }
  },

  /**
   * Set online status.
   * Returns whether the device just came back online so callers can react.
   */
  setOnlineStatus: (isOnline: boolean) => {
    set({ isOnline });
  },

  /**
   * Set client version and persist it
   */
  setClientVersion: async (version: number) => {
    await saveClientVersion(version);
    set({ clientVersion: version });
  },

  /**
   * Check if this is a first-time sync (no data cached)
   */
  isFirstTimeSync: () => {
    const { clientVersion, foods, rules } = get();
    return clientVersion === 0 && foods.length === 0 && rules.length === 0;
  },

  /**
   * Clear all cached data and reset sync state
   * Used when user wants to force a fresh sync
   */
  clearAllDataAndReset: async () => {
    console.log("[SYNC] Clearing all cached data...");

    // Clear database
    await clearAllCachedData();

    // Clear AsyncStorage version
    await saveClientVersion(0);

    // Reset sync state
    set({
      clientVersion: 0,
      serverVersion: 0,
      lastSyncAt: null,
      isSyncing: false,
      isUploading: false,
      isFetchingAggregations: false,
      aggregationsLoadedOnce: false,
      aggregationsInvalidatedAt: 0,
      pendingMealLogs: [],
      pendingGlucoseLogs: [],
      syncError: null,
      foods: [],
      rules: [],
      mealLogs: [],
      glucoseLogs: [],
      lastGlucoseReading: null,
      glucoseStats: null,
      mealStats: null,
      aggregationSnapshots: {},
    });

    console.log("[SYNC] All data cleared and reset complete");
  },

  /**
   * Reset sync state (used on logout)
   */
  resetSyncState: async () => {
    await saveClientVersion(0);
    set({
      clientVersion: 0,
      serverVersion: 0,
      lastSyncAt: null,
      isSyncing: false,
      isUploading: false,
      isFetchingAggregations: false,
      aggregationsLoadedOnce: false,
      aggregationsInvalidatedAt: 0,
      pendingMealLogs: [],
      pendingGlucoseLogs: [],
      syncError: null,
      foods: [],
      rules: [],
      mealLogs: [],
      glucoseLogs: [],
      lastGlucoseReading: null,
      glucoseStats: null,
      mealStats: null,
      aggregationSnapshots: {},
    });
  },
}));

// ============ HOOKS ============

/**
 * Hook to get the last glucose reading value (in mg/dL)
 */
export function useLastGlucoseValue(): number | undefined {
  const lastGlucoseReading = useSyncStore((state) => state.lastGlucoseReading);
  return lastGlucoseReading?.valueMgDl;
}

export function useNetworkOffline() {
  return useSyncStore((state) => !state.isOnline);
}

export function useAggregationSnapshot(filters?: AggregationFilters) {
  return useSyncStore(
    (state) => state.aggregationSnapshots[getAggregationWindowKey(filters)]
  );
}

/**
 * Hook to get glucose stats
 */
export function useGlucoseStats() {
  return useSyncStore((state) => state.glucoseStats);
}

/**
 * Hook to get meal stats
 */
export function useMealStats() {
  return useSyncStore((state) => state.mealStats);
}
