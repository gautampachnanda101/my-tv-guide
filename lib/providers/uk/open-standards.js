import { resilientFetch } from "@/lib/framework/resilientFetch";

const IPTV_ORG_CHANNELS_URL = process.env.IPTV_ORG_CHANNELS_URL || "https://iptv-org.github.io/api/channels.json";
const IPTV_ORG_STREAMS_URL = process.env.IPTV_ORG_STREAMS_URL || "https://iptv-org.github.io/api/streams.json";
const IPTV_ORG_FEEDS_URL = process.env.IPTV_ORG_FEEDS_URL || "https://iptv-org.github.io/api/feeds.json";
const IPTV_ORG_LANGUAGES_URL = process.env.IPTV_ORG_LANGUAGES_URL || "https://iptv-org.github.io/api/languages.json";
const DEFAULT_XMLTV_UK_URL = "https://raw.githubusercontent.com/dp247/Freeview-EPG/master/epg.xml";
const XMLTV_ITEM_LIMIT = Number(process.env.XMLTV_ITEM_LIMIT || 1200);

function normalizeLookupKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function streamUrlScore(url) {
  const value = String(url || "").toLowerCase();
  if (!value) return 0;
  if (value.includes(".m3u8")) return 10;
  if (value.includes(".mpd")) return 9;
  if (value.includes(".mp4") || value.includes(".webm")) return 8;
  if (value.includes("http://") || value.includes("https://")) return 6;
  return 1;
}

async function fetchUkStreamLookup() {
  try {
    const rows = await resilientFetch(
      "iptv-org:streams",
      IPTV_ORG_STREAMS_URL,
      { headers: { Accept: "application/json" } },
      { ttlMs: 21600000, staleMs: 3 * 86400000, timeoutMs: 20000 }
    );

    if (!Array.isArray(rows)) return new Map();

    const byKey = new Map();

    for (const row of rows) {
      const url = row?.url;
      if (!url) continue;

      const keys = [row.channel, row.channel_id, row.name, row.title, row.tvg_id]
        .map((value) => normalizeLookupKey(value))
        .filter(Boolean);

      if (keys.length === 0) continue;

      for (const key of keys) {
        const existing = byKey.get(key);
        if (!existing || streamUrlScore(url) > streamUrlScore(existing)) {
          byKey.set(key, url);
        }
      }
    }

    return byKey;
  } catch {
    return new Map();
  }
}

function decodeXml(value) {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseAttributes(fragment) {
  const attrs = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let match;

  while ((match = attrRegex.exec(fragment)) !== null) {
    attrs[match[1]] = match[2];
  }

  return attrs;
}

function extractXmlTag(text, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "i");
  const match = text.match(regex);
  return match ? decodeXml(match[1]) : "";
}

function extractXmlTags(text, tagName) {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, "gi");
  const values = [];
  let match;

  while ((match = regex.exec(text)) !== null) {
    const value = decodeXml(match[1]);
    if (value) values.push(value);
  }

  return values;
}

function extractIconUrl(text) {
  const iconMatch = text.match(/<icon[^>]*src="([^"]+)"[^>]*\/?>(?:<\/icon>)?/i);
  return iconMatch ? decodeXml(iconMatch[1]) : null;
}

function parseXmlTvDate(value) {
  // XMLTV date format example: 20260816200000 +0000
  const match = String(value || "").match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!match) return null;

  const [, y, m, d, h, min, s] = match;
  const date = new Date(`${y}-${m}-${d}T${h}:${min}:${s}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function buildXmlTvIndex(xmlText) {
  const channelNameById = {};
  const channelRegex = /<channel\s+([^>]*id="[^"]+"[^>]*)>([\s\S]*?)<\/channel>/g;
  let channelMatch;

  while ((channelMatch = channelRegex.exec(xmlText)) !== null) {
    const attrs = parseAttributes(channelMatch[1]);
    const body = channelMatch[2];
    const name = extractXmlTag(body, "display-name") || attrs.id;
    if (attrs.id) {
      channelNameById[attrs.id] = name;
    }
  }

  return channelNameById;
}

// IPTV-org has no subtitle-availability data anywhere in its API - language
// is the closest real signal it offers, from feeds.json (per-channel
// language codes) joined against languages.json (code -> readable name).
async function fetchChannelLanguages() {
  try {
    const [feeds, languages] = await Promise.all([
      resilientFetch(
        "iptv-org:feeds",
        IPTV_ORG_FEEDS_URL,
        { headers: { Accept: "application/json" } },
        { ttlMs: 21600000, staleMs: 3 * 86400000, timeoutMs: 20000 }
      ),
      resilientFetch(
        "iptv-org:languages",
        IPTV_ORG_LANGUAGES_URL,
        { headers: { Accept: "application/json" } },
        { ttlMs: 7 * 86400000, staleMs: 30 * 86400000, timeoutMs: 20000 }
      )
    ]);

    if (!Array.isArray(feeds) || !Array.isArray(languages)) return new Map();

    const nameByCode = new Map(languages.map((lang) => [lang.code, lang.name]));
    const byChannel = new Map();

    for (const feed of feeds) {
      if (!feed.channel || !Array.isArray(feed.languages) || feed.languages.length === 0) continue;
      const existing = byChannel.get(feed.channel);
      // Prefer the main feed's languages when a channel has several feeds
      // (e.g. regional/HD variants) - it's the most representative one.
      if (existing && !feed.is_main) continue;

      const names = feed.languages.map((code) => nameByCode.get(code) || code).filter(Boolean);
      if (names.length > 0) byChannel.set(feed.channel, names);
    }

    return byChannel;
  } catch {
    return new Map();
  }
}

export async function fetchUkChannelsFromIptvOrg() {
  const rows = await resilientFetch(
    "iptv-org:channels",
    IPTV_ORG_CHANNELS_URL,
    { headers: { Accept: "application/json" } },
    { ttlMs: 21600000, staleMs: 3 * 86400000, timeoutMs: 20000 }
  );

  if (!Array.isArray(rows)) return [];

  const [streamLookup, languageLookup] = await Promise.all([
    fetchUkStreamLookup(),
    fetchChannelLanguages()
  ]);

  const seen = new Set();
  const channels = [];

  for (const row of rows) {
    // No country gate: IPTV-org is a worldwide dataset and filtering it
    // down to one country's channels isn't this list's job. (The previous
    // filter checked for "GB", but IPTV-org actually codes the UK as "UK" -
    // so it silently matched zero rows and this function never contributed
    // any channels at all, regardless of country.)
    if (!row.name) continue;

    const id = `iptv-${String(row.id || row.name).toLowerCase().replace(/\s+/g, "-")}`;
    if (seen.has(id)) continue;
    seen.add(id);

    channels.push({
      id,
      name: row.name,
      genre: row.categories?.[0] || "General",
      access: "Varies",
      country: row.country || null,
      languages: languageLookup.get(row.id) || [],
      // No "Open IPTV ecosystem" placeholder here: it isn't a real app that
      // any link-resolution can point to, so leaving it in the array just
      // made the UI claim a watch path exists when there was none. The
      // channel's own streamUrl (below), when present, is the real path.
      watchVia: [],
      logo: row.logo || null,
      website: row.website || null,
      streamUrl:
        streamLookup.get(normalizeLookupKey(row.id)) ||
        streamLookup.get(normalizeLookupKey(row.name)) ||
        streamLookup.get(normalizeLookupKey(row.tvg_id)) ||
        null,
      source: "iptv-org"
    });
  }

  // Still capped, just much higher than the old (accidentally-always-empty)
  // UK-only list - a worldwide, uncapped channel list would balloon the
  // response payload and DOM on a free-tier deployment with no pagination.
  return channels.slice(0, 1500);
}

export async function fetchUkScheduleFromXmlTv(xmlUrl) {
  const resolvedXmlUrl = xmlUrl || DEFAULT_XMLTV_UK_URL;

  // This feed is several MB, over Next's fetch-cache size limit (2MB), so
  // `next: { revalidate }` silently failed to cache it and re-fetched the
  // whole thing on every request with no timeout - the cause of the
  // ETIMEDOUT errors on flaky connections. resilientFetch caches it
  // ourselves and serves the last good copy if a fetch fails.
  const xml = await resilientFetch(
    `xmltv:${resolvedXmlUrl}`,
    resolvedXmlUrl,
    { headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8" } },
    { ttlMs: 1800000, staleMs: 24 * 3600000, timeoutMs: 25000, parse: "text" }
  );

  const channelNameById = buildXmlTvIndex(xml);

  const programmeRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g;
  const items = [];
  let match;

  while ((match = programmeRegex.exec(xml)) !== null && items.length < XMLTV_ITEM_LIMIT) {
    const attrs = parseAttributes(match[1]);
    const body = match[2];

    const startAt = parseXmlTvDate(attrs.start);
    if (!startAt) continue;

    const title = extractXmlTag(body, "title") || "Untitled";
    const summary = extractXmlTag(body, "desc") || "No summary available.";
    const channelName = channelNameById[attrs.channel] || attrs.channel || "Unknown channel";
    const categories = extractXmlTags(body, "category");

    items.push({
      id: `xmltv-${attrs.channel || "ch"}-${attrs.start || items.length}`,
      source: "xmltv",
      title,
      show: title,
      channel: channelName,
      image: extractIconUrl(body),
      summary,
      startAt,
      endAt: parseXmlTvDate(attrs.stop),
      runtimeMinutes: null,
      type: "Broadcast",
      genres: categories
    });
  }

  return {
    items,
    enabled: true,
    reason: xmlUrl ? "configured" : "default",
    feedUrl: resolvedXmlUrl
  };
}