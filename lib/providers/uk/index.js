import { ukStreamingApps, ukTvChannels } from "@/lib/regions/uk/catalog";
import { getUkOpenSourceRegistry } from "@/lib/providers/open/registry";
import { fetchUkChannelsFromIptvOrg, fetchUkScheduleFromXmlTv } from "@/lib/providers/uk/open-standards";
import { fetchUkSchedule } from "@/lib/providers/uk/tvmaze";

function includesSearch(value, query) {
  return String(value || "").toLowerCase().includes(query.toLowerCase());
}

function matchQuery(item, query) {
  if (!query) return true;
  return Object.values(item).some((value) => {
    if (Array.isArray(value)) {
      return value.some((v) => includesSearch(v, query));
    }
    return includesSearch(value, query);
  });
}

function splitLiveAndUpcoming(scheduleItems) {
  const now = new Date();
  const liveNow = [];
  const upcoming = [];

  for (const item of scheduleItems) {
    if (!item.startAt) continue;
    const start = new Date(item.startAt);
    const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + 30 * 60 * 1000);

    if (start <= now && now <= end) {
      liveNow.push(item);
    } else if (start > now) {
      upcoming.push(item);
    }
  }

  upcoming.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

  return {
    liveNow,
    upcoming: upcoming.slice(0, 20)
  };
}

function dedupeById(items) {
  const byId = new Map();
  for (const item of items) {
    if (!item || !item.id) continue;
    if (!byId.has(item.id)) {
      byId.set(item.id, item);
    }
  }
  return Array.from(byId.values());
}

function sortByStart(items) {
  return [...items].sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0));
}

function buildSourceStatus() {
  return getUkOpenSourceRegistry().map((source) => ({
    id: source.id,
    name: source.name,
    standard: source.standard,
    integration: source.integration,
    required: source.required,
    env: source.env || null,
    status: source.required ? "pending" : "optional"
  }));
}

export async function getUkGuideData(options = {}) {
  const query = options.query || "";

  let schedule = [];
  let providerWarnings = [];
  let sourceStatus = buildSourceStatus();
  let tvChannels = [...ukTvChannels];

  const [tvMazeResult, iptvResult, xmltvResult] = await Promise.allSettled([
    fetchUkSchedule(),
    fetchUkChannelsFromIptvOrg(),
    fetchUkScheduleFromXmlTv(process.env.OPEN_XMLTV_UK_URL)
  ]);

  if (tvMazeResult.status === "fulfilled") {
    schedule = schedule.concat(tvMazeResult.value);
    sourceStatus = sourceStatus.map((source) =>
      source.id === "tvmaze-schedule" ? { ...source, status: "connected" } : source
    );
  } else {
    providerWarnings.push("TVMaze live schedule provider is temporarily unavailable.");
    sourceStatus = sourceStatus.map((source) =>
      source.id === "tvmaze-schedule" ? { ...source, status: "error" } : source
    );
  }

  if (iptvResult.status === "fulfilled") {
    tvChannels = dedupeById([...tvChannels, ...iptvResult.value]);
    sourceStatus = sourceStatus.map((source) =>
      source.id === "iptv-org-channels" ? { ...source, status: "connected" } : source
    );
  } else {
    providerWarnings.push("IPTV-org channels dataset could not be loaded right now.");
    sourceStatus = sourceStatus.map((source) =>
      source.id === "iptv-org-channels" ? { ...source, status: "error" } : source
    );
  }

  if (xmltvResult.status === "fulfilled") {
    const xmlPayload = xmltvResult.value;
    if (xmlPayload.enabled) {
      schedule = schedule.concat(xmlPayload.items);
      sourceStatus = sourceStatus.map((source) =>
        source.id === "xmltv-feed" ? { ...source, status: "connected" } : source
      );
    } else {
      sourceStatus = sourceStatus.map((source) =>
        source.id === "xmltv-feed" ? { ...source, status: "not-configured" } : source
      );
    }
  } else {
    providerWarnings.push("Configured XMLTV feed could not be parsed.");
    sourceStatus = sourceStatus.map((source) =>
      source.id === "xmltv-feed" ? { ...source, status: "error" } : source
    );
  }

  schedule = dedupeById(sortByStart(schedule));

  const { liveNow, upcoming } = splitLiveAndUpcoming(schedule);

  return {
    region: "uk",
    providerWarnings,
    sourceStatus,
    streamingApps: ukStreamingApps.filter((app) => matchQuery(app, query)),
    tvChannels: tvChannels.filter((channel) => matchQuery(channel, query)),
    liveNow: liveNow.filter((item) => matchQuery(item, query)),
    upcoming: upcoming.filter((item) => matchQuery(item, query))
  };
}