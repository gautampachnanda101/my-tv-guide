import { resilientFetch } from '@/lib/framework/resilientFetch';

const DEFAULT_XMLTV_UK_URL = 'https://raw.githubusercontent.com/dp247/Freeview-EPG/master/epg.xml';

function decodeXml(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function parseXmlTvDate(value) {
  const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!match) return null;

  const [, y, m, d, h, minutes, s] = match;
  const date = new Date(`${y}-${m}-${d}T${h}:${minutes}:${s}Z`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)</${tagName}>`, 'i');
  const match = text.match(regex);
  return match ? decodeXml(match[1]) : '';
}

function buildXmlTvIndex(xmlText) {
  const channelNameById = {};
  const channelRegex = /<channel\s+([^>]*id="[^"]+"[^>]*)>([\s\S]*?)<\/channel>/g;
  let channelMatch;

  while ((channelMatch = channelRegex.exec(xmlText)) !== null) {
    const attrs = parseAttributes(channelMatch[1]);
    const body = channelMatch[2];
    const name = extractXmlTag(body, 'display-name') || attrs.id;
    if (attrs.id) channelNameById[attrs.id] = name;
  }

  return channelNameById;
}

export async function fetchXmlTvSource(xmlUrl) {
  try {
    const resolvedXmlUrl = xmlUrl || DEFAULT_XMLTV_UK_URL;
    const xml = await resilientFetch(
      `xmltv:${resolvedXmlUrl}`,
      resolvedXmlUrl,
      { headers: { Accept: 'application/xml,text/xml;q=0.9,*/*;q=0.8' } },
      { ttlMs: 1800000, staleMs: 24 * 3600000, timeoutMs: 25000, parse: 'text' }
    );

    const channelNameById = buildXmlTvIndex(xml);
    const programmeRegex = /<programme\s+([^>]*)>([\s\S]*?)<\/programme>/g;
    const items = [];
    let match;

    while ((match = programmeRegex.exec(xml)) !== null && items.length < 1200) {
      const attrs = parseAttributes(match[1]);
      const body = match[2];
      const startAt = parseXmlTvDate(attrs.start);
      if (!startAt) continue;

      const title = extractXmlTag(body, 'title') || 'Untitled';
      items.push({
        id: `xmltv-${attrs.channel || 'ch'}-${attrs.start || items.length}`,
        source: 'xmltv',
        title,
        show: title,
        channel: channelNameById[attrs.channel] || attrs.channel || 'Unknown channel',
        summary: extractXmlTag(body, 'desc') || 'No summary available.',
        startAt,
        endAt: parseXmlTvDate(attrs.stop),
        runtimeMinutes: null,
        type: 'Broadcast',
        genres: []
      });
    }

    return {
      source: 'xmltv',
      items,
      feedUrl: resolvedXmlUrl
    };
  } catch {
    return { source: 'xmltv', items: [], feedUrl: xmlUrl || DEFAULT_XMLTV_UK_URL };
  }
}
