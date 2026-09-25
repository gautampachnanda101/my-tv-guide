import { createRegionProvider, getWorldwideGuideData, UK_REGION_CONFIG } from "@/lib/providers/uk";

// Each entry is a plain provider function (options) => data - createRegionProvider
// adapts the shared, generic getRegionGuideData(regionConfig, options) implementation
// to that shape. Adding a new region means adding its own *_REGION_CONFIG, not a new
// bespoke function here.
const providers = {
  uk: createRegionProvider(UK_REGION_CONFIG)
};

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
  return { region, ...data };
}

export function getSupportedRegions() {
  return Object.keys(providers);
}