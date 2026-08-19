import { NextResponse } from "next/server";
import { MANAGED_CREDENTIALS, getSetupStatus } from "@/lib/security/credentials";
import { deleteStoredCredential, isPersistenceAvailable, setStoredCredential } from "@/lib/security/credentialsStore";

const VALID_NAMES = new Set(MANAGED_CREDENTIALS.map((c) => c.name));

async function validateCredential(name, value) {
  try {
    if (name === "TMDB_API_KEY") {
      const res = await fetch(`https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(value)}`);
      return res.ok;
    }
    if (name === "YOUTUBE_API_KEY") {
      const url = "https://www.googleapis.com/youtube/v3/search?" + new URLSearchParams({
        key: value,
        part: "snippet",
        type: "video",
        maxResults: "1",
        q: "test"
      });
      const res = await fetch(url, { method: "HEAD" });
      return res.ok;
    }
  } catch {
    return false;
  }
  return true;
}

export async function POST(request) {
  if (!isPersistenceAvailable()) {
    return NextResponse.json(
      {
        error: "This deployment's filesystem is read-only. Add these as environment variables in your Vercel project settings instead, then redeploy."
      },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const entries = Object.entries(body).filter(
    ([name, value]) => VALID_NAMES.has(name) && typeof value === "string" && value.trim()
  );

  if (entries.length === 0) {
    return NextResponse.json({ error: "No valid credentials provided" }, { status: 400 });
  }

  const results = {};
  for (const [name, rawValue] of entries) {
    const value = rawValue.trim();
    const valid = await validateCredential(name, value);
    if (!valid) {
      results[name] = { saved: false, error: "This key was rejected by the provider. Double-check it and try again." };
      continue;
    }
    await setStoredCredential(name, value);
    results[name] = { saved: true };
  }

  const status = await getSetupStatus();
  return NextResponse.json({ results, status });
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");
  if (!name || !VALID_NAMES.has(name)) {
    return NextResponse.json({ error: "Unknown credential" }, { status: 400 });
  }

  await deleteStoredCredential(name);
  const status = await getSetupStatus();
  return NextResponse.json({ status });
}
