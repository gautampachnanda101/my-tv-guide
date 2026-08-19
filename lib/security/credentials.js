/**
 * Public credential resolver used by providers. Environment variables
 * (e.g. set in the Vercel dashboard) always take precedence over the local
 * encrypted store, mirroring how Vercel itself layers project env vars.
 */
import { getStoredCredential, isPersistenceAvailable } from "./credentialsStore.js";

export const MANAGED_CREDENTIALS = [
  {
    name: "TMDB_API_KEY",
    label: "TMDB API Key",
    description: "Powers show posters, descriptions, ratings, and cast info.",
    signupUrl: "https://www.themoviedb.org/settings/api"
  },
  {
    name: "YOUTUBE_API_KEY",
    label: "YouTube Data API Key",
    description: "Powers the free movies section sourced from YouTube.",
    signupUrl: "https://console.cloud.google.com/apis/credentials"
  }
];

export async function getCredential(name) {
  const envValue = process.env[name];
  if (envValue && envValue.trim()) {
    return envValue.trim();
  }
  return getStoredCredential(name);
}

export async function getCredentialSource(name) {
  const envValue = process.env[name];
  if (envValue && envValue.trim()) return "env";

  const stored = await getStoredCredential(name);
  return stored ? "stored" : null;
}

export async function getSetupStatus() {
  const credentials = await Promise.all(
    MANAGED_CREDENTIALS.map(async (cred) => ({
      ...cred,
      source: await getCredentialSource(cred.name)
    }))
  );

  return {
    credentials,
    persistenceAvailable: isPersistenceAvailable(),
    anyConfigured: credentials.some((c) => c.source !== null)
  };
}
