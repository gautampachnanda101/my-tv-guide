const SOURCE_WEIGHTS = {
  'iptv-org': 18,
  xmltv: 14,
  tvmaze: 10,
  'custom-m3u': 8,
  community: 7,
  user: 5,
  unknown: 0
};

const QUALITY_WEIGHTS = {
  hd: 20,
  '720p': 18,
  '1080p': 22,
  '4k': 26,
  sd: 6,
  low: 2,
  unknown: 0
};

export function scoreStreamHealth(stream = {}) {
  const url = String(stream.url || stream.streamUrl || '').trim();
  const rawStatus = String(stream.status || 'unknown').toLowerCase();
  const rawQuality = String(stream.quality || stream.qualityLabel || 'unknown').toLowerCase();
  const source = String(stream.source || 'unknown').toLowerCase();
  const reason = String(stream.reason || stream.statusText || '').toLowerCase();

  let score = 0;

  if (rawStatus === 'online') score += 55;
  else if (rawStatus === 'blocked') score -= 45;
  else if (rawStatus === 'dead') score -= 80;
  else score -= 12;

  if (/\.m3u8|\.mpd|\.mp4|\.webm/i.test(url)) score += 14;
  if (/https?:\/\//i.test(url)) score += 8;

  const qualityScore = Object.entries(QUALITY_WEIGHTS).find(([key]) => rawQuality.includes(key));
  if (qualityScore) score += qualityScore[1];

  score += SOURCE_WEIGHTS[source] ?? 0;

  if (/geo|blocked|403|forbidden|refused|not authorized/i.test(reason)) score -= 35;
  if (/dead|timeout|failed|unavailable/i.test(reason)) score -= 45;

  let normalizedStatus = 'unknown';
  if (score >= 45) normalizedStatus = 'online';
  else if (score >= 10) normalizedStatus = 'unknown';
  else normalizedStatus = 'dead';

  return {
    score,
    status: normalizedStatus,
    quality: rawQuality || 'unknown',
    url
  };
}

export function normalizeStreamStatus(stream = {}) {
  const health = scoreStreamHealth(stream);
  return {
    ...stream,
    url: health.url,
    quality: health.quality,
    status: health.status,
    healthScore: health.score
  };
}
