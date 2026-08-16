import { ukStreamingApps, ukTvChannels } from "@/lib/regions/uk/catalog";
import { getUkOpenSourceRegistry } from "@/lib/providers/open/registry";
import { fetchUkChannelsFromIptvOrg, fetchUkScheduleFromXmlTv } from "@/lib/providers/uk/open-standards";
import { fetchUkSchedule } from "@/lib/providers/uk/tvmaze";
import { enrichScheduleWithTmdb, tmdbHealthCheck } from "@/lib/providers/uk/tmdb";
import { enrichScheduleWithJustWatch, justWatchHealthCheck, getPopularUkStreamingServices } from "@/lib/providers/uk/justwatch";

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function normalizeLookupKey(value) {
  return normalizeText(value);
}

function toTokens(value) {
  return normalizeText(value)
    .split(/\s+/)
    .filter(Boolean);
}

function hasSubsequenceMatch(term, token) {
  let i = 0;
  let j = 0;
  while (i < term.length && j < token.length) {
    if (term[i] === token[j]) i += 1;
    j += 1;
  }
  return i === term.length;
}

function boundedLevenshtein(a, b, maxDistance = 2) {
  if (a === b) return 0;
  if (!a || !b) return maxDistance + 1;
  if (Math.abs(a.length - b.length) > maxDistance) return maxDistance + 1;

  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);

  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    let rowMin = curr[0];

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
      rowMin = Math.min(rowMin, curr[j]);
    }

    if (rowMin > maxDistance) return maxDistance + 1;

    for (let j = 0; j <= b.length; j += 1) {
      prev[j] = curr[j];
    }
  }

  return prev[b.length];
}

function bestTermScore(values, term) {
  const normalizedTerm = normalizeText(term);
  if (!normalizedTerm) return 0;

  let best = 0;
  const termTokens = toTokens(normalizedTerm);

  for (const value of values) {
    const normalizedValue = normalizeText(value);
    if (!normalizedValue) continue;

    if ((` ${normalizedValue} `).includes(` ${normalizedTerm} `)) {
      best = Math.max(best, 1);
      continue;
    }

    const valueTokens = toTokens(normalizedValue);
    for (const token of valueTokens) {
      for (const termToken of termTokens) {
        if (!termToken || !token) continue;

        if (token === termToken) {
          best = Math.max(best, 0.98);
          continue;
        }

        if (token.startsWith(termToken) || termToken.startsWith(token)) {
          best = Math.max(best, 0.9);
          continue;
        }

        const distance = boundedLevenshtein(token, termToken, 2);
        if (distance <= 1) {
          best = Math.max(best, 0.78);
          continue;
        }

        if (distance <= 2 && termToken.length >= 5) {
          best = Math.max(best, 0.66);
          continue;
        }

        if (termToken.length >= 4 && hasSubsequenceMatch(termToken, token)) {
          best = Math.max(best, 0.58);
        }
      }
    }
  }

  return best;
}

function toArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function collectValues(value, output) {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectValues(item, output);
    }
    return;
  }

  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      collectValues(item, output);
    }
    return;
  }

  output.push(String(value));
}

function expandQueryTerms(query) {
  const terms = String(query || "")
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  if (terms.some((term) => term.startsWith("sport"))) {
    terms.push("sport", "sports", "football", "eurosport", "sky sports", "tnt sports");
  }

  return Array.from(new Set(terms));
}

function isSportsIntent(query) {
  const base = normalizeText(query);
  return /\b(sport|sports|football|soccer|premier league|f1|formula 1|rugby|cricket|tennis)\b/.test(base);
}

function matchQuery(item, query) {
  if (!query) return true;

  // Collect all genre-related values (both singular and plural)
  const genreValues = [
    item.genre,
    item.category,
    ...toArray(item.genres)
  ];

  const primaryValues = [
    item.name,
    item.show,
    item.title,
    item.channel,
    item.type,
    item.network,
    ...genreValues
  ];

  const taxonomyValues = [
    ...toArray(item.highlights),
    ...toArray(item.watchVia)
  ];

  const rawTerms = normalizeText(query)
    .split(/\s+/)
    .filter(Boolean);

  if (isSportsIntent(query)) {
    const sportsTerms = expandQueryTerms(query);
    // For sports intent, rely only on semantic fields and require a stronger fuzzy score.
    return sportsTerms.some((term) => bestTermScore([...primaryValues, ...taxonomyValues], term) >= 0.66);
  }

  // Check genre match first with lower threshold for better recall
  const genreScore = rawTerms.length > 0 
    ? Math.max(...rawTerms.map((term) => bestTermScore(genreValues, term)))
    : 0;
  
  if (genreScore >= 0.58) {
    return true;
  }

  const searchable = [];
  collectValues(item, searchable);
  const expandedTerms = expandQueryTerms(query);
  const directTermScores = rawTerms.map((term) => bestTermScore(searchable, term));

  if (directTermScores.length > 0 && directTermScores.every((score) => score >= 0.58)) {
    return true;
  }

  if (bestTermScore(searchable, query) >= 0.66) {
    return true;
  }

  return expandedTerms.some((term) => bestTermScore(searchable, term) >= 0.66);
}

function splitLiveAndUpcoming(scheduleItems) {
  const now = new Date();
  const londonDayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London"
  }).format(now);
  const liveNow = [];
  const upcoming = [];
  const today = [];

  for (const item of scheduleItems) {
    if (!item.startAt) continue;
    const start = new Date(item.startAt);
    const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + 30 * 60 * 1000);
    const startDayKey = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/London"
    }).format(start);

    if (startDayKey === londonDayKey) {
      today.push(item);
    }

    if (start <= now && now <= end) {
      liveNow.push(item);
    } else if (start > now) {
      upcoming.push(item);
    }
  }

  upcoming.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
  today.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));

  return {
    liveNow,
    upcoming,
    today
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

function getFallbackWatchVia(channelName) {
  const normalized = normalizeLookupKey(channelName);
  if (!normalized) return [];

  if (/^bbc\b/.test(normalized)) return ["Freely", "BBC iPlayer"];
  if (/^itv\b/.test(normalized)) return ["ITVX"];
  if (/^(channel 4|e4|more4|film4|4seven)$/.test(normalized)) return ["Channel 4 app"];
  if (/^(channel 5|5action|5star|5usa|5select)$/.test(normalized)) return ["My5"];
  if (/^(dave|drama|yesterday|w)$/.test(normalized)) return ["U"];
  if (/^(gold|comedy central|mtv|nickelodeon|cartoon network|cartoonito|boomerang|sky )/.test(normalized)) {
    return ["NOW"];
  }

  return [];
}

function buildSourceStatus() {
  return [
    ...getUkOpenSourceRegistry().map((source) => ({
      id: source.id,
      name: source.name,
      standard: source.standard,
      integration: source.integration,
      url: source.url || null,
      defaultUrl: source.defaultUrl || null,
      required: source.required,
      env: source.env || null,
      status: source.required ? "pending" : "optional"
    })),
    // Add TMDB and JustWatch to source status
    {
      id: "tmdb-metadata",
      name: "TMDB Metadata",
      standard: "REST API",
      integration: "tmdb",
      url: "https://www.themoviedb.org/",
      required: false,
      env: "TMDB_API_KEY",
      status: "optional"
    },
    {
      id: "justwatch-streaming",
      name: "JustWatch Streaming",
      standard: "REST API",
      integration: "justwatch",
      url: "https://www.justwatch.com/",
      required: false,
      env: null,
      status: "optional"
    }
  ];
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

  const channelLookup = new Map();
  for (const channel of tvChannels) {
    const key = normalizeLookupKey(channel.name);
    if (!key) continue;
    channelLookup.set(key, channel);
  }

  schedule = schedule.map((item) => {
    const matchedChannel = channelLookup.get(normalizeLookupKey(item.channel));
    const fallbackWatchVia = getFallbackWatchVia(item.channel);
    if (!matchedChannel) {
      return {
        ...item,
        watchVia: item.watchVia && item.watchVia.length > 0 ? item.watchVia : fallbackWatchVia
      };
    }
    return {
      ...item,
      streamUrl: item.streamUrl || matchedChannel.streamUrl || null,
      channelWebsite: item.channelWebsite || matchedChannel.website || null,
      watchVia:
        item.watchVia && item.watchVia.length > 0
          ? item.watchVia
          : matchedChannel.watchVia && matchedChannel.watchVia.length > 0
            ? matchedChannel.watchVia
            : fallbackWatchVia
    };
  });

  schedule = dedupeById(sortByStart(schedule));

  // Enrich schedule with TMDB metadata and JustWatch streaming availability
  // Only enrich a subset to avoid rate limits (top 50 items)
  const itemsToEnrich = schedule.slice(0, 50);
  const remainingItems = schedule.slice(50);
  
  let enrichedItems = itemsToEnrich;
  
  // Try TMDB enrichment
  const tmdbHealthy = await tmdbHealthCheck();
  if (tmdbHealthy) {
    try {
      enrichedItems = await enrichScheduleWithTmdb(itemsToEnrich);
      sourceStatus = sourceStatus.map((source) =>
        source.id === "tmdb-metadata" ? { ...source, status: "connected" } : source
      );
    } catch (error) {
      console.warn("TMDB enrichment failed:", error);
      providerWarnings.push("TMDB metadata enrichment is temporarily unavailable.");
      sourceStatus = sourceStatus.map((source) =>
        source.id === "tmdb-metadata" ? { ...source, status: "error" } : source
      );
    }
  } else {
    sourceStatus = sourceStatus.map((source) =>
      source.id === "tmdb-metadata" ? { ...source, status: "not-configured" } : source
    );
  }

  // Try JustWatch enrichment (only for enriched items to get streaming availability)
  const justWatchHealthy = await justWatchHealthCheck();
  if (justWatchHealthy) {
    try {
      enrichedItems = await enrichScheduleWithJustWatch(enrichedItems);
      sourceStatus = sourceStatus.map((source) =>
        source.id === "justwatch-streaming" ? { ...source, status: "connected" } : source
      );
    } catch (error) {
      console.warn("JustWatch enrichment failed:", error);
      providerWarnings.push("Streaming availability data is temporarily unavailable.");
      sourceStatus = sourceStatus.map((source) =>
        source.id === "justwatch-streaming" ? { ...source, status: "error" } : source
      );
    }
  } else {
    sourceStatus = sourceStatus.map((source) =>
      source.id === "justwatch-streaming" ? { ...source, status: "not-configured" } : source
    );
  }
  
  // Combine enriched and remaining items
  schedule = [...enrichedItems, ...remainingItems];

  const { liveNow, upcoming, today } = splitLiveAndUpcoming(schedule);

  return {
    region: "uk",
    providerWarnings,
    sourceStatus,
    streamingApps: ukStreamingApps.filter((app) => matchQuery(app, query)),
    tvChannels: tvChannels.filter((channel) => matchQuery(channel, query)),
    today: today.filter((item) => matchQuery(item, query)),
    liveNow: liveNow.filter((item) => matchQuery(item, query)),
    upcoming: upcoming.filter((item) => matchQuery(item, query))
  };
}