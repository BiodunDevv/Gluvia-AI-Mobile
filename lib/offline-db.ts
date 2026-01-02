import * as SQLite from "expo-sqlite";

const DB_NAME = "gluvia.db";
const DB_VERSION = 2; // Increment when schema changes

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeDatabase(db);
  }
  return db;
}

async function initializeDatabase(database: SQLite.SQLiteDatabase) {
  // Check if users table exists
  const tableExists = await database.getFirstAsync<{ name: string }>(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='users'"
  );

  // Check if we need to migrate
  if (tableExists) {
    const oldColumnExists = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('users') WHERE name='profile_allergies'"
    );

    const newColumnExists = await database.getFirstAsync<{ name: string }>(
      "SELECT name FROM pragma_table_info('users') WHERE name='profile_data'"
    );

    // If old column exists and new column doesn't exist, migrate
    if (oldColumnExists?.name === "profile_allergies" && !newColumnExists) {
      console.log("Migrating database schema...");

      // Add new column
      await database.execAsync(`
        ALTER TABLE users ADD COLUMN profile_data TEXT;
      `);

      // Migrate data from profile_allergies to profile_data
      await database.execAsync(`
        UPDATE users 
        SET profile_data = json_object('allergies', json(profile_allergies))
        WHERE profile_allergies IS NOT NULL AND profile_allergies != '[]';
      `);

      console.log("Migration complete");
    }
  }

  // Create users table for offline access with full profile
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      phone TEXT,
      role TEXT NOT NULL,
      deleted INTEGER DEFAULT 0,
      profile_data TEXT,
      consent_accepted INTEGER DEFAULT 0,
      consent_timestamp TEXT,
      created_at TEXT,
      updated_at TEXT
    );
  `);

  // Create auth_session table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS auth_session (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      user_id TEXT,
      token TEXT,
      expires_at TEXT,
      is_offline INTEGER DEFAULT 0,
      last_sync TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create foods cache table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS foods_cache (
      id TEXT PRIMARY KEY,
      local_name TEXT NOT NULL,
      canonical_name TEXT,
      category TEXT,
      nutrients TEXT NOT NULL,
      portion_sizes TEXT NOT NULL,
      affordability TEXT,
      tags TEXT,
      image_url TEXT,
      region_variants TEXT,
      source TEXT,
      version INTEGER DEFAULT 1,
      deleted INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      cached_at TEXT NOT NULL
    );
  `);

  // Create rules cache table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS rules_cache (
      id TEXT PRIMARY KEY,
      slug TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL,
      definition TEXT NOT NULL,
      nl_template TEXT,
      applies_to TEXT,
      deleted INTEGER DEFAULT 0,
      version INTEGER DEFAULT 1,
      created_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      cached_at TEXT NOT NULL
    );
  `);

  // Create conversations table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      last_message TEXT,
      message_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    );
  `);

  // Create chat messages table
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT NOT NULL,
      synced INTEGER DEFAULT 0,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    );
  `);
}

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

// Save user for offline access
export async function saveUserOffline(
  user: OfflineUser,
  token: string,
  expiresAt: string
): Promise<void> {
  const database = await getDatabase();

  // Upsert user with full profile as JSON
  await database.runAsync(
    `INSERT OR REPLACE INTO users (id, email, name, phone, role, deleted, profile_data, consent_accepted, consent_timestamp, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      user.id,
      user.email,
      user.name || null,
      user.phone || null,
      user.role,
      user.deleted ? 1 : 0,
      JSON.stringify(user.profile || {}),
      user.consent?.accepted ? 1 : 0,
      user.consent?.timestamp || null,
      user.createdAt || null,
      user.updatedAt || null,
    ]
  );

  // Save auth session
  await database.runAsync(
    `INSERT OR REPLACE INTO auth_session (id, user_id, token, expires_at, is_offline, last_sync)
     VALUES (1, ?, ?, ?, 0, ?)`,
    [user.id, token, expiresAt, new Date().toISOString()]
  );
}

// Get offline user session
export async function getOfflineSession(): Promise<{
  user: OfflineUser;
  token: string;
  expiresAt: string;
} | null> {
  try {
    const database = await getDatabase();

    const session = await database.getFirstAsync<{
      user_id: string;
      token: string;
      expires_at: string;
    }>(`SELECT user_id, token, expires_at FROM auth_session WHERE id = 1`);

    if (!session) return null;

    // Check if token is expired
    if (new Date(session.expires_at) < new Date()) {
      await clearOfflineSession();
      return null;
    }

    const userRow = await database.getFirstAsync<{
      id: string;
      email: string;
      name: string | null;
      phone: string | null;
      role: string;
      deleted: number;
      profile_data: string;
      consent_accepted: number;
      consent_timestamp: string | null;
      created_at: string | null;
      updated_at: string | null;
    }>(`SELECT * FROM users WHERE id = ?`, [session.user_id]);

    if (!userRow) return null;

    const user: OfflineUser = {
      id: userRow.id,
      email: userRow.email,
      name: userRow.name || undefined,
      phone: userRow.phone || undefined,
      role: userRow.role,
      deleted: userRow.deleted === 1,
      profile: JSON.parse(userRow.profile_data || "{}"),
      consent: {
        accepted: userRow.consent_accepted === 1,
        timestamp: userRow.consent_timestamp || undefined,
      },
      createdAt: userRow.created_at || undefined,
      updatedAt: userRow.updated_at || undefined,
    };

    return {
      user,
      token: session.token,
      expiresAt: session.expires_at,
    };
  } catch (error) {
    console.error("Error getting offline session:", error);
    return null;
  }
}

// Clear offline session
export async function clearOfflineSession(): Promise<void> {
  try {
    const database = await getDatabase();
    await database.runAsync(`DELETE FROM auth_session WHERE id = 1`);
  } catch (error) {
    console.error("Error clearing offline session:", error);
  }
}

// Update user offline
export async function updateUserOffline(
  userId: string,
  updates: Partial<OfflineUser>
): Promise<void> {
  const database = await getDatabase();

  const fields: string[] = [];
  const values: any[] = [];

  if (updates.name !== undefined) {
    fields.push("name = ?");
    values.push(updates.name);
  }
  if (updates.phone !== undefined) {
    fields.push("phone = ?");
    values.push(updates.phone);
  }
  if (updates.profile !== undefined) {
    fields.push("profile_data = ?");
    values.push(JSON.stringify(updates.profile));
  }
  fields.push("updated_at = ?");
  values.push(new Date().toISOString());
  values.push(userId);

  if (fields.length > 0) {
    await database.runAsync(
      `UPDATE users SET ${fields.join(", ")} WHERE id = ?`,
      values
    );
  }
}

// Check if user exists offline
export async function hasOfflineUser(): Promise<boolean> {
  try {
    const session = await getOfflineSession();
    return session !== null;
  } catch {
    return false;
  }
}

// ============ FOOD CACHE FUNCTIONS ============

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

export async function cacheFoods(foods: CachedFood[]): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  for (const food of foods) {
    await database.runAsync(
      `INSERT OR REPLACE INTO foods_cache 
       (id, local_name, canonical_name, category, nutrients, portion_sizes, affordability, tags, image_url, region_variants, source, version, deleted, created_at, updated_at, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        food.id,
        food.localName,
        food.canonicalName || null,
        food.category || null,
        JSON.stringify(food.nutrients),
        JSON.stringify(food.portionSizes),
        food.affordability || null,
        JSON.stringify(food.tags || []),
        food.imageUrl || null,
        JSON.stringify(food.regionVariants || []),
        food.source || null,
        food.version,
        food.deleted ? 1 : 0,
        food.createdAt,
        food.updatedAt,
        now,
      ]
    );
  }
}

export async function getCachedFoods(filters?: {
  search?: string;
  category?: string;
  maxGI?: number;
  affordability?: string;
  limit?: number;
  offset?: number;
}): Promise<CachedFood[]> {
  const database = await getDatabase();

  let query = `SELECT * FROM foods_cache WHERE deleted = 0`;
  const params: any[] = [];

  if (filters?.search) {
    query += ` AND (local_name LIKE ? OR canonical_name LIKE ?)`;
    params.push(`%${filters.search}%`, `%${filters.search}%`);
  }

  if (filters?.category) {
    query += ` AND category = ?`;
    params.push(filters.category);
  }

  if (filters?.affordability) {
    query += ` AND affordability = ?`;
    params.push(filters.affordability);
  }

  if (filters?.maxGI) {
    query += ` AND json_extract(nutrients, '$.gi') <= ?`;
    params.push(filters.maxGI);
  }

  query += ` ORDER BY local_name ASC`;

  if (filters?.limit) {
    query += ` LIMIT ?`;
    params.push(filters.limit);
    if (filters?.offset) {
      query += ` OFFSET ?`;
      params.push(filters.offset);
    }
  }

  const rows = await database.getAllAsync<{
    id: string;
    local_name: string;
    canonical_name: string | null;
    category: string | null;
    nutrients: string;
    portion_sizes: string;
    affordability: string | null;
    tags: string;
    image_url: string | null;
    region_variants: string;
    source: string | null;
    version: number;
    deleted: number;
    created_at: string;
    updated_at: string;
  }>(query, params);

  return rows.map((row) => ({
    id: row.id,
    localName: row.local_name,
    canonicalName: row.canonical_name || undefined,
    category: row.category || undefined,
    nutrients: JSON.parse(row.nutrients),
    portionSizes: JSON.parse(row.portion_sizes),
    affordability: row.affordability as "low" | "medium" | "high" | undefined,
    tags: JSON.parse(row.tags || "[]"),
    imageUrl: row.image_url || undefined,
    regionVariants: JSON.parse(row.region_variants || "[]"),
    source: row.source as "manual" | "validated" | "estimated" | undefined,
    version: row.version,
    deleted: row.deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getCachedFoodById(
  id: string
): Promise<CachedFood | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    local_name: string;
    canonical_name: string | null;
    category: string | null;
    nutrients: string;
    portion_sizes: string;
    affordability: string | null;
    tags: string;
    image_url: string | null;
    region_variants: string;
    source: string | null;
    version: number;
    deleted: number;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM foods_cache WHERE id = ?`, [id]);

  if (!row) return null;

  return {
    id: row.id,
    localName: row.local_name,
    canonicalName: row.canonical_name || undefined,
    category: row.category || undefined,
    nutrients: JSON.parse(row.nutrients),
    portionSizes: JSON.parse(row.portion_sizes),
    affordability: row.affordability as "low" | "medium" | "high" | undefined,
    tags: JSON.parse(row.tags || "[]"),
    imageUrl: row.image_url || undefined,
    regionVariants: JSON.parse(row.region_variants || "[]"),
    source: row.source as "manual" | "validated" | "estimated" | undefined,
    version: row.version,
    deleted: row.deleted === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getCachedFoodsCount(): Promise<number> {
  const database = await getDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM foods_cache WHERE deleted = 0`
  );
  return result?.count || 0;
}

// ============ RULE CACHE FUNCTIONS ============

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

export async function cacheRules(rules: CachedRule[]): Promise<void> {
  const database = await getDatabase();
  const now = new Date().toISOString();

  for (const rule of rules) {
    await database.runAsync(
      `INSERT OR REPLACE INTO rules_cache 
       (id, slug, title, type, definition, nl_template, applies_to, deleted, version, created_by, created_at, updated_at, cached_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.id,
        rule.slug,
        rule.title,
        rule.type,
        JSON.stringify(rule.definition),
        rule.nlTemplate || null,
        JSON.stringify(rule.appliesTo || []),
        rule.deleted ? 1 : 0,
        rule.version,
        rule.createdBy || null,
        rule.createdAt,
        rule.updatedAt,
        now,
      ]
    );
  }
}

export async function getCachedRules(): Promise<CachedRule[]> {
  const database = await getDatabase();
  const rows = await database.getAllAsync<{
    id: string;
    slug: string;
    title: string;
    type: string;
    definition: string;
    nl_template: string | null;
    applies_to: string;
    deleted: number;
    version: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM rules_cache WHERE deleted = 0 ORDER BY title ASC`);

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type as CachedRule["type"],
    definition: JSON.parse(row.definition),
    nlTemplate: row.nl_template || undefined,
    appliesTo: JSON.parse(row.applies_to || "[]"),
    deleted: row.deleted === 1,
    version: row.version,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function getCachedRuleBySlug(
  slug: string
): Promise<CachedRule | null> {
  const database = await getDatabase();
  const row = await database.getFirstAsync<{
    id: string;
    slug: string;
    title: string;
    type: string;
    definition: string;
    nl_template: string | null;
    applies_to: string;
    deleted: number;
    version: number;
    created_by: string | null;
    created_at: string;
    updated_at: string;
  }>(`SELECT * FROM rules_cache WHERE slug = ?`, [slug]);

  if (!row) return null;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    type: row.type as CachedRule["type"],
    definition: JSON.parse(row.definition),
    nlTemplate: row.nl_template || undefined,
    appliesTo: JSON.parse(row.applies_to || "[]"),
    deleted: row.deleted === 1,
    version: row.version,
    createdBy: row.created_by || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function clearFoodsCache(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM foods_cache`);
}

export async function clearRulesCache(): Promise<void> {
  const database = await getDatabase();
  await database.runAsync(`DELETE FROM rules_cache`);
}
