const IPTV_ORG_CHANNELS_URL = process.env.IPTV_ORG_CHANNELS_URL || "https://iptv-org.github.io/api/channels.json";
const DEFAULT_XMLTV_UK_URL = "https://raw.githubusercontent.com/dp247/Freeview-EPG/master/epg.xml";

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

export async function fetchUkChannelsFromIptvOrg() {
  const response = await fetch(IPTV_ORG_CHANNELS_URL, {
    headers: {
      Accept: "application/json"
    },
    next: { revalidate: 21600 }
  });

  if (!response.ok) {
    throw new Error(`IPTV-org request failed with ${response.status}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) return [];

  const seen = new Set();
  const channels = [];

  for (const row of rows) {
    if (row.country !== "GB") continue;
    if (!row.name) continue;

    const id = `iptv-${String(row.id || row.name).toLowerCase().replace(/\s+/g, "-")}`;
    if (seen.has(id)) continue;
    seen.add(id);

    channels.push({
      id,
      name: row.name,
      genre: row.category || "General",
      access: "Varies",
      watchVia: ["Open IPTV ecosystem"],
      source: "iptv-org"
    });
  }

  return channels.slice(0, 120);
}

export async function fetchUkScheduleFromXmlTv(xmlUrl) {
  const resolvedXmlUrl = xmlUrl || DEFAULT_XMLTV_UK_URL;

  const response = await fetch(resolvedXmlUrl, {
    headers: {
      Accept: "application/xml,text/xml;q=0.9,*/*;q=0.8"
    },
    next: { revalidate: 1800 }
  });

  if (!response.ok) {
    throw new Error(`XMLTV request failed with ${response.status}`);
  }

  const xml = await response.text();
  const channelNameById = buildXmlTvIndex(xml);

  const programmeRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g;
  const items = [];
  let match;

  while ((match = programmeRegex.exec(xml)) !== null && items.length < 200) {
    const attrs = parseAttributes(match[1]);
    const body = match[2];

    const startAt = parseXmlTvDate(attrs.start);
    if (!startAt) continue;

    const title = extractXmlTag(body, "title") || "Untitled";
    const summary = extractXmlTag(body, "desc") || "No summary available.";
    const channelName = channelNameById[attrs.channel] || attrs.channel || "Unknown channel";

    items.push({
      id: `xmltv-${attrs.channel || "ch"}-${attrs.start || items.length}`,
      source: "xmltv",
      title,
      show: title,
      channel: channelName,
      summary,
      startAt,
      endAt: parseXmlTvDate(attrs.stop),
      runtimeMinutes: null,
      type: "Broadcast",
      genres: []
    });
  }

  return {
    items,
    enabled: true,
    reason: xmlUrl ? "configured" : "default",
    feedUrl: resolvedXmlUrl
  };
}