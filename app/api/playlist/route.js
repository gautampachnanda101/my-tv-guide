const MAX_PLAYLIST_BYTES = 5 * 1024 * 1024;
const MAX_ENTRIES = 500;

function isPrivateHostname(hostname) {
  const host = hostname.toLowerCase().replace(/[\[\]]/g, "");
  if (host === "localhost" || host === "localhost.localdomain" || host === "::1") return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;

  const private172 = host.match(/^172\.(\d+)\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;

  return host === "169.254.169.254" || host.endsWith(".local");
}

function parseExtInf(line) {
  const commaIndex = line.indexOf(",");
  const metadata = commaIndex >= 0 ? line.slice(0, commaIndex) : line;
  const title = commaIndex >= 0 ? line.slice(commaIndex + 1).trim() : "Untitled stream";
  const attributes = {};
  const attributePattern = /(tvg-[\w-]+|group-title|channel-id)="([^"]*)"/g;
  let match;

  while ((match = attributePattern.exec(metadata)) !== null) {
    attributes[match[1]] = match[2];
  }

  return {
    title: attributes["tvg-name"] || title || "Untitled stream",
    group: attributes["group-title"] || "",
    logo: attributes["tvg-logo"] || null
  };
}

function parsePlaylist(text, sourceUrl) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const entries = [];
  let metadata = null;

  for (const line of lines) {
    if (line.startsWith("#EXTINF")) {
      metadata = parseExtInf(line);
      continue;
    }

    if (line.startsWith("#")) continue;

    let streamUrl;
    try {
      streamUrl = new URL(line, sourceUrl).toString();
      // Vercel serves the player over HTTPS; prefer the secure equivalent so
      // browser mixed-content rules do not block otherwise valid HLS streams.
      if (streamUrl.startsWith("http://")) streamUrl = `https://${streamUrl.slice(7)}`;
    } catch {
      metadata = null;
      continue;
    }

    entries.push({
      id: `${entries.length}-${streamUrl}`,
      title: metadata?.title || `Stream ${entries.length + 1}`,
      group: metadata?.group || "",
      logo: metadata?.logo || null,
      url: streamUrl
    });
    metadata = null;

    if (entries.length >= MAX_ENTRIES) break;
  }

  return entries;
}

export async function GET(request) {
  const source = new URL(request.url).searchParams.get("url");
  if (!source) return Response.json({ error: "Missing playlist URL" }, { status: 400 });

  let playlistUrl;
  try {
    playlistUrl = new URL(source);
    if (!/^https?:$/.test(playlistUrl.protocol) || isPrivateHostname(playlistUrl.hostname)) {
      throw new Error("Unsupported playlist host");
    }
  } catch {
    return Response.json({ error: "Invalid playlist URL" }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(playlistUrl, {
      signal: controller.signal,
      headers: { Accept: "audio/x-mpegurl, application/vnd.apple.mpegurl, text/plain, */*" },
      cache: "no-store"
    });
    if (!response.ok) return Response.json({ error: `Playlist returned ${response.status}` }, { status: 502 });

    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_PLAYLIST_BYTES) {
      return Response.json({ error: "Playlist is too large" }, { status: 413 });
    }

    return Response.json({ source: playlistUrl.toString(), entries: parsePlaylist(text, playlistUrl) }, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" }
    });
  } catch (error) {
    return Response.json({ error: error.name === "AbortError" ? "Playlist request timed out" : "Could not load playlist" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
