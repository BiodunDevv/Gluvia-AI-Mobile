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
