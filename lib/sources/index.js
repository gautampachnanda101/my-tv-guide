import { dedupeAndMergeChannels, rankStreams } from './normalize.js';

export function buildCanonicalChannelCatalog(rawChannels = []) {
  const merged = dedupeAndMergeChannels(rawChannels);

  return merged.map((channel) => {
    const streamItems = [...(channel.streamItems || [])].map((item) => ({
      ...item,
      url: item.url || item.streamUrl || null,
      status: item.status || 'unknown',
      quality: item.quality || 'unknown',
      source: item.source || channel.primarySource || channel.source || 'unknown'
    }));

    const fallbackStreams = (channel.streamUrls || []).map((url) => ({
      url,
      source: channel.primarySource || channel.source || 'unknown',
      status: 'unknown',
      quality: 'unknown'
    }));

    const ranked = rankStreams([...streamItems, ...fallbackStreams]);

    return {
      ...channel,
      selectedStreamUrl: ranked[0]?.url || channel.streamUrl || null,
      streamItems: ranked,
      streamUrls: ranked.map((item) => item.url).filter(Boolean)
    };
  });
}

export function buildSourceSummary(channels = []) {
  const summary = new Map();

  for (const channel of channels) {
    for (const item of channel.streamItems || []) {
      const source = String(item.source || 'unknown');
      const entry = summary.get(source) || {
        source,
        total: 0,
        healthy: 0,
        dead: 0,
        unknown: 0
      };

      entry.total += 1;
      if (item.status === 'online') entry.healthy += 1;
      else if (item.status === 'dead') entry.dead += 1;
      else entry.unknown += 1;

      summary.set(source, entry);
    }
  }

  return Array.from(summary.values()).sort((a, b) => b.healthy - a.healthy);
}

export function buildSourceAwareGuideData(rawChannels = []) {
  const channels = buildCanonicalChannelCatalog(rawChannels);
  return {
    channels,
    selectedChannels: channels.filter((channel) => channel.selectedStreamUrl),
    sourceSummary: buildSourceSummary(channels)
  };
}
