import { safeFetch, UnsafeUrlError } from "@/lib/security/safeFetch";

// Functions run in iad1 (US) - set project-wide via "regions" in vercel.json
// (Hobby allows one function region). This is a worldwide catalogue, and
// iad1 is what playback was tuned on; UK-only geo-restricted streams that
// need this server-side fetch won't work from there.

async function checkUrl(url) {
  const headers = { Accept: "application/vnd.apple.mpegurl, video/*, */*" };
  let response = await safeFetch(url, { method: "HEAD", headers, signal: AbortSignal.timeout(8000) });

  if (response.status === 401 || response.status === 403 || response.status === 405 || response.status === 501) {
    response = await safeFetch(url, {
      method: "GET",
      headers: { ...headers, Range: "bytes=0-1023" },
      signal: AbortSignal.timeout(8000)
    });
  }

  return {
    ok: response.status >= 200 && response.status < 400,
    status: response.status,
    contentType: response.headers.get("content-type") || ""
  };
}

export async function GET(request) {
  const rawUrl = new URL(request.url).searchParams.get("url");
  if (!rawUrl) return Response.json({ error: "Missing stream URL" }, { status: 400 });

  let url;
  try {
    url = new URL(rawUrl);
    if (!/^https?:$/.test(url.protocol)) throw new Error("Unsupported stream URL");
  } catch {
    return Response.json({ ok: false, error: "Invalid stream URL" }, { status: 400 });
  }

  try {
    const result = await checkUrl(url.toString());
    return Response.json({ url: url.toString(), ...result }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
    });
  } catch (error) {
    if (error instanceof UnsafeUrlError) {
      return Response.json({ ok: false, error: "Invalid stream URL" }, { status: 400 });
    }
    return Response.json({ url: url.toString(), ok: false, status: 0, error: error.message }, { status: 200 });
  }
}
