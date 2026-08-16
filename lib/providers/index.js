import { getUkGuideData } from "@/lib/providers/uk";

const providers = {
  uk: getUkGuideData
};

export async function getGuideData({ region = "uk", query = "" } = {}) {
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

  return provider({ query });
}

export function getSupportedRegions() {
  return Object.keys(providers);
}