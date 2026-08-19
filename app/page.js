"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";

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

const appLinkById = {
  freely: "https://www.freely.co.uk/",
  iplayer: "https://www.bbc.co.uk/iplayer",
  itvx: "https://www.itv.com/watch",
  channel4: "https://www.channel4.com/",
  my5: "https://www.channel5.com/",
  u: "https://u.co.uk/",
  "s4c-clic": "https://www.s4c.cymru/clic/",
  "stv-player": "https://player.stv.tv/",
  now: "https://www.nowtv.com/",
  "discovery-plus": "https://www.discoveryplus.com/gb",
  netflix: "https://www.netflix.com/",
  "prime-video": "https://www.primevideo.com/",
  "disney-plus": "https://www.disneyplus.com/",
  "apple-tv-plus": "https://tv.apple.com/",
  "paramount-plus": "https://www.paramountplus.com/",
  hayu: "https://www.hayu.com/",
  shudder: "https://www.shudder.com/",
  mubi: "https://mubi.com/",
  "rakuten-tv": "https://rakuten.tv/",
  youtube: "https://www.youtube.com/",
  plutotv: "https://pluto.tv/",
  freevee: "https://www.amazon.co.uk/gp/video/storefront/ref=atv_dp_freevee",
  tubitv: "https://tubitv.com/",
  "xumo-play": "https://play.xumo.com/",
  "samsung-tv-plus": "https://www.samsung.com/uk/tvs/smart-tv/samsung-tv-plus/",
  "lg-channels": "https://www.lg.com/uk/lg-channels",
  "roku-channel": "https://therokuchannel.roku.com/",
  plex: "https://www.plex.tv/"
};

const watchLinkByName = {
  freely: appLinkById.freely,
  "bbc iplayer": appLinkById.iplayer,
  iplayer: appLinkById.iplayer,
  "bbc one": appLinkById.freely,
  "bbc two": appLinkById.freely,
  "bbc three": appLinkById.freely,
  "bbc four": appLinkById.freely,
  "itv x": appLinkById.itvx,
  itvx: appLinkById.itvx,
  "channel 4": appLinkById.channel4,
  "channel 4 app": appLinkById.channel4,
  my5: appLinkById.my5,
  "my 5": appLinkById.my5,
  "channel 5": appLinkById.my5,
  "5action": appLinkById.my5,
  "5star": appLinkById.my5,
  "5usa": appLinkById.my5,
  "5select": appLinkById.my5,
  now: appLinkById.now,
  "now tv": appLinkById.now,
  u: appLinkById.u,
  "discovery+": appLinkById["discovery-plus"],
  "disney+": appLinkById["disney-plus"],
  "apple tv+": appLinkById["apple-tv-plus"],
  "paramount+": appLinkById["paramount-plus"],
  hayu: appLinkById.hayu,
  shudder: appLinkById.shudder,
  mubi: appLinkById.mubi,
  youtube: appLinkById.youtube,
  plutotv: appLinkById.plutotv,
  "pluto tv": appLinkById.plutotv,
  freevee: appLinkById.freevee,
  tubitv: appLinkById.tubitv,
  tubi: appLinkById.tubitv,
  "xumo play": appLinkById["xumo-play"],
  "samsung tv plus": appLinkById["samsung-tv-plus"],
  "lg channels": appLinkById["lg-channels"],
  "the roku channel": appLinkById["roku-channel"],
  plex: appLinkById.plex
};

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

function getWatchViaLink(value) {
  const key = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
  return watchLinkByName[key] || watchLinkByName[String(value || "").toLowerCase()] || null;
}

function pushUniqueTarget(targets, seen, label, href) {
  if (!href || seen.has(href)) return;
  seen.add(href);
  targets.push({ label, href });
}

function getWatchTargets(item, type = "programme") {
  const targets = [];
  const seen = new Set();

  if (type === "app") {
    const href = getAppLink(item);
    if (href) {
      targets.push({ label: "Open app", href });
    }
    return targets;
  }

  if (item.streamUrl) pushUniqueTarget(targets, seen, "Open direct stream", item.streamUrl);
  if (item.url) pushUniqueTarget(targets, seen, "Open programme page", item.url);
  if (item.channelWebsite) pushUniqueTarget(targets, seen, "Open channel site", item.channelWebsite);

  for (const hint of toArray(item.watchVia)) {
    const href = getWatchViaLink(hint);
    if (href) pushUniqueTarget(targets, seen, `Watch on ${hint}`, href);
  }

  return targets;
}

function getProgrammeLink(item) {
  return item.url || item.streamUrl || getWatchTargets(item, "programme")[0]?.href || null;
}

function getChannelLink(item) {
  return item.url || item.streamUrl || item.website || item.channelWebsite || getWatchTargets(item, "channel")[0]?.href || null;
}

function getAppLink(item) {
  return appLinkById[item.id] || item.website || null;
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
    return guide.tvChannels
      .map((item) => String(item.name || ""))
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
  }, [guide.tvChannels]);

  const appOptions = useMemo(() => {
    return [...guide.streamingApps]
      .map((item) => ({ id: String(item.id), name: String(item.name || item.id) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [guide.streamingApps]);

  const selectedApp = appLookup.get(appFilter) || null;
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

  const headlineCount = counts.today + counts.liveNow + counts.upcoming;
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
      const rows = Array.from(channelMap.entries()).map(([channel, items]) => ({
        channel,
        items: items.sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0))
      }));

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
            <span>{displayCount(`${headlineCount} programmes indexed now`, "Loading programmes...")}</span>
            <span>{displayCount(`${counts.tvChannels} channels aggregated`, "Loading channels...")}</span>
            <span>{displayCount(`${counts.streamingApps} streaming services`, "Loading apps...")}</span>
          </div>
          <div className="hero-actions">
            <button type="button" className="cta cta-primary" onClick={() => { setMainTab("browse"); setBrowseTab("liveNow"); }}>Go Live</button>
            <button type="button" className="cta cta-secondary" onClick={() => { setMainTab("browse"); setBrowseTab("upcoming"); }}>See Tonight</button>
          </div>
        </div>
        <div className="hero-radar">
          <div className="hero-radar-card">
            <p className="hero-radar-label">Signal Board</p>
            <h2>What is live right now</h2>
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
            ) : null}
          </div>
          <div className="hero-radar-signal">
            <div>
              <span className="hero-radar-kicker">Direct watch paths</span>
              <strong>{displayCount(`${counts.streamingApps} apps`, "Loading...")}</strong>
            </div>
            <div>
              <span className="hero-radar-kicker">Live channel supply</span>
              <strong>{displayCount(`${counts.tvChannels} channels`, "Loading...")}</strong>
            </div>
            <div>
              <span className="hero-radar-kicker">Tonight total</span>
              <strong>{displayCount(`${headlineCount} programmes`, "Loading...")}</strong>
            </div>
          </div>
        </div>
      </section>

      {!loading && !error && featuredNow.length > 0 ? (
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

      {!loading && !error ? (
        <section className="panel timeline-panel">
          <div className="section-title-row">
            <h2>Timeline Guide</h2>
            <p className="state">{selectedTimelineLabel} • Times in UK (Europe/London)</p>
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

            {timelineRows.length === 0 ? <p className="state">No schedule data for this day yet.</p> : null}

            {timelineRows.map((row) => (
              <div key={row.channel} className="timeline-row">
                <div className="timeline-channel">
                  <span className="channel-stripe" style={{ background: channelStripe(row.channel) }} aria-hidden />
                  <span title={row.channel}>{row.channel}</span>
                </div>
                <div className="timeline-track">
                  {row.items.map((item) => {
                    const startMinutes = toLondonTimeMinutes(item.startAt);
                    const endMinutes = toLondonTimeMinutes(item.endAt) || (startMinutes ? startMinutes + 30 : null);
                    if (startMinutes === null || endMinutes === null) return null;

                    const windowStart = 14 * 60;
                    const windowEnd = 23 * 60;
                    const clippedStart = Math.max(startMinutes, windowStart);
                    const clippedEnd = Math.min(endMinutes, windowEnd);
                    if (clippedEnd <= clippedStart) return null;

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
            onClick={() => {
              setChannelFilter("");
              setAppFilter("");
              setQuery("");
              setQueryInput("");
            }}
            disabled={!channelFilter && !appFilter && !query.trim()}
          >
            Clear filters
          </button>
        </div>

        <div className="quick-filters" role="group" aria-label="Quick search filters">
          {quickFilters.map((item) => (
            <button
              key={item.label}
              type="button"
              className={query.toLowerCase() === item.query ? "quick-chip active" : "quick-chip"}
              onClick={() => {
                if (query.toLowerCase() === item.query) {
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
          ))}
        </div>
      </section>

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
          <p className="state">No programmes found for today with this search.</p>
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
          <p className="state">No programmes are marked as live right now.</p>
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
          <p className="state">No upcoming programmes match this search.</p>
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
                    <p className="meta card-cta">View details</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

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
              <p className="watch-title">Where to watch</p>
              <div className="watch-links" aria-label="Watch options">
                {getWatchTargets(selectedItem.item, selectedItem.type).map((entry) => (
                  <a key={entry.href} href={entry.href} target="_blank" rel="noreferrer" className="watch-link">
                    {entry.label}
                  </a>
                ))}
              </div>
              <div className="detail-actions">
                {selectedItem.destination ? (
                  <a href={selectedItem.destination} target="_blank" rel="noreferrer" className="cta cta-primary">
                    Watch / Open
                  </a>
                ) : (
                  <span className="state">No direct stream link available yet for this listing.</span>
                )}
                <button type="button" className="cta cta-secondary" onClick={closeDetails}>
                  Back to guide
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
    </>
  );
}