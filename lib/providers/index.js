import { getUkGuideData } from "@/lib/providers/uk";

const providers = {
  uk: getUkGuideData
};

export async function getGuideData({ region = "uk", query = "", country = "", genre = "", page = 1, pageSize = 100, catalogOnly = false, includeAdult = false } = {}) {
  const provider = providers[region];

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