import { resilientFetch } from '@/lib/framework/resilientFetch';

const IPTV_ORG_CHANNELS_URL = process.env.IPTV_ORG_CHANNELS_URL || 'https://iptv-org.github.io/api/channels.json';
const IPTV_ORG_STREAMS_URL = process.env.IPTV_ORG_STREAMS_URL || 'https://iptv-org.github.io/api/streams.json';

function normalizeLookupKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

async function fetchStreamLookup() {
  try {
    const rows = await resilientFetch(
      'iptv-org:streams',
      IPTV_ORG_STREAMS_URL,
      { headers: { Accept: 'application/json' } },
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

      for (const key of keys) {
        const existing = byKey.get(key);
        if (!existing || String(url).length > String(existing).length) {
          byKey.set(key, url);
        }
      }
    }

    return byKey;
  } catch {
    return new Map();
  }
}

export async function fetchIptvOrgSource() {
  try {
    const [rows, streamLookup] = await Promise.all([
      resilientFetch(
        'iptv-org:channels',
        IPTV_ORG_CHANNELS_URL,
        { headers: { Accept: 'application/json' } },
        { ttlMs: 21600000, staleMs: 3 * 86400000, timeoutMs: 20000 }
      ),
      fetchStreamLookup()
    ]);

    if (!Array.isArray(rows)) return [];

    return rows
      .filter((row) => row && row.name)
      .slice(0, 250)
      .map((row) => ({
        id: `iptv-${String(row.id || row.name).toLowerCase().replace(/\s+/g, '-')}`,
        name: row.name,
        country: row.country || null,
        genre: row.categories?.[0] || 'General',
        languages: Array.isArray(row.languages) ? row.languages : [],
        logo: row.logo || null,
        website: row.website || null,
        source: 'iptv-org',
        streamUrl: streamLookup.get(normalizeLookupKey(row.id))
          || streamLookup.get(normalizeLookupKey(row.name))
          || streamLookup.get(normalizeLookupKey(row.tvg_id))
          || null,
        streamUrls: streamLookup.get(normalizeLookupKey(row.id))
          || streamLookup.get(normalizeLookupKey(row.name))
          || streamLookup.get(normalizeLookupKey(row.tvg_id))
          ? [streamLookup.get(normalizeLookupKey(row.id)) || streamLookup.get(normalizeLookupKey(row.name)) || streamLookup.get(normalizeLookupKey(row.tvg_id))] : []
      }));
  } catch {
    return [];
  }
}
