// Relays http:// HLS streams over https:// so they can be embedded into this
// (https) site without hitting browser mixed-content blocking - that block
// only applies to resources the *browser* fetches directly, not to a server
// fetching them on the browser's behalf, so this endpoint does the fetch
// itself and re-serves the result from our own https origin.
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { safeFetch, UnsafeUrlError } from "@/lib/security/safeFetch";

export const maxDuration = 30;
// Vercel's default function region is US (iad1) - a UK broadcaster's geo
// check on our own outbound request would fail from there even when the
// requesting browser's own IP is genuinely in the UK. Run from London so
// this proxy's request looks UK-based like the content it's relaying.
export const preferredRegion = "lhr1";

const FETCH_TIMEOUT_MS = 15000;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

// Without this, the proxy relays any URL on the internet - free bandwidth for
// anyone, billed to this deployment. A top-level (unsigned) request may only
// fetch an HLS manifest, capped at MAX_MANIFEST_BYTES; segment, key and
// sub-playlist URLs are only served when signed by our own manifest rewrite.
const SIGNING_SECRET =
  process.env.STREAM_PROXY_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "production" ? randomBytes(32).toString("hex") : "local-dev-only-stream-proxy-secret");

function signUrl(url) {
  return createHmac("sha256", SIGNING_SECRET).update(url).digest("base64url");
}

function hasValidSignature(url, signature) {
  if (!signature) return false;
  const expected = Buffer.from(signUrl(url));
  const actual = Buffer.from(signature);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function proxyUrlFor(request, absoluteUrl, headerParams) {
  const origin = new URL(request.url).origin;
  return `${origin}/api/stream-proxy?url=${encodeURIComponent(absoluteUrl)}&sig=${signUrl(absoluteUrl)}${headerParams}`;
}

function isManifest(target, contentType) {
  const type = String(contentType || "").toLowerCase();
  if (type.includes("mpegurl") || type.includes("x-mpegurl")) return true;
  return /\.m3u8?(?:$|\?)/i.test(target.pathname);
}

// Rewrites every non-comment line (segment, sub-playlist, or key URI) in an
// HLS manifest to route back through this same proxy, resolved against the
// manifest's own URL - otherwise hls.js would fetch the original http://
// segment URLs directly and hit the exact same mixed-content block. Segments
// from the same CDN typically need the same Referer/User-Agent as the
// manifest itself, so that's carried along to every rewritten URL too.
function rewriteManifest(text, request, manifestUrl, headerParams) {
  return text
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#")) {
        return trimmed.replace(/URI="([^"]+)"/, (match, uri) => {
          try {
            const absolute = new URL(uri, manifestUrl).toString();
            return `URI="${proxyUrlFor(request, absolute, headerParams)}"`;
          } catch {
            return match;
          }
        });
      }

      try {
        const absolute = new URL(trimmed, manifestUrl).toString();
        return proxyUrlFor(request, absolute, headerParams);
      } catch {
        return line;
      }
    })
    .join("\n");
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const source = searchParams.get("url");
  if (!source) return Response.json({ error: "Missing stream URL" }, { status: 400 });
  const isSigned = hasValidSignature(source, searchParams.get("sig"));

  // Strip control characters (CR/LF, etc.) before using these as literal
  // outbound header values - they're attacker-reachable via the query string.
  const sanitizeHeaderValue = (value) => (value ? value.replace(/[\r\n\0]/g, "").slice(0, 2048) : null);
  const referrer = sanitizeHeaderValue(searchParams.get("referrer"));
  const userAgent = sanitizeHeaderValue(searchParams.get("userAgent"));
  const headerParams = `${referrer ? `&referrer=${encodeURIComponent(referrer)}` : ""}${
    userAgent ? `&userAgent=${encodeURIComponent(userAgent)}` : ""
  }`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const upstream = await safeFetch(source, {
      signal: controller.signal,
      headers: {
        Accept: "*/*",
        ...(referrer ? { Referer: referrer } : {}),
        ...(userAgent ? { "User-Agent": userAgent } : {})
      },
      cache: "no-store"
    });
    const target = upstream.finalUrl;

    if (!upstream.ok) {
      return Response.json({ error: `Upstream returned ${upstream.status}` }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type");

    if (isManifest(target, contentType)) {
      if (Number(upstream.headers.get("content-length")) > MAX_MANIFEST_BYTES) {
        upstream.body?.cancel();
        return Response.json({ error: "Manifest is too large" }, { status: 413 });
      }
      const text = await upstream.text();
      if (new TextEncoder().encode(text).byteLength > MAX_MANIFEST_BYTES) {
        return Response.json({ error: "Manifest is too large" }, { status: 413 });
      }
      return new Response(rewriteManifest(text, request, target.toString(), headerParams), {
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-store"
        }
      });
    }

    if (!isSigned) {
      upstream.body?.cancel();
      return Response.json({ error: "Only HLS playlists can be requested directly" }, { status: 403 });
    }

    // Segments/keys: stream the bytes straight through without buffering the
    // whole thing in memory.
    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=30"
      }
    });
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return Response.json({ error: "Invalid or unsupported stream URL" }, { status: 400 });
    }
    return Response.json(
      { error: error.name === "AbortError" ? "Upstream request timed out" : "Could not reach stream" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
