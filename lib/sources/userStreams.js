// Per-user personal stream sources, backed by Turso (same store as
// lib/sources/store.js's global sources - the only persistent, Vercel-
// compatible datastore this project has). URLs are encrypted at rest with
// the same AES-256-GCM helper used for admin credentials
// (lib/security/crypto.js) - the DB never holds a plaintext stream URL.
//
// Local SQLite (via @libsql/client's native build) is available for local
// dev, but only when LOCAL_SQLITE_FALLBACK=true is set explicitly - NOT
// just whenever Turso happens to be unconfigured (the common "haven't set
// up .env.local yet" case). That native build requires a platform-specific
// binary, and Turbopack can crash the whole dev server (not just this
// feature) trying to load it if the binary is missing - scoping it to an
// explicit opt-in means that only ever happens to someone who deliberately
// asked for local-SQLite mode, not by default.
import { createClient } from "@libsql/client/web";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

const LOCAL_SQLITE_FALLBACK = process.env.LOCAL_SQLITE_FALLBACK === "true" && !process.env.VERCEL;
const LOCAL_DB_FILE = "file:.data/user-streams.db";

let client;
let clientPromise;
let schemaPromise;

async function getClient() {
  if (client) return client;
  if (clientPromise) return clientPromise;

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (url && authToken) {
    client = createClient({ url, authToken });
    return client;
  }
  if (!LOCAL_SQLITE_FALLBACK) return null;

  clientPromise = (async () => {
    try {
      const { createClient: createLocalClient } = await import("@libsql/client");
      client = createLocalClient({ url: LOCAL_DB_FILE });
      return client;
    } catch (error) {
      console.error("[user-streams] LOCAL_SQLITE_FALLBACK is set but the native libsql module failed to load:", error.message || "unknown error");
      return null;
    } finally {
      clientPromise = null;
    }
  })();
  return clientPromise;
}

async function ensureSchema(database) {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await database.execute(`
        CREATE TABLE IF NOT EXISTS user_accounts (
          github_login TEXT PRIMARY KEY,
          subscribed INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await database.execute(`
        CREATE TABLE IF NOT EXISTS user_streams (
          id TEXT PRIMARY KEY,
          github_login TEXT NOT NULL,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('stream', 'playlist')),
          ciphertext TEXT NOT NULL,
          iv TEXT NOT NULL,
          auth_tag TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);
      await database.execute("CREATE INDEX IF NOT EXISTS user_streams_login_idx ON user_streams (github_login)");
    })();
  }
  await schemaPromise;
}

export function isUserStoreAvailable() {
  // CREDENTIALS_MASTER_KEY only needs to be a real env var on Vercel -
  // encryptSecret()'s local-key-file fallback works fine everywhere else.
  if (process.env.VERCEL) {
    return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN && process.env.CREDENTIALS_MASTER_KEY);
  }
  return Boolean((process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN) || LOCAL_SQLITE_FALLBACK);
}

// Called on sign-in. New accounts default to subscribed so the feature
// works immediately without a payment processor - an admin can revoke
// access per-user from /admin until real billing is wired up.
export async function getOrCreateUserAccount(githubLogin) {
  const database = await getClient();
  if (!database) return null;
  await ensureSchema(database);

  const existing = await database.execute({
    sql: "SELECT github_login, subscribed FROM user_accounts WHERE github_login = ?",
    args: [githubLogin]
  });
  if (existing.rows.length > 0) {
    return { githubLogin, subscribed: Boolean(existing.rows[0].subscribed) };
  }

  const now = new Date().toISOString();
  await database.execute({
    sql: "INSERT INTO user_accounts (github_login, subscribed, created_at, updated_at) VALUES (?, 1, ?, ?)",
    args: [githubLogin, now, now]
  });
  return { githubLogin, subscribed: true };
}

export async function listUserAccounts() {
  const database = await getClient();
  if (!database) return [];
  await ensureSchema(database);
  const result = await database.execute("SELECT github_login, subscribed, created_at FROM user_accounts ORDER BY created_at DESC");
  return result.rows.map((row) => ({
    githubLogin: row.github_login,
    subscribed: Boolean(row.subscribed),
    createdAt: row.created_at
  }));
}

export async function setUserSubscribed(githubLogin, subscribed) {
  const database = await getClient();
  if (!database) throw new Error("Storage is not configured.");
  await ensureSchema(database);
  await database.execute({
    sql: "UPDATE user_accounts SET subscribed = ?, updated_at = ? WHERE github_login = ?",
    args: [subscribed ? 1 : 0, new Date().toISOString(), githubLogin]
  });
}

function mapRow(row) {
  const url = decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag });
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url,
    createdAt: row.created_at
  };
}

export async function listUserStreams(githubLogin) {
  const database = await getClient();
  if (!database) return [];
  await ensureSchema(database);
  const result = await database.execute({
    sql: "SELECT * FROM user_streams WHERE github_login = ? ORDER BY created_at DESC",
    args: [githubLogin]
  });
  return result.rows.map(mapRow);
}

export async function addUserStream({ githubLogin, name, type, url }) {
  const database = await getClient();
  if (!database) throw new Error("Storage is not configured.");
  await ensureSchema(database);

  const { ciphertext, iv, authTag } = encryptSecret(url);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await database.execute({
    sql: "INSERT INTO user_streams (id, github_login, name, type, ciphertext, iv, auth_tag, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, githubLogin, name, type, ciphertext, iv, authTag, now, now]
  });
  return { id, name, type, url, createdAt: now };
}

// Ownership check is the caller's job (compare githubLogin to the session
// user) so this module never needs to know about admin overrides.
export async function deleteUserStream({ githubLogin, id }) {
  const database = await getClient();
  if (!database) throw new Error("Storage is not configured.");
  await ensureSchema(database);
  await database.execute({
    sql: "DELETE FROM user_streams WHERE id = ? AND github_login = ?",
    args: [id, githubLogin]
  });
}
