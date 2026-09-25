import { resilientFetch } from "@/lib/framework/resilientFetch";

const TVMAZE_BASE_URL = "https://api.tvmaze.com";

function toIsoDateUTC(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toShowItem(episode) {
  const runtimeMinutes = episode.runtime || episode.show?.runtime || 30;
  const start = episode.airstamp ? new Date(episode.airstamp) : null;
  const end = start ? new Date(start.getTime() + runtimeMinutes * 60 * 1000) : null;

  return {
    id: `tvmaze-${episode.id}`,
    source: "tvmaze",
    title: episode.name,
    show: episode.show?.name || "Unknown show",
    url: episode.url || episode.show?.url || null,
    channel: episode.show?.network?.name || episode.show?.webChannel?.name || "Unknown channel",
    image:
      episode.image?.original ||
      episode.image?.medium ||
      episode.show?.image?.original ||
      episode.show?.image?.medium ||
      null,
    network: episode.show?.network?.name || episode.show?.webChannel?.name || null,
    language: episode.show?.language || null,
    rating: episode.show?.rating?.average || null,
    summary: episode.summary
      ? episode.summary.replace(/<[^>]+>/g, "").trim()
      : "No summary available.",
    startAt: start ? start.toISOString() : null,
    endAt: end ? end.toISOString() : null,
    runtimeMinutes,
    type: episode.show?.type || "Scripted",
    genres: episode.show?.genres || []
  };
}

// TVMaze's /schedule endpoint only returns a single calendar day per request,
// so fetching just "today" meant "upcoming" was really just whatever hours
// were left in the current day - it emptied out every evening. Fetch a
// rolling multi-day window instead so upcoming reflects real future schedule.
// Kept modest (not a full week) since each extra day is another network
// round-trip and more items to parse/group on every cold serverless start.
const TVMAZE_SCHEDULE_DAYS = Math.max(1, Number(process.env.TVMAZE_SCHEDULE_DAYS || 3));

export async function fetchScheduleForCountry(countryCode, days = TVMAZE_SCHEDULE_DAYS) {
  const country = String(countryCode || "GB").toUpperCase();
  const dates = Array.from({ length: Math.max(1, days) }, (_, offset) => {
    const day = new Date();
    day.setUTCDate(day.getUTCDate() + offset);
    return toIsoDateUTC(day);
  });

  const results = await Promise.allSettled(
    dates.map((date) =>
      resilientFetch(
        `tvmaze:schedule:${country}:${date}`,
        `${TVMAZE_BASE_URL}/schedule?country=${encodeURIComponent(country)}&date=${date}`,
        { headers: { Accept: "application/json", "User-Agent": "my-tv-guide/0.1 (open-source TV guide app)" } },
        { ttlMs: 300000, staleMs: 12 * 3600000, timeoutMs: 8000 }
      )
    )
  );

  const items = [];
  for (const result of results) {
    if (result.status === "fulfilled" && Array.isArray(result.value)) {
      items.push(...result.value.map(toShowItem));
    }
  }
  return items;
}

export async function fetchUkSchedule() {
  return fetchScheduleForCountry("GB");
}