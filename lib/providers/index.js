import { createRegionProvider, getWorldwideGuideData, UK_REGION_CONFIG } from "@/lib/providers/uk";

// Each entry is a plain provider function (options) => data - createRegionProvider
// adapts the shared, generic getRegionGuideData(regionConfig, options) implementation
// to that shape. Adding a new region means adding its own *_REGION_CONFIG, not a new
// bespoke function here.
const providers = {
  uk: createRegionProvider(UK_REGION_CONFIG)
};

// Providers hold up to a week of listings (the Timeline's day picker), but
// sending all of it on every page load would roughly triple the payload. The
// main response carries this much of "upcoming"; later days come from
// getGuideDay, one day at a time, when the Timeline asks for them.
const MAIN_RESPONSE_UPCOMING_MS = 48 * 3600 * 1000;

const londonDayFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" });

export async function getGuideData({ region = "uk", query = "", country = "", genre = "", page = 1, pageSize = 100, catalogOnly = false, includeAdult = false } = {}) {
  const provider = providers[region] || getWorldwideGuideData;

  if (!provider) {
    return {
      region,
      providerWarnings: [`No provider found for region '${region}'.`],
      streamingApps: [],
      tvChannels: [],
      liveNow: [],
      upcoming: []
    };
  }

  const data = await provider({ query, region, country, genre, page, pageSize, catalogOnly, includeAdult });
  // A search narrows the listings to a handful of items, so it keeps the
  // whole week - "bollywood" should find next Saturday's show too.
  if (query) return { region, ...data };

  const upcomingCutoff = Date.now() + MAIN_RESPONSE_UPCOMING_MS;
  return {
    region,
    ...data,
    upcoming: (data.upcoming || []).filter((item) => Date.parse(item.startAt) <= upcomingCutoff)
  };
}

/**
 * Every programme starting on `day` (YYYY-MM-DD, London time) for a region,
 * matching `query` the same way the main response does. Reuses the
 * provider's cached dataset, so this is a filter, not a fresh fetch.
 */
export async function getGuideDay({ region = "uk", query = "", day, includeAdult = false } = {}) {
  const provider = providers[region] || getWorldwideGuideData;
  const data = await provider({ query, region, catalogOnly: false, includeAdult, pageSize: 25 });

  const seen = new Set();
  const programmes = [...(data.liveNow || []), ...(data.today || []), ...(data.upcoming || [])].filter((item) => {
    if (!item?.startAt || seen.has(item.id)) return false;
    seen.add(item.id);
    return londonDayFormat.format(new Date(item.startAt)) === day;
  });
  programmes.sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));

  return { region, day, programmes, providerWarnings: data.providerWarnings || [] };
}

export function getSupportedRegions() {
  return Object.keys(providers);
}
