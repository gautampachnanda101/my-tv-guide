/**
 * Encrypted local credential store, backed by node:sqlite.
 *
 * Vercel serverless functions have a read-only filesystem (aside from /tmp,
 * which doesn't survive cold starts or redeploys), so this store is only
 * usable where a persistent disk exists - local dev and self-hosted
 * long-running deployments. On Vercel, isPersistenceAvailable() returns
 * false and callers should fall back to env vars set in the dashboard.
 */
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { decryptSecret, encryptSecret } from "./crypto.js";

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "credentials.db");

export function isPersistenceAvailable() {
  return !process.env.VERCEL;
}

let dbPromise = null;

async function getDb() {
  if (!isPersistenceAvailable()) return null;
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    let DatabaseSync;
    try {
      ({ DatabaseSync } = await import("node:sqlite"));
    } catch {
      console.warn("node:sqlite is unavailable on this Node.js version (requires Node 22.5+); local credential storage is disabled.");
      return null;
    }

    if (!existsSync(DATA_DIR)) {
      mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
    }

    const database = new DatabaseSync(DB_FILE);
    database.exec(`
      CREATE TABLE IF NOT EXISTS credentials (
        name TEXT PRIMARY KEY,
        ciphertext TEXT NOT NULL,
        iv TEXT NOT NULL,
        auth_tag TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    return database;
  })();

  return dbPromise;
}

export async function getStoredCredential(name) {
  const database = await getDb();
  if (!database) return null;

  const row = database.prepare("SELECT ciphertext, iv, auth_tag FROM credentials WHERE name = ?").get(name);
  if (!row) return null;

  try {
    return decryptSecret({ ciphertext: row.ciphertext, iv: row.iv, authTag: row.auth_tag });
  } catch (error) {
    console.error(`Failed to decrypt stored credential "${name}":`, error.message);
    return null;
  }
}

export async function setStoredCredential(name, value) {
  const database = await getDb();
  if (!database) {
    throw new Error("Local credential storage is not available on this deployment.");
  }

  const { ciphertext, iv, authTag } = encryptSecret(value);
  database.prepare(`
    INSERT INTO credentials (name, ciphertext, iv, auth_tag, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(name) DO UPDATE SET
      ciphertext = excluded.ciphertext,
      iv = excluded.iv,
      auth_tag = excluded.auth_tag,
      updated_at = excluded.updated_at
  `).run(name, ciphertext, iv, authTag, new Date().toISOString());
}

export async function deleteStoredCredential(name) {
  const database = await getDb();
  if (!database) return;
  database.prepare("DELETE FROM credentials WHERE name = ?").run(name);
}
