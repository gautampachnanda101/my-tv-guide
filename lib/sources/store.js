import { createClient } from "@libsql/client/web";

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
    schemaPromise = database.execute(`
      CREATE TABLE IF NOT EXISTS global_sources (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('playlist', 'xmltv')),
        url TEXT NOT NULL,
        enabled INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
  }
  await schemaPromise;
}

function mapRow(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    url: row.url,
    enabled: Boolean(row.enabled),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export function isSourceStoreAvailable() {
  return Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);
}

export async function listGlobalSources() {
  const database = getClient();
  if (!database) return [];
  await ensureSchema(database);
  const result = await database.execute("SELECT * FROM global_sources ORDER BY created_at DESC");
  return result.rows.map(mapRow);
}

export async function addGlobalSource({ name, type, url }) {
  const database = getClient();
  if (!database) throw new Error("Turso source storage is not configured.");
  await ensureSchema(database);
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await database.execute({
    sql: "INSERT INTO global_sources (id, name, type, url, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)",
    args: [id, name, type, url, now, now]
  });
  return { id, name, type, url, enabled: true, createdAt: now, updatedAt: now };
}

export async function deleteGlobalSource(id) {
  const database = getClient();
  if (!database) throw new Error("Turso source storage is not configured.");
  await ensureSchema(database);
  await database.execute({ sql: "DELETE FROM global_sources WHERE id = ?", args: [id] });
}