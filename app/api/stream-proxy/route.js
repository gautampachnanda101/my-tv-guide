// Relays http:// HLS streams over https:// so they can be embedded into this
// (https) site without hitting browser mixed-content blocking - that block
// only applies to resources the *browser* fetches directly, not to a server
// fetching them on the browser's behalf, so this endpoint does the fetch
// itself and re-serves the result from our own https origin.
export const maxDuration = 30;
// Vercel's default function region is US (iad1) - a UK broadcaster's geo
// check on our own outbound request would fail from there even when the
// requesting browser's own IP is genuinely in the UK. Run from London so
// this proxy's request looks UK-based like the content it's relaying.
export const preferredRegion = "lhr1";

const FETCH_TIMEOUT_MS = 15000;
const MAX_MANIFEST_BYTES = 2 * 1024 * 1024;

function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase().replace(/[[\]]/g, "");
  if (host === "localhost" || host === "localhost.localdomain" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;

  const private172 = host.match(/^172\.(\d+)\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;

  return host === "169.254.169.254" || host.endsWith(".local");
}

function parseTarget(raw) {
  if (!raw) return null;
  let target;
  try {
    target = new URL(raw);
  } catch {
    return null;
  }
  if (!/^https?:$/.test(target.protocol) || isPrivateHostname(target.hostname)) return null;
  return target;
}

function proxyUrlFor(request, absoluteUrl, headerParams) {
  const origin = new URL(request.url).origin;
  return `${origin}/api/stream-proxy?url=${encodeURIComponent(absoluteUrl)}${headerParams}`;
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
  const target = parseTarget(source);
  if (!target) return Response.json({ error: "Invalid or unsupported stream URL" }, { status: 400 });

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
    const upstream = await fetch(target, {
      signal: controller.signal,
      headers: {
        Accept: "*/*",
        ...(referrer ? { Referer: referrer } : {}),
        ...(userAgent ? { "User-Agent": userAgent } : {})
      },
      cache: "no-store",
      redirect: "follow"
    });

    if (!upstream.ok) {
      return Response.json({ error: `Upstream returned ${upstream.status}` }, { status: 502 });
    }

    const contentType = upstream.headers.get("content-type");

    if (isManifest(target, contentType)) {
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

    // Segments/keys: stream the bytes straight through without buffering the
    // whole thing in memory.
    return new Response(upstream.body, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Cache-Control": "public, max-age=30"
      }
    });
  } catch (error) {
    return Response.json(
      { error: error.name === "AbortError" ? "Upstream request timed out" : "Could not reach stream" },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
