import { fetchIptvOrgSource } from './adapters/iptvOrg.js';
import { fetchXmlTvSource } from './adapters/xmltv.js';
import { fetchTvMazeSource } from './adapters/tvmaze.js';

export const sourceRegistry = [
  {
    id: 'iptv-org',
    name: 'IPTV-org',
    type: 'channels',
    adapter: fetchIptvOrgSource,
    trust: 5,
    enabled: true
  },
  {
    id: 'xmltv',
    name: 'XMLTV',
    type: 'schedule',
    adapter: fetchXmlTvSource,
    trust: 4,
    enabled: true
  },
  {
    id: 'tvmaze',
    name: 'TVMaze',
    type: 'schedule',
    adapter: fetchTvMazeSource,
    trust: 3,
    enabled: true
  }
];

export async function loadSourceData() {
  const results = {};

  for (const source of sourceRegistry) {
    if (!source.enabled) continue;

    try {
      const data = source.type === 'schedule' && source.id === 'xmltv'
        ? await source.adapter(process.env.OPEN_XMLTV_UK_URL)
        : await source.adapter();
      results[source.id] = data;
    } catch (error) {
      console.warn(`[source-registry] failed for ${source.id}:`, error);
      results[source.id] = source.type === 'schedule' ? { source: source.id, items: [] } : [];
    }
  }

  return results;
}
