import { resilientFetch } from '@/lib/framework/resilientFetch';

const TVMAZE_SCHEDULE_URL = 'https://api.tvmaze.com/schedule?country=GB';

export async function fetchTvMazeSource() {
  try {
    const rows = await resilientFetch(
      'tvmaze:uk-schedule',
      TVMAZE_SCHEDULE_URL,
      { headers: { Accept: 'application/json' } },
      { ttlMs: 300000, staleMs: 3600000, timeoutMs: 15000 }
    );

    if (!Array.isArray(rows)) return [];

    return rows.map((item) => ({
      id: `tvmaze-${item?._links?.show?.href || item?.id || Math.random().toString(36).slice(2)}`,
      source: 'tvmaze',
      title: item?._embedded?.show?.name || item?.name || 'Unknown show',
      show: item?._embedded?.show?.name || item?.name || 'Unknown show',
      channel: item?._embedded?.show?.network?.name || item?.network || 'Unknown channel',
      startAt: item?.airstamp || new Date().toISOString(),
      endAt: item?.airstamp ? new Date(new Date(item.airstamp).getTime() + 30 * 60000).toISOString() : null,
      runtimeMinutes: item?.runtime || null,
      type: 'Broadcast',
      genres: Array.isArray(item?._embedded?.show?.genres) ? item._embedded.show.genres : []
    }));
  } catch {
    return [];
  }
}
