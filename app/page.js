"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import VideoPlayer from "@/lib/components/VideoPlayer";

const mainTabs = [
  { key: "home", label: "Home" },
  { key: "timeline", label: "Timeline" },
  { key: "browse", label: "Browse" }
];

const browseTabs = [
  { key: "today", label: "Today" },
  { key: "liveNow", label: "Live Now" },
  { key: "upcoming", label: "Upcoming" },
  { key: "tvChannels", label: "TV Channels" },
  { key: "streamingApps", label: "Streaming Apps" }
];

// Candidate quick filters with their user-friendly display labels. Which of
// these actually render is decided at runtime from the loaded data (see
// `useAvailableQuickFilters` below) - a chip only appears when a programme,
// channel, or streaming app is actually available for it right now.
const QUICK_FILTER_CANDIDATES = [
  { label: "Sport", query: "sport", tab: "tvChannels", checkPools: ["tvChannels", "today", "liveNow", "upcoming"] },
  { label: "Football", query: "football", tab: "today", checkPools: ["today", "liveNow", "upcoming"] },
  { label: "News", query: "news", tab: "liveNow", checkPools: ["liveNow", "tvChannels", "today"] },
  { label: "Drama", query: "drama", tab: "upcoming", checkPools: ["upcoming", "today", "liveNow"] },
  { label: "Movies", query: "movie", tab: "upcoming", checkPools: ["upcoming", "today", "liveNow"] },
  { label: "Hindi", query: "hindi", tab: "tvChannels", checkPools: ["tvChannels", "upcoming", "today"] },
  { label: "Punjabi", query: "punjabi", tab: "tvChannels", checkPools: ["tvChannels", "upcoming", "today"] },
  { label: "Bollywood", query: "bollywood", tab: "upcoming", checkPools: ["upcoming", "today", "liveNow", "tvChannels"] },
  { label: "Hollywood", query: "hollywood", tab: "upcoming", checkPools: ["upcoming", "today", "liveNow"] },
  { label: "Streaming", query: "", tab: "streamingApps", checkPools: ["streamingApps"] }
];

function normalizeFilterText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function itemMatchesGenreTerm(item, term) {
  const haystack = [
    item.genre,
    item.category,
    ...(Array.isArray(item.genres) ? item.genres : []),
    ...(Array.isArray(item.highlights) ? item.highlights : []),
    ...(Array.isArray(item.languages) ? item.languages : []),
    item.name,
    item.show,
    item.title,
    item.channel
  ]
    .filter(Boolean)
    .map(normalizeFilterText)
    .join(" ");

  return haystack.includes(term);
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// Per-provider deep-linking strategy, ranked by confidence:
//  - buildProgrammeUrl: goes straight to the show's own page.
//  - buildSearchUrl: pre-fills that provider's own search with the title -
//    not as good as a direct page (still requires the user to pick the
//    right result), but far better than dumping them on a homepage.
//  - Neither: no reliable pattern found. Falls back to the homepage.
// Every pattern below was verified live (fetched and confirmed a real
// result page) before being added. Two guessed-but-unverified patterns
// (BBC iPlayer and Disney+ search) were tried and removed after live
// testing showed they 404 / don't resolve - don't re-add a pattern here
// without confirming it actually works first.
// Channel4 and Channel5's own slugs are just the lowercased, hyphenated
// show title, so a title-only guess actually lands on the real page for
// most shows (confirmed: channel4.com/programmes/hit-point).
const WATCH_PROVIDERS = {
  freely: { homepage: "https://www.freely.co.uk/" },
  // Confirmed broken by live testing: bbc.co.uk/iplayer/search?q= does not
  // resolve to a real search page. bbc.co.uk also can't be verified from
  // here (blocks automated fetches), so rather than guess again, this
  // falls back to the homepage until a real pattern is confirmed.
  iplayer: { homepage: "https://www.bbc.co.uk/iplayer" },
  itvx: { homepage: "https://www.itv.com/watch" }, // no reliable pattern found (ITVX's search page didn't respond to verification attempts)
  channel4: {
    homepage: "https://www.channel4.com/",
    buildProgrammeUrl: (title) => `https://www.channel4.com/programmes/${slugify(title)}`
  },
  my5: {
    homepage: "https://www.channel5.com/",
    buildProgrammeUrl: (title) => `https://www.channel5.com/show/${slugify(title)}`
  },
  u: { homepage: "https://u.co.uk/" },
  "s4c-clic": { homepage: "https://www.s4c.cymru/clic/" },
  "stv-player": { homepage: "https://player.stv.tv/" },
  now: { homepage: "https://www.nowtv.com/" },
  "discovery-plus": { homepage: "https://www.discoveryplus.com/gb" }, // guessed /gb/search pattern 404'd on verification - homepage only until a real one is confirmed
  netflix: {
    homepage: "https://www.netflix.com/",
    buildSearchUrl: (title) => `https://www.netflix.com/search?q=${encodeURIComponent(title)}`
  },
  "prime-video": {
    homepage: "https://www.primevideo.com/",
    buildSearchUrl: (title) => `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${encodeURIComponent(title)}`
  },
  // Both guessed patterns (?q= and /search/{title}) 404'd on verification -
  // homepage only until a real one is confirmed.
  "disney-plus": { homepage: "https://www.disneyplus.com/" },
  "apple-tv-plus": {
    homepage: "https://tv.apple.com/",
    buildSearchUrl: (title) => `https://tv.apple.com/search?term=${encodeURIComponent(title)}`
  },
  "paramount-plus": { homepage: "https://www.paramountplus.com/" },
  hayu: { homepage: "https://www.hayu.com/" },
  shudder: { homepage: "https://www.shudder.com/" },
  mubi: { homepage: "https://mubi.com/" },
  "rakuten-tv": { homepage: "https://rakuten.tv/" },
  youtube: {
    homepage: "https://www.youtube.com/",
    buildSearchUrl: (title) => `https://www.youtube.com/results?search_query=${encodeURIComponent(title)}`
  },
  plutotv: { homepage: "https://pluto.tv/" },
  freevee: { homepage: "https://www.amazon.co.uk/gp/video/storefront/ref=atv_dp_freevee" },
  tubitv: { homepage: "https://tubitv.com/" },
  "xumo-play": { homepage: "https://play.xumo.com/" },
  "samsung-tv-plus": { homepage: "https://www.samsung.com/uk/tvs/smart-tv/samsung-tv-plus/" },
  "lg-channels": { homepage: "https://www.lg.com/uk/lg-channels" },
  "roku-channel": { homepage: "https://therokuchannel.roku.com/" },
  plex: { homepage: "https://www.plex.tv/" }
};

const providerIdByName = {
  freely: "freely",
  "bbc iplayer": "iplayer",
  iplayer: "iplayer",
  "bbc one": "iplayer",
  "bbc two": "iplayer",
  "bbc three": "iplayer",
  "bbc four": "iplayer",
  "itv x": "itvx",
  itvx: "itvx",
  "channel 4": "channel4",
  "channel 4 app": "channel4",
  my5: "my5",
  "my 5": "my5",
  "channel 5": "my5",
  "5action": "my5",
  "5star": "my5",
  "5usa": "my5",
  "5select": "my5",
  now: "now",
  "now tv": "now",
  u: "u",
  "discovery+": "discovery-plus",
  "disney+": "disney-plus",
  "apple tv+": "apple-tv-plus",
  "paramount+": "paramount-plus",
  hayu: "hayu",
  shudder: "shudder",
  mubi: "mubi",
  youtube: "youtube",
  plutotv: "plutotv",
  "pluto tv": "plutotv",
  freevee: "freevee",
  tubitv: "tubitv",
  tubi: "tubitv",
  "xumo play": "xumo-play",
  "samsung tv plus": "samsung-tv-plus",
  "lg channels": "lg-channels",
  "the roku channel": "roku-channel",
  plex: "plex"
};

function buildProviderUrl(providerId, title) {
  const provider = WATCH_PROVIDERS[providerId];
  if (!provider) return null;
  if (title) {
    if (provider.buildProgrammeUrl) return provider.buildProgrammeUrl(title);
    if (provider.buildSearchUrl) return provider.buildSearchUrl(title);
  }
  return provider.homepage;
}

function formatDateTime(value) {
  if (!value) return "TBA";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatTime(value) {
  if (!value) return "TBA";
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function toLondonDayKey(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/London"
  }).format(new Date(value));
}

function toLondonTimeMinutes(value) {
  if (!value) return null;
  const date = new Date(value);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
  return hour * 60 + minute;
}

// The timeline track only displays this window (see the rendered hour
// labels below) - a channel whose programmes all fall outside it should not
// get a row at all, otherwise it renders as a blank, seemingly-broken row.
const TIMELINE_WINDOW_START_MINUTES = 14 * 60;
const TIMELINE_WINDOW_END_MINUTES = 23 * 60;

function isWithinTimelineWindow(item) {
  const startMinutes = toLondonTimeMinutes(item.startAt);
  const endMinutes = toLondonTimeMinutes(item.endAt) || (startMinutes !== null ? startMinutes + 30 : null);
  if (startMinutes === null || endMinutes === null) return false;

  const clippedStart = Math.max(startMinutes, TIMELINE_WINDOW_START_MINUTES);
  const clippedEnd = Math.min(endMinutes, TIMELINE_WINDOW_END_MINUTES);
  return clippedEnd > clippedStart;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function formatTimelineDayLabel(index) {
  if (index === 0) return "Today";
  if (index === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(
    addDays(new Date(), index)
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function hashHue(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function channelStripe(channel) {
  const hue = hashHue(String(channel || "channel"));
  return `linear-gradient(180deg, hsl(${hue} 75% 62%), hsl(${(hue + 28) % 360} 78% 52%))`;
}

function getProgrammeStatus(item) {
  const now = Date.now();
  const start = item?.startAt ? new Date(item.startAt).getTime() : null;
  const end = item?.endAt ? new Date(item.endAt).getTime() : null;
  if (!start) return "Soon";
  if (start <= now && (!end || end > now)) return "On now";

  const deltaMinutes = Math.round((start - now) / 60000);
  if (deltaMinutes > 0 && deltaMinutes <= 180) {
    return `Starts in ${deltaMinutes}m`;
  }

  return `Starts ${formatDateTime(item.startAt)}`;
}

function buildUnifiedNowEntries(filteredLiveNow, filteredToday, filteredTvChannels, filteredStreamingApps) {
  const now = Date.now();
  const soonCutoff = now + 4 * 60 * 60 * 1000;
  const liveIds = new Set(filteredLiveNow.map((item) => item.id));

  const entries = [
    ...filteredLiveNow.map((item) => ({ kind: "programme", badge: "LIVE", sortAt: 0, item })),
    ...filteredToday
      .filter((item) => !liveIds.has(item.id) && item.startAt && new Date(item.startAt).getTime() <= soonCutoff)
      .map((item) => ({ kind: "programme", badge: "SOON", sortAt: new Date(item.startAt).getTime(), item })),
    ...filteredTvChannels.map((item) => ({ kind: "channel", badge: "CHANNEL", sortAt: now + 1, item })),
    ...filteredStreamingApps.map((item) => ({ kind: "app", badge: "APP", sortAt: now + 2, item }))
  ];

  entries.sort((a, b) => a.sortAt - b.sortAt);
  return entries.slice(0, 12);
}

function highlightText(value, query) {
  const text = String(value || "");
  const needle = String(query || "").trim();
  if (!needle || needle.length < 2) return text;

  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${escaped})`, "ig");
  const parts = text.split(regex);

  return parts.map((part, index) =>
    index % 2 === 1 ? (
      <mark key={`${part}-${index}`} className="match-mark">{part}</mark>
    ) : (
      <span key={`${part}-${index}`}>{part}</span>
    )
  );
}

function fallbackGradient(seed) {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hueA = Math.abs(hash) % 360;
  const hueB = (hueA + 38) % 360;
  return `linear-gradient(140deg, hsl(${hueA} 72% 44%), hsl(${hueB} 78% 34%))`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function initials(value) {
  const parts = String(value || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() || "").join("");
}

function trimSummary(value, max = 140) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) return "No editorial summary available yet.";
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function MediaThumb({ image, label, tag }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  if (image && !imageFailed) {
    return (
      <div className="thumb-wrap">
        <Image
          src={image}
          alt={`${label} artwork`}
          className="thumb-img"
          fill
          sizes="152px"
          unoptimized
          decoding="async"
          onError={() => setImageFailed(true)}
        />
        <span className="thumb-tag">{tag}</span>
      </div>
    );
  }

  return (
    <div className="thumb-wrap" style={{ background: fallbackGradient(label) }}>
      <div className="thumb-fallback">{initials(label)}</div>
      <span className="thumb-tag">{tag}</span>
    </div>
  );
}

function getSourceLink(source) {
  return source.url || source.defaultUrl || null;
}

function getWatchViaLink(value, title) {
  const key = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
  // Feed/simulcast variants ("5 HD", "ITV1 +1", "BBC One UK") carry the
  // same broadcaster as their plain name, but aren't in the alias list
  // verbatim - strip the variant suffix and retry once before giving up.
  const bareKey = key.replace(/\s+(hd|sd|uk|\+1)$/, "").trim();
  const providerId =
    providerIdByName[key] ||
    providerIdByName[String(value || "").toLowerCase()] ||
    (bareKey !== key ? providerIdByName[bareKey] : null);
  return providerId ? buildProviderUrl(providerId, title) : null;
}

function pushUniqueTarget(targets, seen, label, href) {
  if (!href || seen.has(href)) return;
  seen.add(href);
  targets.push({ label, href });
}

function getWatchTargets(item, type = "programme") {
  const targets = [];
  const seen = new Set();
  const title = item.show || item.title || item.name;

  if (type === "app") {
    const href = getAppLink(item, title);
    if (href) {
      targets.push({ label: "Open app", href });
    }
    return targets;
  }

  // item.streamUrl is intentionally not offered here - it's a raw stream
  // manifest, not a page; it's played in-app via the "Play here" button.
  if (item.url) pushUniqueTarget(targets, seen, "Open programme page", item.url);
  if (item.channelWebsite) pushUniqueTarget(targets, seen, "Open channel site", item.channelWebsite);

  for (const hint of toArray(item.watchVia)) {
    const href = getWatchViaLink(hint, title);
    if (href) pushUniqueTarget(targets, seen, `Watch on ${hint}`, href);
  }

  return targets;
}

// Deliberately excludes item.streamUrl: that's a raw HLS/video manifest,
// not a browsable page - navigating straight to it 404s or gets rejected
// by the CDN (no Referer/player context). It's played in-app instead (see
// the "Play here" button), never used as this external link.
function getProgrammeLink(item) {
  return item.url || getWatchTargets(item, "programme")[0]?.href || null;
}

function getChannelLink(item) {
  return getWatchTargets(item, "channel")[0]?.href || item.url || item.website || item.channelWebsite || null;
}

function getAppLink(item, title) {
  return buildProviderUrl(item.id, title) || item.website || null;
}

export default function HomePage() {
  const [region, setRegion] = useState("uk");
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const [mainTab, setMainTab] = useState("home");
  const [browseTab, setBrowseTab] = useState("today");
  const [timelineDayOffset, setTimelineDayOffset] = useState(0);
  const [isTimelinePending, startTimelineTransition] = useTransition();
  const [selectedItem, setSelectedItem] = useState(null);
  const [playingStream, setPlayingStream] = useState(null);
  const [isFeaturedCompact, setIsFeaturedCompact] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const requestIdRef = useRef(0);
  const [guide, setGuide] = useState({
    today: [],
    liveNow: [],
    upcoming: [],
    tvChannels: [],
    streamingApps: [],
    sourceStatus: [],
    providerWarnings: [],
    supportedRegions: ["uk"]
  });

  async function loadGuide(currentRegion, currentQuery) {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      region: currentRegion,
      q: currentQuery
    });

    console.log('[loadGuide] Starting fetch for region:', currentRegion, 'query:', currentQuery);

    try {
      const response = await fetch(`/api/guide?${params.toString()}`, {
        next: { revalidate: 300 } // Cache for 5 minutes
      });
      console.log('[loadGuide] Response status:', response.status, response.ok);
      if (!response.ok) {
        throw new Error("Could not fetch guide data.");
      }
      const payload = await response.json();
      console.log('[loadGuide] Received payload:', {
        today: payload.today?.length,
        liveNow: payload.liveNow?.length,
        upcoming: payload.upcoming?.length,
        tvChannels: payload.tvChannels?.length,
        streamingApps: payload.streamingApps?.length
      });
      if (requestId !== requestIdRef.current) return;
      setGuide({
        today: payload.today || [],
        liveNow: payload.liveNow || [],
        upcoming: payload.upcoming || [],
        tvChannels: payload.tvChannels || [],
        streamingApps: payload.streamingApps || [],
        sourceStatus: payload.sourceStatus || [],
        providerWarnings: payload.providerWarnings || [],
        supportedRegions: payload.supportedRegions || ["uk"]
      });
      console.log('[loadGuide] State updated successfully');
    } catch (err) {
      console.error('[loadGuide] Error:', err);
      if (requestId !== requestIdRef.current) return;
      setError("Could not load guide data right now. Please retry.");
      setGuide((prev) => ({
        ...prev,
        today: [],
        liveNow: [],
        upcoming: [],
        tvChannels: [],
        streamingApps: []
      }));
    } finally {
      if (requestId !== requestIdRef.current) return;
      setLoading(false);
      console.log('[loadGuide] Loading complete');
    }
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setQuery(queryInput.trim());
    }, 220);

    return () => clearTimeout(timeoutId);
  }, [queryInput]);

  useEffect(() => {
    loadGuide(region, query);
  }, [region, query]);

  const appLookup = useMemo(() => {
    return new Map(guide.streamingApps.map((item) => [String(item.id), item]));
  }, [guide.streamingApps]);

  const quickFilters = useMemo(() => {
    const pools = {
      today: guide.today,
      liveNow: guide.liveNow,
      upcoming: guide.upcoming,
      tvChannels: guide.tvChannels,
      streamingApps: guide.streamingApps
    };

    return QUICK_FILTER_CANDIDATES.filter((filter) => {
      const term = normalizeFilterText(filter.query);
      return filter.checkPools.some((poolName) => {
        const pool = pools[poolName] || [];
        if (!term) return pool.length > 0;
        return pool.some((item) => itemMatchesGenreTerm(item, term));
      });
    });
  }, [guide.today, guide.liveNow, guide.upcoming, guide.tvChannels, guide.streamingApps]);

  const channelToWatchVia = useMemo(() => {
    const lookup = new Map();
    for (const channel of guide.tvChannels) {
      lookup.set(String(channel.name || "").toLowerCase(), toArray(channel.watchVia).map((entry) => String(entry)));
    }
    return lookup;
  }, [guide.tvChannels]);

  const channelOptions = useMemo(() => {
    // Dedupe by name: at global IPTV-org scale, many channels in different
    // countries share a name (e.g. several "Agro TV"s), and schedule items
    // only ever carry a channel name string (no per-country id) to filter
    // against, so duplicate-named options would be indistinguishable noise.
    const unique = new Set(guide.tvChannels.map((item) => String(item.name || "")).filter(Boolean));
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [guide.tvChannels]);

  const appOptions = useMemo(() => {
    return [...guide.streamingApps]
      .map((item) => ({ id: String(item.id), name: String(item.name || item.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [guide.streamingApps]);

  const selectedApp = appLookup.get(appFilter) || null;
  // Apps that carry no live linear channel (Netflix, Disney+, etc.) are
  // on-demand only - their catalog is available anytime, so "Today"/"Live
  // Now"/"Upcoming" schedules will never have anything for them. Apps with
  // a `channels` list (iPlayer, ITVX, NOW, ...) simulcast real broadcasts
  // and so genuinely do have a live schedule.
  const selectedAppHasLiveChannels = selectedApp
    ? Array.isArray(selectedApp.channels) && selectedApp.channels.length > 0
    : null;
  const selectedAppNeedles = useMemo(() => {
    if (!selectedApp) return [];
    const needles = [String(selectedApp.id).toLowerCase(), String(selectedApp.name || "").toLowerCase()];
    return needles.filter(Boolean);
  }, [selectedApp]);

  const programmeMatchesFilters = useMemo(() => {
    return (item) => {
      if (channelFilter && String(item.channel || "") !== channelFilter) return false;
      if (!selectedAppNeedles.length) return true;

      const watchHints = [
        ...toArray(item.watchVia),
        ...(channelToWatchVia.get(String(item.channel || "").toLowerCase()) || [])
      ]
        .map((entry) => String(entry).toLowerCase())
        .filter(Boolean);

      if (!watchHints.length) {
        return false;
      }

      return selectedAppNeedles.some((needle) =>
        watchHints.some((hint) => hint.includes(needle) || needle.includes(hint))
      );
    };
  }, [channelFilter, selectedAppNeedles, channelToWatchVia]);

  const filteredToday = useMemo(() => guide.today.filter(programmeMatchesFilters), [guide.today, programmeMatchesFilters]);
  const filteredLiveNow = useMemo(() => guide.liveNow.filter(programmeMatchesFilters), [guide.liveNow, programmeMatchesFilters]);
  const filteredUpcoming = useMemo(() => guide.upcoming.filter(programmeMatchesFilters), [guide.upcoming, programmeMatchesFilters]);

  const filteredTvChannels = useMemo(() => {
    return guide.tvChannels.filter((item) => {
      if (channelFilter && String(item.name || "") !== channelFilter) return false;
      if (!selectedAppNeedles.length) return true;

      const hints = toArray(item.watchVia).map((entry) => String(entry).toLowerCase());
      return selectedAppNeedles.some((needle) => hints.some((hint) => hint.includes(needle) || needle.includes(hint)));
    });
  }, [guide.tvChannels, channelFilter, selectedAppNeedles]);

  const filteredStreamingApps = useMemo(() => {
    return guide.streamingApps.filter((item) => {
      if (appFilter && String(item.id) !== appFilter) return false;
      if (!channelFilter) return true;

      const channel = guide.tvChannels.find((entry) => String(entry.name || "") === channelFilter);
      const watchHints = toArray(channel?.watchVia).map((entry) => String(entry).toLowerCase());
      if (!watchHints.length) return true;
      const appId = String(item.id).toLowerCase();
      const appName = String(item.name || item.id).toLowerCase();
      return watchHints.some((hint) => hint.includes(appId) || hint.includes(appName));
    });
  }, [guide.streamingApps, guide.tvChannels, appFilter, channelFilter]);

  const counts = useMemo(
    () => ({
      today: filteredToday.length,
      liveNow: filteredLiveNow.length,
      upcoming: filteredUpcoming.length,
      tvChannels: filteredTvChannels.length,
      streamingApps: filteredStreamingApps.length
    }),
    [filteredToday, filteredLiveNow, filteredUpcoming, filteredTvChannels, filteredStreamingApps]
  );

  // The hero's top-line stats are a "how much data does this app have"
  // trust indicator, shown on the Home tab where no filter controls are
  // visible - they must stay unfiltered, or setting a filter in Browse and
  // switching to Home makes the app look like it suddenly has no data.
  const globalHeadlineCount = guide.today.length + guide.liveNow.length + guide.upcoming.length;
  const hasActiveFilter = Boolean(query.trim() || channelFilter || appFilter);
  const activeAppOrChannelLabel = channelFilter || selectedApp?.name || "";
  const displayCount = (value, label) => (loading ? label : value);
  const activeTabCount = counts[browseTab] || 0;
  const activeTabLabel = browseTabs.find((item) => item.key === browseTab)?.label || "results";
  const timelineDays = useMemo(() => Array.from({ length: 7 }, (_, i) => i), []);
  const selectedTimelineLabel = formatTimelineDayLabel(timelineDayOffset);

  const allProgrammes = useMemo(() => {
    const merged = [...filteredLiveNow, ...filteredToday, ...filteredUpcoming];
    const byId = new Map();
    for (const item of merged) {
      if (!item?.id) continue;
      if (!byId.has(item.id)) byId.set(item.id, item);
    }
    return Array.from(byId.values());
  }, [filteredLiveNow, filteredToday, filteredUpcoming]);

  const selectedTimelineDayKey = useMemo(() => {
    return toLondonDayKey(addDays(new Date(), timelineDayOffset));
  }, [timelineDayOffset]);

  const timelineRowsByDay = useMemo(() => {
    const byDay = new Map();

    for (const item of allProgrammes) {
      const dayKey = toLondonDayKey(item.startAt);
      if (!dayKey) continue;

      if (!byDay.has(dayKey)) byDay.set(dayKey, new Map());
      const dayChannels = byDay.get(dayKey);

      const channel = item.channel || "Unknown channel";
      if (!dayChannels.has(channel)) dayChannels.set(channel, []);
      dayChannels.get(channel).push(item);
    }

    const result = {};
    for (const [dayKey, channelMap] of byDay.entries()) {
      const rows = Array.from(channelMap.entries())
        .map(([channel, items]) => ({
          channel,
          items: items
            .filter(isWithinTimelineWindow)
            .sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0))
        }))
        .filter((row) => row.items.length > 0);

      rows.sort((a, b) => b.items.length - a.items.length);
      result[dayKey] = rows.slice(0, 14);
    }

    return result;
  }, [allProgrammes]);

  const timelineRows = timelineRowsByDay[selectedTimelineDayKey] || [];
  const featuredNow = useMemo(() => {
    const merged = [...filteredLiveNow, ...filteredToday, ...filteredUpcoming];
    const deduped = [];
    const seen = new Set();
    for (const item of merged) {
      if (!item?.id || seen.has(item.id)) continue;
      seen.add(item.id);
      deduped.push(item);
      if (deduped.length >= 6) break;
    }
    return deduped;
  }, [filteredLiveNow, filteredToday, filteredUpcoming]);
  const featuredVisible = isFeaturedCompact ? featuredNow.slice(0, 3) : featuredNow;

  // Answers "what's on for X, and where, right now" in one glance instead
  // of forcing a click through Today / Live Now / TV Channels / Streaming
  // Apps separately. Only shown when a search/genre filter is active - it's
  // the merged view the plain per-category tabs below don't provide.
  const unifiedNowResults = useMemo(
    () => (hasActiveFilter ? buildUnifiedNowEntries(filteredLiveNow, filteredToday, filteredTvChannels, filteredStreamingApps) : []),
    [hasActiveFilter, filteredLiveNow, filteredToday, filteredTvChannels, filteredStreamingApps]
  );

  function openDetails(item, type = "programme") {
    if (!item) return;
    const destination =
      type === "channel" ? getChannelLink(item) : type === "app" ? getAppLink(item) : getProgrammeLink(item);
    setSelectedItem({
      item,
      type,
      destination
    });
  }

  function closeDetails() {
    setSelectedItem(null);
  }

  function handleQuickFilter(filter) {
    setQuery(filter.query);
    setBrowseTab(filter.tab);
    setQueryInput(filter.query);
    setIsSidebarOpen(false);
  }

  function clearFilters() {
    setChannelFilter("");
    setAppFilter("");
    setQuery("");
    setQueryInput("");
  }

  return (
    <>
      {/* Sidebar Toggle Button */}
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle sidebar menu"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
          onKeyDown={(e) => e.key === 'Escape' && setIsSidebarOpen(false)}
          role="button"
          tabIndex={0}
          aria-label="Close sidebar"
        />
      )}

      {/* Sidebar Menu */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>Navigation</h2>
          <button
            type="button"
            className="sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="sidebar-content">
          {/* Quick Navigation */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Views</h3>
            <nav className="sidebar-nav">
              {browseTabs.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  className={`sidebar-nav-item ${browseTab === t.key ? 'active' : ''}`}
                  onClick={() => {
                    setBrowseTab(t.key);
                    setIsSidebarOpen(false);
                  }}
                >
                  <span>{t.label}</span>
                  <span className="sidebar-nav-count">{counts[t.key] || 0}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Quick Filters */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Quick Filters</h3>
            <div className="sidebar-filters">
              {quickFilters.map((filter, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="sidebar-filter-btn"
                  onClick={() => handleQuickFilter(filter)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {/* Region Selector */}
          <div className="sidebar-section">
            <h3 className="sidebar-section-title">Region</h3>
            <select
              className="sidebar-select"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              {guide.supportedRegions.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          {!loading && guide.providerWarnings?.length > 0 && (
            <div className="sidebar-section">
              <h3 className="sidebar-section-title">Warnings</h3>
              {guide.providerWarnings.map((warning, i) => (
                <div key={i} className="sidebar-warning">
                  {warning}
                </div>
              ))}
            </div>
          )}
        </div>
      </aside>

      <main className="page-shell">
      <section className="hero-card premium">
        <div className="hero-content">
          <p className="eyebrow">Tonight In UK</p>
          <h1>My TV Guide</h1>
          <p className="subhead">
            Live now, up next, and where to watch. Built like a modern streaming home, powered
            by open TV data and designed for fast decisions.
          </p>
          <div className="hero-meta">
            <span>{displayCount(`${globalHeadlineCount} programmes indexed now`, "Loading programmes...")}</span>
            <span>{displayCount(`${guide.tvChannels.length} channels aggregated`, "Loading channels...")}</span>
            <span>{displayCount(`${guide.streamingApps.length} streaming services`, "Loading apps...")}</span>
          </div>
          <div className="hero-actions">
            <button type="button" className="cta cta-primary" onClick={() => { setMainTab("browse"); setBrowseTab("liveNow"); }}>Go Live</button>
            <button type="button" className="cta cta-secondary" onClick={() => { setMainTab("browse"); setBrowseTab("upcoming"); }}>See Tonight</button>
          </div>
        </div>
        <div className="hero-radar">
          <div className="hero-radar-card">
            <p className="hero-radar-label">Signal Board</p>
            <h2>{hasActiveFilter ? `Live now for "${query || activeAppOrChannelLabel}"` : "What is live right now"}</h2>
            <p className="hero-radar-copy">
              A fast read on the strongest things on air, with direct watch paths when they exist.
            </p>
            {loading ? (
              <div className="hero-radar-loading">
                <strong>Loading live guide...</strong>
                <p>Pulling today&apos;s schedules and watch paths together.</p>
              </div>
            ) : featuredNow[0] ? (
              <button
                type="button"
                className="hero-radar-feature feature-button"
                onClick={() => openDetails(featuredNow[0], "programme")}
              >
                <MediaThumb image={featuredNow[0].image} label={featuredNow[0].show || featuredNow[0].channel} tag={getProgrammeStatus(featuredNow[0])} />
                <div className="hero-radar-body">
                  <h3>{highlightText(featuredNow[0].show, query)}</h3>
                  <p>{highlightText(featuredNow[0].title, query)}</p>
                  <p className="meta">{featuredNow[0].channel}</p>
                </div>
              </button>
            ) : hasActiveFilter ? (
              <p className="hero-radar-copy">
                Nothing matches this filter right now.{" "}
                <button type="button" className="link-button" onClick={clearFilters}>Clear filters</button> to see everything.
              </p>
            ) : null}
          </div>
          <div className="hero-radar-signal">
            <div>
              <span className="hero-radar-kicker">Direct watch paths</span>
              <strong>{displayCount(`${guide.streamingApps.length} apps`, "Loading...")}</strong>
            </div>
            <div>
              <span className="hero-radar-kicker">Live channel supply</span>
              <strong>{displayCount(`${guide.tvChannels.length} channels`, "Loading...")}</strong>
            </div>
            <div>
              <span className="hero-radar-kicker">Tonight total</span>
              <strong>{displayCount(`${globalHeadlineCount} programmes`, "Loading...")}</strong>
            </div>
          </div>
        </div>
      </section>

      <div className="main-nav" role="tablist" aria-label="Main sections">
        {mainTabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={mainTab === tab.key}
            className={mainTab === tab.key ? "main-nav-tab active" : "main-nav-tab"}
            onClick={() => setMainTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {mainTab === "home" && !loading && !error && featuredNow.length > 0 ? (
        <section className={isFeaturedCompact ? "panel spotlight-panel compact" : "panel spotlight-panel"}>
          <div className="section-title-row">
            <h2>Featured Right Now</h2>
            <div className="section-actions">
              <p className="state">Curated from live and upcoming schedules</p>
              {featuredNow.length > 3 ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setIsFeaturedCompact((current) => !current)}
                >
                  {isFeaturedCompact ? "Show all" : "Show less"}
                </button>
              ) : null}
            </div>
          </div>
          <div className="feature-grid">
            {featuredVisible.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={index === 0 ? "feature-card feature-card-main feature-button" : "feature-card feature-button"}
                onClick={() => openDetails(item, "programme")}
              >
                <MediaThumb image={item.image} label={item.show || item.channel} tag={index === 0 ? "EDITOR'S PICK" : "TRENDING"} />
                <div className="feature-body">
                  <h3>{highlightText(item.show, query)}</h3>
                  <p>{highlightText(item.title, query)}</p>
                  <p className="meta">{item.channel}</p>
                  <p className="meta">{getProgrammeStatus(item)}</p>
                </div>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {mainTab === "timeline" && !loading && !error ? (
        <section className="panel timeline-panel">
          <div className="section-title-row">
            <h2>Timeline Guide</h2>
            <p className="state">
              {selectedTimelineLabel} • {String(TIMELINE_WINDOW_START_MINUTES / 60).padStart(2, "0")}:00–
              {String(TIMELINE_WINDOW_END_MINUTES / 60).padStart(2, "0")}:00 • Times in UK (Europe/London)
            </p>
          </div>

          <div className="timeline-days-wrap">
            <button
              type="button"
              className="timeline-nav"
              onClick={() => {
                startTimelineTransition(() => {
                  setTimelineDayOffset((current) => clamp(current - 1, 0, timelineDays.length - 1));
                });
              }}
              disabled={timelineDayOffset === 0}
              aria-label="Previous day"
            >
              &lt;
            </button>
            <div className="timeline-days">
            {timelineDays.map((day) => (
              <button
                key={day}
                type="button"
                className={day === timelineDayOffset ? "timeline-day active" : "timeline-day"}
                aria-current={day === timelineDayOffset ? "date" : undefined}
                onClick={() => {
                  startTimelineTransition(() => {
                    setTimelineDayOffset(day);
                  });
                }}
              >
                {formatTimelineDayLabel(day)}
              </button>
            ))}
            </div>
            <button
              type="button"
              className="timeline-nav"
              onClick={() => {
                startTimelineTransition(() => {
                  setTimelineDayOffset((current) => clamp(current + 1, 0, timelineDays.length - 1));
                });
              }}
              disabled={timelineDayOffset === timelineDays.length - 1}
              aria-label="Next day"
            >
              &gt;
            </button>
          </div>

          {isTimelinePending ? <p className="state">Updating timeline...</p> : null}

          <div className="timeline-wrap">
            <div className="timeline-hours" aria-hidden>
              <span className="timeline-hours-spacer" />
              {Array.from({ length: 9 }, (_, i) => 14 + i).map((hour) => (
                <span key={hour}>{String(hour).padStart(2, "0")}:00</span>
              ))}
            </div>

            {timelineRows.length === 0 ? (
              <p className="state">
                Nothing airing {String(TIMELINE_WINDOW_START_MINUTES / 60).padStart(2, "0")}:00–
                {String(TIMELINE_WINDOW_END_MINUTES / 60).padStart(2, "0")}:00 on {selectedTimelineLabel.toLowerCase()}.
                Try the Browse tab&apos;s Live Now / Today lists for programmes outside this window.
              </p>
            ) : null}

            {timelineRows.map((row) => (
              <div key={row.channel} className="timeline-row">
                <div className="timeline-channel">
                  <span className="channel-stripe" style={{ background: channelStripe(row.channel) }} aria-hidden />
                  <span title={row.channel}>{row.channel}</span>
                </div>
                <div className="timeline-track">
                  {row.items.map((item) => {
                    // row.items is already filtered to this window (see
                    // timelineRowsByDay / isWithinTimelineWindow), so every
                    // item here is guaranteed to intersect it.
                    const startMinutes = toLondonTimeMinutes(item.startAt);
                    const endMinutes = toLondonTimeMinutes(item.endAt) || startMinutes + 30;
                    const windowStart = TIMELINE_WINDOW_START_MINUTES;
                    const windowEnd = TIMELINE_WINDOW_END_MINUTES;
                    const clippedStart = Math.max(startMinutes, windowStart);
                    const clippedEnd = Math.min(endMinutes, windowEnd);

                    const left = ((clippedStart - windowStart) / (windowEnd - windowStart)) * 100;
                    const width = ((clippedEnd - clippedStart) / (windowEnd - windowStart)) * 100;
                    const visualWidth = Math.max(width, 0.72);
                    const density =
                      visualWidth < 1.3 ? "micro" : visualWidth < 4 ? "tiny" : visualWidth < 7 ? "compact" : "full";
                    const title = item.show || item.title || "Untitled";
                    const timeLabel = `${formatTime(item.startAt)} - ${formatTime(item.endAt)}`;

                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openDetails(item, "programme")}
                        className={`timeline-block ${density}`}
                        style={{ left: `${left}%`, width: `${visualWidth}%` }}
                        title={`${title} • ${timeLabel}`}
                      >
                        {density === "full" || density === "compact" ? <strong>{title}</strong> : null}
                        {density === "full" ? <span>{timeLabel}</span> : null}
                        {density === "tiny" || density === "micro" ? <span className="timeline-dot" aria-hidden /> : null}
                        {density === "tiny" || density === "micro" ? (
                          <span className="sr-only">{`${title}, ${timeLabel}`}</span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {mainTab === "browse" ? (
      <>
      <section className="panel">
        <h2>Search and Region</h2>
        <div className="controls-grid">
          <label className="control-item">
            <span>Region</span>
            <select value={region} onChange={(e) => setRegion(e.target.value)}>
              {guide.supportedRegions.map((value) => (
                <option key={value} value={value}>
                  {value.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="control-item">
            <span>Search across channels, shows, and apps</span>
            <input
              type="search"
              placeholder="Try: football, BBC, drama, sports"
              value={queryInput}
              onChange={(e) => setQueryInput(e.target.value)}
            />
            <span className="search-feedback" aria-live="polite">
              {loading && queryInput.trim() ? `Searching for "${queryInput.trim()}"...` : "Search updates as you type."}
            </span>
          </label>
        </div>

        <div className="filter-row" role="group" aria-label="Channel and app filters">
          <label className="control-item filter-item">
            <span>Channel</span>
            <select value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="">All channels</option>
              {channelOptions.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="control-item filter-item">
            <span>Streaming app</span>
            <select value={appFilter} onChange={(e) => setAppFilter(e.target.value)}>
              <option value="">All streaming apps</option>
              {appOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="ghost"
            onClick={clearFilters}
            disabled={!channelFilter && !appFilter && !query.trim()}
          >
            Clear filters
          </button>
        </div>

        <div className="quick-filters" role="group" aria-label="Quick search filters">
          {quickFilters.map((item) => {
            // Match on browseTab too, not just query: several chips (e.g.
            // the non-genre "Streaming" chip) share an empty query with the
            // unfiltered default state, so query alone can't tell "no
            // filter applied" apart from "this chip is selected."
            const isActive = query.toLowerCase() === item.query && browseTab === item.tab;
            return (
              <button
                key={item.label}
                type="button"
                className={isActive ? "quick-chip active" : "quick-chip"}
                onClick={() => {
                  if (isActive) {
                    // Clicking an active filter removes it
                    setQuery("");
                    setQueryInput("");
                  } else {
                    // Clicking a new filter applies it
                    setQuery(item.query);
                    setQueryInput(item.query);
                    setBrowseTab(item.tab);
                  }
                }}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>

      {hasActiveFilter ? (
        <section className="panel">
          <div className="section-title-row">
            <h2>Right now for &quot;{query || activeAppOrChannelLabel}&quot;</h2>
          </div>
          <p className="state">
            Live and starting-soon programmes, channels, and apps that match - merged in one place instead of
            checking each tab separately.
          </p>

          {unifiedNowResults.length === 0 ? (
            <p className="state">Nothing matches right now. Try a broader term, or check Upcoming for later today.</p>
          ) : (
            <ul className="listing-grid visual">
              {unifiedNowResults.map(({ kind, badge, item }) => {
                if (kind === "programme") {
                  return (
                    <li key={`p-${item.id}`} className="listing-card">
                      <button type="button" className="card-link card-button" onClick={() => openDetails(item, "programme")}>
                        <MediaThumb image={item.image} label={item.show || item.channel} tag={badge} />
                        <div className="card-body">
                          <h3>{highlightText(item.show, query)}</h3>
                          <p className="meta">{item.channel}</p>
                          <p className="meta">
                            {badge === "LIVE" ? `Started ${formatTime(item.startAt)}` : `Starts ${formatTime(item.startAt)}`}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                }
                if (kind === "channel") {
                  return (
                    <li key={`c-${item.id}`} className="listing-card">
                      <button type="button" className="card-link card-button" onClick={() => openDetails(item, "channel")}>
                        <MediaThumb image={item.logo} label={item.name} tag="CHANNEL" />
                        <div className="card-body">
                          <h3>{item.name}</h3>
                          <p className="meta">{toArray(item.watchVia).join(", ") || item.access}</p>
                        </div>
                      </button>
                    </li>
                  );
                }
                return (
                  <li key={`a-${item.id}`} className="listing-card">
                    <button type="button" className="card-link card-button" onClick={() => openDetails(item, "app")}>
                      <MediaThumb image={item.logo} label={item.name} tag="APP" />
                      <div className="card-body">
                        <h3>{item.name}</h3>
                        <p className="meta availability-tag">
                          {Array.isArray(item.channels) && item.channels.length > 0 ? "Has live channels" : "On-demand only"}
                        </p>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      <section className="panel">
        <div className="section-title-row">
          <h2>Guide Studio</h2>
          <button type="button" className="ghost" onClick={() => loadGuide(region, query)}>
            Refresh
          </button>
        </div>

        <div className="tabs-row">
          {browseTabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={browseTab === item.key ? "tab-pill active" : "tab-pill"}
              onClick={() => setBrowseTab(item.key)}
            >
              {item.label} ({loading ? "…" : counts[item.key]})
            </button>
          ))}
        </div>

        {!loading && !error && query ? (
          <p className="state query-state">
            Showing {activeTabCount} {browseTab} result{activeTabCount === 1 ? "" : "s"} for &quot;{query}&quot;
          </p>
        ) : null}

        {!loading && !error && query && activeTabCount === 0 ? (
          <p className="state empty-hint">
            No {activeTabLabel.toLowerCase()} match &quot;{query}&quot;. Try a broader term like &quot;sport&quot;, &quot;news&quot;, or &quot;movie&quot;.
          </p>
        ) : null}

        {loading ? <p className="state">Loading listings...</p> : null}
        {error ? <p className="state error">{error}</p> : null}
        {!loading && !error && guide.providerWarnings.length > 0 ? (
          <div className="warning-box">
            {guide.providerWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {!loading && !error && browseTab === "today" && filteredToday.length === 0 ? (
          <p className="state">
            {selectedAppHasLiveChannels === false
              ? `${selectedApp.name} is on-demand - its shows are available anytime, so they won't show up in a daily schedule. Check the Streaming Apps tab instead.`
              : "No programmes found for today with this search."}
          </p>
        ) : null}
        {!loading && !error && browseTab === "today" && filteredToday.length > 0 ? (
          <ul className="listing-grid visual">
            {filteredToday.map((item) => (
              <li key={item.id} className="listing-card">
                <button type="button" className="card-link card-button" onClick={() => openDetails(item, "programme")}>
                  <MediaThumb image={item.image} label={item.show || item.channel} tag="TODAY" />
                  <div className="card-body">
                    <h3>{highlightText(item.show, query)}</h3>
                    <p>{highlightText(item.title, query)}</p>
                    <p className="meta">{item.channel}</p>
                    <p className="meta">{formatTime(item.startAt)} • {formatTime(item.endAt)}</p>
                    <p className="summary">{trimSummary(item.summary)}</p>
                    <p className="meta card-cta">View details</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !error && browseTab === "liveNow" && filteredLiveNow.length === 0 ? (
          <p className="state">
            {selectedAppHasLiveChannels === false
              ? `${selectedApp.name} is on-demand - it has no "live" concept, its whole catalog is available anytime. Check the Streaming Apps tab instead.`
              : "No programmes are marked as live right now."}
          </p>
        ) : null}
        {!loading && !error && browseTab === "liveNow" && filteredLiveNow.length > 0 ? (
          <ul className="listing-grid visual">
            {filteredLiveNow.map((item) => (
              <li key={item.id} className="listing-card">
                <button type="button" className="card-link card-button" onClick={() => openDetails(item, "programme")}>
                  <MediaThumb image={item.image} label={item.show || item.channel} tag="LIVE" />
                  <div className="card-body">
                    <h3>{highlightText(item.show, query)}</h3>
                    <p>{highlightText(item.title, query)}</p>
                    <p className="meta">{item.channel}</p>
                    <p className="meta">Started: {formatDateTime(item.startAt)}</p>
                    <p className="summary">{trimSummary(item.summary)}</p>
                    <p className="meta card-cta">View details</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !error && browseTab === "upcoming" && filteredUpcoming.length === 0 ? (
          <p className="state">
            {selectedAppHasLiveChannels === false
              ? `${selectedApp.name} is on-demand - there's no "upcoming" schedule, its shows are already available now. Check the Streaming Apps tab instead.`
              : "No upcoming programmes match this search."}
          </p>
        ) : null}
        {!loading && !error && browseTab === "upcoming" && filteredUpcoming.length > 0 ? (
          <ul className="listing-grid visual">
            {filteredUpcoming.map((item) => (
              <li key={item.id} className="listing-card">
                <button type="button" className="card-link card-button" onClick={() => openDetails(item, "programme")}>
                  <MediaThumb image={item.image} label={item.show || item.channel} tag="UP NEXT" />
                  <div className="card-body">
                    <h3>{highlightText(item.show, query)}</h3>
                    <p>{highlightText(item.title, query)}</p>
                    <p className="meta">{item.channel}</p>
                    <p className="meta">Starts: {formatDateTime(item.startAt)}</p>
                    <p className="summary">{trimSummary(item.summary)}</p>
                    <p className="meta card-cta">View details</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !error && browseTab === "tvChannels" && filteredTvChannels.length === 0 ? (
          <p className="state">No channels match this search.</p>
        ) : null}
        {!loading && !error && browseTab === "tvChannels" && filteredTvChannels.length > 0 ? (
          <ul className="listing-grid visual channels">
            {filteredTvChannels.map((item) => (
              <li key={item.id} className="listing-card">
                <button type="button" className="card-link card-button" onClick={() => openDetails(item, "channel")}>
                  <MediaThumb image={item.logo} label={item.name} tag={item.genre || "CHANNEL"} />
                  <div className="card-body">
                    <h3>{item.name}</h3>
                    <p>{item.access}</p>
                    {Array.isArray(item.languages) && item.languages.length > 0 ? (
                      <p className="meta">Language: {item.languages.join(", ")}</p>
                    ) : null}
                    <p className="meta">Watch via: {item.watchVia.join(", ")}</p>
                    <p className="meta card-cta">View details</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !error && browseTab === "streamingApps" && filteredStreamingApps.length === 0 ? (
          <p className="state">No streaming apps match this search.</p>
        ) : null}

        {!loading && !error && browseTab === "streamingApps" && filteredStreamingApps.length > 0 ? (
          <ul className="listing-grid visual apps">
            {filteredStreamingApps.map((item) => (
              <li key={item.id} className="listing-card">
                <button type="button" className="card-link card-button" onClick={() => openDetails(item, "app")}>
                  <MediaThumb image={item.logo} label={item.name} tag={item.category || "APP"} />
                  <div className="card-body">
                    <h3>{item.name}</h3>
                    <p>{item.priceModel}</p>
                    <p className="meta">Platforms: {item.platforms.join(", ")}</p>
                    <p className="meta">Highlights: {item.highlights.join(" • ")}</p>
                    <p className="meta availability-tag">
                      {Array.isArray(item.channels) && item.channels.length > 0
                        ? `Live channels: ${item.channels.length}`
                        : "On-demand only - available anytime"}
                    </p>
                    <p className="meta card-cta">View details</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
      </>
      ) : null}

      {selectedItem ? (
        <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Programme details">
          <div className="detail-modal">
            <button type="button" className="detail-close" onClick={closeDetails} aria-label="Close details">
              Close
            </button>
            <div className="detail-media">
              <MediaThumb
                image={selectedItem.item.image || selectedItem.item.logo}
                label={selectedItem.item.show || selectedItem.item.name || selectedItem.item.title}
                tag={(selectedItem.type || "item").toUpperCase()}
              />
            </div>
            <div className="detail-body">
              <h3>{selectedItem.item.show || selectedItem.item.name || selectedItem.item.title}</h3>
              <p className="detail-subtitle">{selectedItem.item.title || selectedItem.item.channel || selectedItem.item.genre || "TV listing"}</p>
              <p className="detail-meta">{selectedItem.item.channel || selectedItem.item.access || selectedItem.item.priceModel || ""}</p>
              {selectedItem.item.startAt ? (
                <p className="detail-meta">
                  {formatDateTime(selectedItem.item.startAt)}
                  {selectedItem.item.endAt ? ` - ${formatTime(selectedItem.item.endAt)}` : ""}
                </p>
              ) : null}
              <p className="detail-summary">{trimSummary(selectedItem.item.summary, 300)}</p>
              {selectedItem.item.isStreaming && selectedItem.item.streamingOn?.length > 0 ? (
                <p className="detail-meta streaming-elsewhere">
                  Also streaming on: {selectedItem.item.streamingOn.join(", ")}
                  <span className="attribution"> (streaming data via JustWatch)</span>
                </p>
              ) : null}
              <p className="watch-title">Where to watch</p>
              <div className="watch-links" aria-label="Watch options">
                {getWatchTargets(selectedItem.item, selectedItem.type).map((entry) => (
                  <a key={entry.href} href={entry.href} target="_blank" rel="noreferrer" className="watch-link">
                    {entry.label}
                  </a>
                ))}
              </div>
              <div className="detail-actions">
                {selectedItem.item.streamUrl ? (
                  <button
                    type="button"
                    className="cta cta-primary"
                    onClick={() => {
                      setPlayingStream({
                        streamUrl: selectedItem.item.streamUrl,
                        channelName: selectedItem.item.channel || selectedItem.item.name || "Live stream",
                        title: selectedItem.item.show || selectedItem.item.title || null
                      });
                      closeDetails();
                    }}
                  >
                    ▶ Play here
                  </button>
                ) : null}
                {selectedItem.destination ? (
                  <a
                    href={selectedItem.destination}
                    target="_blank"
                    rel="noreferrer"
                    className={selectedItem.item.streamUrl ? "cta cta-secondary" : "cta cta-primary"}
                  >
                    Watch / Open
                  </a>
                ) : !selectedItem.item.streamUrl ? (
                  <span className="state">No direct stream link available yet for this listing.</span>
                ) : null}
                <button type="button" className="cta cta-secondary" onClick={closeDetails}>
                  Back to guide
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {playingStream ? (
        <div className="detail-overlay" role="dialog" aria-modal="true" aria-label="Video player">
          <VideoPlayer
            streamUrl={playingStream.streamUrl}
            channelName={playingStream.channelName}
            title={playingStream.title}
            autoPlay
            onClose={() => setPlayingStream(null)}
          />
        </div>
      ) : null}
    </main>
    </>
  );
}