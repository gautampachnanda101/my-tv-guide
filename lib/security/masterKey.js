/**
 * Master key used to encrypt credentials stored in the local SQLite store.
 * Resolution order:
 *  1. CREDENTIALS_MASTER_KEY env var (64 hex chars / 32 bytes) - use this in
 *     any environment where you want the key to survive redeploys.
 *  2. .data/master.key - auto-generated on first run for local/self-hosted use.
 */
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), ".data");
const KEY_FILE = path.join(DATA_DIR, "master.key");

let cachedKey = null;

export function getMasterKey() {
  if (cachedKey) return cachedKey;

  const envKey = process.env.CREDENTIALS_MASTER_KEY;
  if (envKey) {
    const key = Buffer.from(envKey.trim(), "hex");
    if (key.length !== 32) {
      throw new Error("CREDENTIALS_MASTER_KEY must be a 64-character hex string (32 bytes)");
    }
    cachedKey = key;
    return cachedKey;
  }

  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true, mode: 0o700 });
  }

  if (existsSync(KEY_FILE)) {
    cachedKey = Buffer.from(readFileSync(KEY_FILE, "utf8").trim(), "hex");
    return cachedKey;
  }

  const key = randomBytes(32);
  writeFileSync(KEY_FILE, key.toString("hex"), { mode: 0o600 });
  cachedKey = key;
  return cachedKey;
}
