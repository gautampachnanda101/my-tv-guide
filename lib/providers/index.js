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

  const data = await provider({ query, region });
  return { region, ...data };
}

export function getSupportedRegions() {
  return Object.keys(providers);
}