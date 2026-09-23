function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase().replace(/[\[\]]/g, "");
  if (host === "localhost" || host === "localhost.localdomain" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;

  const private172 = host.match(/^172\.(\d+)\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;

  return host === "169.254.169.254" || host.endsWith(".local");
}

async function checkUrl(url) {
  const headers = { Accept: "application/vnd.apple.mpegurl, video/*, */*" };
  let response = await fetch(url, { method: "HEAD", headers, redirect: "follow", signal: AbortSignal.timeout(8000) });

  if (response.status === 401 || response.status === 403 || response.status === 405 || response.status === 501) {
    response = await fetch(url, {
      method: "GET",
      headers: { ...headers, Range: "bytes=0-1023" },
      redirect: "follow",
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
    if (!/^https?:$/.test(url.protocol) || isPrivateHostname(url.hostname)) throw new Error("Unsupported stream host");
  } catch {
    return Response.json({ ok: false, error: "Invalid stream URL" }, { status: 400 });
  }

  try {
    const result = await checkUrl(url.toString());
    return Response.json({ url: url.toString(), ...result }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" }
    });
  } catch (error) {
    return Response.json({ url: url.toString(), ok: false, status: 0, error: error.message }, { status: 200 });
  }
}
