export interface OfflineUserProfile {
  age?: number;
  sex?: "male" | "female" | "other";
  heightCm?: number;
  weightKg?: number;
  bmi?: number;
  diabetesType?: "type1" | "type2" | "prediabetes" | "unknown";
  activityLevel?: "low" | "moderate" | "high";
  allergies?: string[];
  incomeBracket?: "low" | "middle" | "high";
  language?: string;
  profileImage?: {
    public_id?: string;
    secure_url?: string;
  };
}

export interface OfflineUser {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  role: string;
  deleted: boolean;
  profile?: OfflineUserProfile;
  consent: {
    accepted: boolean;
    timestamp?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CachedFood {
  id: string;
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

export interface CachedRule {
  id: string;
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

export interface PendingProfileUpdate {
  id: number;
  userId: string;
  updateData: Record<string, any>;
  createdAt: string;
  synced: boolean;
}

export interface MealHistoryEntry {
  id: number;
  userId: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack";
  foodIds: string[];
  totalCalories?: number;
  totalCarbs?: number;
  totalProtein?: number;
  totalFat?: number;
  notes?: string;
  createdAt: string;
}

export interface PendingGlucoseLog {
  id?: number;
  clientGeneratedId: string;
  userId: string;
  value: number;
  unit: string;
  type: string;
  timestamp: string;
  notes?: string;
  mealRelated?: boolean;
  mealLogId?: string;
  symptoms?: string[];
  synced?: boolean;
  createdAt: string;
}

export interface PendingMealLog {
  id?: number;
  clientGeneratedId: string;
  userId: string;
  mealType: string;
  foods: Array<{
    foodId: string;
    portionSize: string;
    quantity: number;
    localName?: string;
    canonicalName?: string;
    category?: string;
  }>;
  notes?: string;
  timestamp: string;
  synced?: boolean;
  createdAt: string;
}

const webState: {
  session: { user: OfflineUser; token: string; expiresAt: string } | null;
  foods: CachedFood[];
  rules: CachedRule[];
  profileUpdates: PendingProfileUpdate[];
  mealHistory: MealHistoryEntry[];
  glucoseLogs: PendingGlucoseLog[];
  mealLogs: PendingMealLog[];
  credentials: Map<string, { userId: string; password: string }>;
} = {
  session: null,
  foods: [],
  rules: [],
  profileUpdates: [],
  mealHistory: [],
  glucoseLogs: [],
  mealLogs: [],
  credentials: new Map(),
};

export async function getDatabase(): Promise<never> {
  throw new Error("SQLite offline database is not available on web.");
}

export async function saveUserOffline(
  user: OfflineUser,
  token: string,
  expiresAt: string
): Promise<void> {
  webState.session = { user, token, expiresAt };
}

export async function getOfflineSession(): Promise<{
  user: OfflineUser;
  token: string;
  expiresAt: string;
} | null> {
  if (!webState.session) return null;
  if (new Date(webState.session.expiresAt) < new Date()) {
    webState.session = null;
    return null;
  }
  return webState.session;
}

export async function clearOfflineSession(): Promise<void> {
  webState.session = null;
}

export async function updateUserOffline(
  userId: string,
  updates: Partial<OfflineUser>
): Promise<void> {
  if (webState.session?.user.id !== userId) return;
  webState.session = {
    ...webState.session,
    user: { ...webState.session.user, ...updates },
  };
}

export async function hasOfflineUser(): Promise<boolean> {
  return (await getOfflineSession()) !== null;
}

export async function cacheFoods(foods: CachedFood[]): Promise<void> {
  webState.foods = foods;
}

export async function getCachedFoods(filters?: {
  search?: string;
  category?: string;
  maxGI?: number;
  affordability?: string;
  limit?: number;
  offset?: number;
}): Promise<CachedFood[]> {
  let foods = webState.foods.filter((food) => !food.deleted);

  if (filters?.search) {
    const query = filters.search.toLowerCase();
    foods = foods.filter(
      (food) =>
        food.localName.toLowerCase().includes(query) ||
        food.canonicalName?.toLowerCase().includes(query)
    );
  }

  if (filters?.category) {
    foods = foods.filter((food) => food.category === filters.category);
  }

  if (filters?.affordability) {
    foods = foods.filter((food) => food.affordability === filters.affordability);
  }

  if (filters?.maxGI) {
    foods = foods.filter(
      (food) => food.nutrients.gi !== null && food.nutrients.gi <= filters.maxGI!
    );
  }

  const offset = filters?.offset ?? 0;
  const limit = filters?.limit ?? foods.length;
  return foods.slice(offset, offset + limit);
}

export async function getCachedFoodById(
  id: string
): Promise<CachedFood | null> {
  return webState.foods.find((food) => food.id === id && !food.deleted) ?? null;
}

export async function getCachedFoodsCount(): Promise<number> {
  return webState.foods.filter((food) => !food.deleted).length;
}

export async function getCachedRulesCount(): Promise<number> {
  return webState.rules.filter((rule) => !rule.deleted).length;
}

export async function cacheRules(rules: CachedRule[]): Promise<void> {
  webState.rules = rules;
}

export async function getCachedRules(): Promise<CachedRule[]> {
  return webState.rules.filter((rule) => !rule.deleted);
}

export async function getCachedRuleBySlug(
  slug: string
): Promise<CachedRule | null> {
  return (
    webState.rules.find((rule) => rule.slug === slug && !rule.deleted) ?? null
  );
}

export async function clearFoodsCache(): Promise<void> {
  webState.foods = [];
}

export async function clearRulesCache(): Promise<void> {
  webState.rules = [];
}

export async function clearAllCachedData(): Promise<{
  foodsCleared: boolean;
  rulesCleared: boolean;
  pendingGlucoseCleared: boolean;
  pendingMealsCleared: boolean;
}> {
  webState.foods = [];
  webState.rules = [];
  webState.glucoseLogs = [];
  webState.mealLogs = [];
  return {
    foodsCleared: true,
    rulesCleared: true,
    pendingGlucoseCleared: true,
    pendingMealsCleared: true,
  };
}

export async function saveOfflineCredentials(
  userId: string,
  email: string,
  password: string
): Promise<void> {
  webState.credentials.set(email.toLowerCase(), { userId, password });
}

export async function verifyOfflineCredentials(
  email: string,
  password: string
): Promise<boolean> {
  return webState.credentials.get(email.toLowerCase())?.password === password;
}

export async function hasOfflineCredentials(email: string): Promise<boolean> {
  return webState.credentials.has(email.toLowerCase());
}

export async function clearOfflineCredentials(userId?: string): Promise<void> {
  if (!userId) {
    webState.credentials.clear();
    return;
  }

  for (const [email, credentials] of webState.credentials.entries()) {
    if (credentials.userId === userId) {
      webState.credentials.delete(email);
    }
  }
}

export async function queueProfileUpdate(
  userId: string,
  updateData: Record<string, any>
): Promise<void> {
  webState.profileUpdates.push({
    id: Date.now(),
    userId,
    updateData,
    createdAt: new Date().toISOString(),
    synced: false,
  });
}

export async function getPendingProfileUpdates(
  userId: string
): Promise<PendingProfileUpdate[]> {
  return webState.profileUpdates.filter(
    (update) => update.userId === userId && !update.synced
  );
}

export async function markProfileUpdateSynced(id: number): Promise<void> {
  webState.profileUpdates = webState.profileUpdates.map((update) =>
    update.id === id ? { ...update, synced: true } : update
  );
}

export async function clearSyncedProfileUpdates(): Promise<void> {
  webState.profileUpdates = webState.profileUpdates.filter(
    (update) => !update.synced
  );
}

export async function saveMealToHistory(
  entry: Omit<MealHistoryEntry, "id">
): Promise<number> {
  const id = Date.now();
  webState.mealHistory.push({ id, ...entry });
  return id;
}

export async function getTodaysMeals(
  userId: string
): Promise<MealHistoryEntry[]> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return webState.mealHistory.filter(
    (meal) => meal.userId === userId && new Date(meal.createdAt) >= today
  );
}

export async function savePendingGlucoseLog(
  log: Omit<PendingGlucoseLog, "id" | "synced" | "createdAt">
): Promise<number> {
  const id = Date.now();
  webState.glucoseLogs.push({
    id,
    ...log,
    synced: false,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getPendingGlucoseLogs(
  userId: string
): Promise<PendingGlucoseLog[]> {
  return webState.glucoseLogs.filter(
    (log) => log.userId === userId && !log.synced
  );
}

export async function markGlucoseLogsSynced(
  clientGeneratedIds: string[]
): Promise<void> {
  webState.glucoseLogs = webState.glucoseLogs.map((log) =>
    clientGeneratedIds.includes(log.clientGeneratedId)
      ? { ...log, synced: true }
      : log
  );
}

export async function savePendingMealLog(
  log: Omit<PendingMealLog, "id" | "synced" | "createdAt">
): Promise<number> {
  const id = Date.now();
  webState.mealLogs.push({
    id,
    ...log,
    synced: false,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function getPendingMealLogs(
  userId: string
): Promise<PendingMealLog[]> {
  return webState.mealLogs.filter((log) => log.userId === userId && !log.synced);
}

export async function markMealLogsSynced(
  clientGeneratedIds: string[]
): Promise<void> {
  webState.mealLogs = webState.mealLogs.map((log) =>
    clientGeneratedIds.includes(log.clientGeneratedId)
      ? { ...log, synced: true }
      : log
  );
}
