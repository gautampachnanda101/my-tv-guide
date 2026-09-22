const DEFAULT_SOURCE_PRIORITY = {
  'iptv-org': 5,
  xmltv: 4,
  tvmaze: 3,
  'custom-m3u': 2,
  community: 2,
  user: 1
};

export function normalizeChannelKey(name, country) {
  const cleanName = String(name || '')
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const cleanCountry = String(country || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '');

  return `${cleanName || 'channel'}${cleanCountry ? `-${cleanCountry}` : ''}`;
}

function mergeUnique(values) {
  const seen = new Set();
  const result = [];

  for (const value of values || []) {
    if (!value || seen.has(value)) continue;
    seen.add(value);
    result.push(value);
  }

  return result;
}

function pickPrimarySource(sources) {
  if (!sources || sources.length === 0) return 'unknown';

  return [...sources].sort((a, b) => {
    const aScore = DEFAULT_SOURCE_PRIORITY[a] ?? 0;
    const bScore = DEFAULT_SOURCE_PRIORITY[b] ?? 0;
    return bScore - aScore;
  })[0];
}

export function dedupeAndMergeChannels(channels = []) {
  const map = new Map();

  for (const channel of channels) {
    if (!channel || !channel.name) continue;

    const key = normalizeChannelKey(channel.name, channel.country);
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        id: key,
        name: channel.name,
        country: channel.country || null,
        genre: channel.genre || null,
        isAdult: Boolean(channel.isAdult || channel.genre === 'xxx'),
        languages: mergeUnique(channel.languages || []),
        watchVia: mergeUnique(channel.watchVia || []),
        logo: channel.logo || null,
        website: channel.website || null,
        source: channel.source || 'unknown',
        primarySource: channel.source || 'unknown',
        streamUrls: mergeUnique([
          channel.streamUrl,
          ...(channel.streamUrls || [])
        ].filter(Boolean)),
        streamItems: Array.isArray(channel.streamItems) ? [...channel.streamItems] : []
      });
      continue;
    }

    existing.languages = mergeUnique([...(existing.languages || []), ...(channel.languages || [])]);
    existing.watchVia = mergeUnique([...(existing.watchVia || []), ...(channel.watchVia || [])]);
    existing.streamUrls = mergeUnique([...(existing.streamUrls || []), channel.streamUrl, ...(channel.streamUrls || [])].filter(Boolean));
    existing.logo = existing.logo || channel.logo || null;
    existing.website = existing.website || channel.website || null;
    existing.genre = existing.genre || channel.genre || null;
    existing.isAdult = Boolean(existing.isAdult || channel.isAdult || channel.genre === 'xxx');
    existing.country = existing.country || channel.country || null;
    existing.source = existing.source || channel.source || 'unknown';

    if (Array.isArray(channel.streamItems)) {
      existing.streamItems = mergeUnique(
        [...existing.streamItems, ...channel.streamItems].map((item) => JSON.stringify(item))
      ).map((item) => JSON.parse(item));
    }

    const sources = [existing.primarySource, existing.source, channel.source].filter(Boolean);
    existing.primarySource = pickPrimarySource(sources);
  }

  return [...map.values()];
}

export function rankStreams(streams = []) {
  const ranked = [...streams].map((stream) => ({
    ...stream,
    score: (
      (stream.status === 'online' ? 50 : 0) +
      (stream.status === 'blocked' ? -30 : 0) +
      (stream.status === 'dead' ? -60 : 0) +
      (stream.status === 'unknown' ? -10 : 0) +
      ((stream.quality || '').toLowerCase().includes('hd') ? 20 : 0) +
      ((stream.quality || '').toLowerCase().includes('sd') ? 10 : 0) +
      (DEFAULT_SOURCE_PRIORITY[stream.source] ?? 0)
    )
  }));

  return ranked.sort((a, b) => b.score - a.score);
}
