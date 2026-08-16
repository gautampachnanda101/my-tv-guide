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

export async function fetchUkSchedule() {
  const date = toIsoDateUTC(new Date());
  const url = `${TVMAZE_BASE_URL}/schedule?country=GB&date=${date}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/json"
    },
    next: { revalidate: 300 }
  });

  if (!response.ok) {
    throw new Error(`TVMaze request failed with ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    return [];
  }

  return data.map(toShowItem);
}