// Per-user personal stream sources, backed by Turso (same store as
// lib/sources/store.js's global sources - the only persistent, Vercel-
// compatible datastore this project has). URLs are encrypted at rest with
// the same AES-256-GCM helper used for admin credentials
// (lib/security/crypto.js) - the DB never holds a plaintext stream URL.
//
// Deliberately NOT using a local-SQLite fallback for dev: that requires
// @libsql/client's native build, and Turbopack eagerly evaluates even a
// dynamically-imported native module during its own bundling step - a
// missing platform binary crashes the whole dev server, not just this
// feature, and try/catch can't shield against it. For local testing,
// point TURSO_DATABASE_URL/TURSO_AUTH_TOKEN at a free-tier Turso database
// instead (same as lib/sources/store.js already requires).
import { createClient } from "@libsql/client/web";
import { decryptSecret, encryptSecret } from "@/lib/security/crypto";

let client;
let schemaPromise;

function getClient() {
  if (client) return client;
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) return null;
  client = createClient({ url, authToken });
  return client;
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
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

// Called on sign-in. New accounts default to subscribed so the feature
// works immediately without a payment processor - an admin can revoke
// access per-user from /admin until real billing is wired up.
export async function getOrCreateUserAccount(githubLogin) {
  const database = getClient();
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
  const database = getClient();
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
  const database = getClient();
  if (!database) throw new Error("Turso storage is not configured.");
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
  const database = getClient();
  if (!database) return [];
  await ensureSchema(database);
  const result = await database.execute({
    sql: "SELECT * FROM user_streams WHERE github_login = ? ORDER BY created_at DESC",
    args: [githubLogin]
  });
  return result.rows.map(mapRow);
}

export async function addUserStream({ githubLogin, name, type, url }) {
  const database = getClient();
  if (!database) throw new Error("Turso storage is not configured.");
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
  const database = getClient();
  if (!database) throw new Error("Turso storage is not configured.");
  await ensureSchema(database);
  await database.execute({
    sql: "DELETE FROM user_streams WHERE id = ? AND github_login = ?",
    args: [id, githubLogin]
  });
}
