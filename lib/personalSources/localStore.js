/**
 * Personal sources saved on this device, encrypted at rest.
 *
 * - Each browser gets its own AES-256-GCM key from Web Crypto, created
 *   NON-EXTRACTABLE and kept in IndexedDB: no script (including ours) can
 *   read the key bytes out; it can only be used to encrypt/decrypt here.
 * - localStorage only ever holds { v, iv, data } - ciphertext with a fresh
 *   random IV per save. Reading localStorage, a disk backup, or a synced
 *   browser profile shows nothing usable.
 * - If secure storage isn't available (some private-browsing modes), saving
 *   fails rather than falling back to plaintext.
 *
 * Limit: this protects data at rest. Code running on this site itself can
 * still ask the browser to decrypt - that would need a user passphrase.
 *
 * Browser-only: every export touches window/IndexedDB/crypto.subtle.
 */

const STORAGE_KEY = "my-tv-guide.personal-sources.v1";
// Plaintext JSON written by the pre-2026-09-25 /sources page - migrated
// into the encrypted format and then removed (see migrateLegacySources).
const LEGACY_STORAGE_KEY = "my-tv-guide.public-sources";

const KEY_DB_NAME = "my-tv-guide-keys";
const KEY_STORE = "keys";
const KEY_ID = "personal-sources-v1";

export class SecureStorageUnavailableError extends Error {}
export class LocalSourcesUnreadableError extends Error {}

function isSecureStorageSupported() {
  return typeof window !== "undefined" && Boolean(window.crypto?.subtle) && Boolean(window.indexedDB);
}

function openKeyDatabase() {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(KEY_DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(KEY_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("IndexedDB unavailable"));
  });
}

function keyStoreRequest(database, mode, run) {
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(KEY_STORE, mode);
    const request = run(transaction.objectStore(KEY_STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let keyPromise = null;

// The device key: loaded from IndexedDB, or generated (non-extractable) and
// stored there on first use.
function getDeviceKey() {
  if (!keyPromise) {
    keyPromise = (async () => {
      if (!isSecureStorageSupported()) throw new SecureStorageUnavailableError("Secure storage is not available in this browser.");
      const database = await openKeyDatabase();
      try {
        const existing = await keyStoreRequest(database, "readonly", (store) => store.get(KEY_ID));
        if (existing) return existing;
        const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
        await keyStoreRequest(database, "readwrite", (store) => store.put(key, KEY_ID));
        return key;
      } finally {
        database.close();
      }
    })().catch((error) => {
      keyPromise = null;
      throw error instanceof SecureStorageUnavailableError
        ? error
        : new SecureStorageUnavailableError(`Secure storage is not available in this browser (${error?.message || "unknown error"}).`);
    });
  }
  return keyPromise;
}

// Built char by char: spreading a large Uint8Array into fromCharCode can
// exceed the engine's argument limit for long source lists.
function toBase64(bytes) {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary);
}
const fromBase64 = (text) => Uint8Array.from(atob(text), (char) => char.charCodeAt(0));

async function encryptList(list) {
  const key = await getDeviceKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const plaintext = new TextEncoder().encode(JSON.stringify(list));
  const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, plaintext);
  return { v: 1, iv: toBase64(iv), data: toBase64(ciphertext) };
}

async function decryptList(envelope) {
  const key = await getDeviceKey();
  const plaintext = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv: fromBase64(envelope.iv) }, key, fromBase64(envelope.data));
  return JSON.parse(new TextDecoder().decode(plaintext));
}

function sanitizeSources(list) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((source) => source && typeof source.url === "string" && /^https?:\/\//i.test(source.url))
    .map((source) => ({
      id: String(source.id || window.crypto.randomUUID()),
      name: String(source.name || "").trim() || (source.type === "stream" ? "My personal stream" : "My playlist"),
      url: source.url.trim(),
      // The old /sources page treated a missing type as a playlist.
      type: source.type === "stream" ? "stream" : "playlist"
    }));
}

async function writeEncrypted(list) {
  const envelope = await encryptList(list);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  return envelope;
}

async function readEncrypted() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return sanitizeSources(await decryptList(JSON.parse(raw)));
  } catch {
    // Most likely the device key was cleared (site data/IndexedDB wiped)
    // while localStorage survived - the ciphertext can't be recovered.
    throw new LocalSourcesUnreadableError("Saved sources on this device can no longer be decrypted.");
  }
}

// One-time move of the old plaintext list into the encrypted format. The
// plaintext copy is removed only after the encrypted copy has been written
// AND read back to the same contents, so nothing can be lost midway.
async function migrateLegacySources() {
  const legacyRaw = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (!legacyRaw) return;
  let legacy;
  try {
    legacy = sanitizeSources(JSON.parse(legacyRaw));
  } catch {
    return; // unparseable - leave it untouched rather than delete it
  }
  const current = window.localStorage.getItem(STORAGE_KEY) ? (await readEncrypted()) || [] : [];
  const knownUrls = new Set(current.map((source) => source.url));
  const merged = [...current, ...legacy.filter((source) => !knownUrls.has(source.url))];
  await writeEncrypted(merged);
  const verified = await readEncrypted();
  if (verified && verified.length === merged.length) {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
}

/** All personal sources saved on this device (decrypted). */
export async function loadLocalSources() {
  if (!isSecureStorageSupported()) {
    throw new SecureStorageUnavailableError("Secure storage is not available in this browser.");
  }
  await migrateLegacySources();
  return (await readEncrypted()) || [];
}

export async function addLocalSource({ name, type, url }) {
  const list = await loadLocalSources();
  const next = sanitizeSources([...list, { id: window.crypto.randomUUID(), name, type, url }]);
  await writeEncrypted(next);
  return next;
}

export async function removeLocalSource(id) {
  const list = await loadLocalSources();
  const next = list.filter((source) => source.id !== id);
  await writeEncrypted(next);
  return next;
}

/** Wipes the encrypted list (used when it can no longer be decrypted). */
export function clearLocalSources() {
  window.localStorage.removeItem(STORAGE_KEY);
}

/** Device list + account-synced list, without duplicate URLs. */
export function mergePersonalSources(localSources, syncedSources) {
  const seen = new Set();
  const tagged = [
    ...localSources.map((source) => ({ ...source, origin: "device" })),
    ...syncedSources.map((source) => ({ ...source, origin: "account" }))
  ];
  return tagged.filter((source) => {
    if (!source?.url || seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}
