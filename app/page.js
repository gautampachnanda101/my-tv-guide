"use client";

import { useEffect, useMemo, useState } from "react";

const tabs = [
  { key: "liveNow", label: "Live Now" },
  { key: "upcoming", label: "Upcoming" },
  { key: "tvChannels", label: "TV Channels" },
  { key: "streamingApps", label: "Streaming Apps" }
];

function formatDateTime(value) {
  if (!value) return "TBA";
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

export default function HomePage() {
  const [region, setRegion] = useState("uk");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("liveNow");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [guide, setGuide] = useState({
    liveNow: [],
    upcoming: [],
    tvChannels: [],
    streamingApps: [],
    sourceStatus: [],
    providerWarnings: [],
    supportedRegions: ["uk"]
  });

  async function loadGuide(currentRegion, currentQuery) {
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      region: currentRegion,
      q: currentQuery
    });

    try {
      const response = await fetch(`/api/guide?${params.toString()}`, {
        cache: "no-store"
      });
      if (!response.ok) {
        throw new Error("Could not fetch guide data.");
      }
      const payload = await response.json();
      setGuide({
        liveNow: payload.liveNow || [],
        upcoming: payload.upcoming || [],
        tvChannels: payload.tvChannels || [],
        streamingApps: payload.streamingApps || [],
        sourceStatus: payload.sourceStatus || [],
        providerWarnings: payload.providerWarnings || [],
        supportedRegions: payload.supportedRegions || ["uk"]
      });
    } catch {
      setError("Could not load guide data right now. Please retry.");
      setGuide((prev) => ({
        ...prev,
        liveNow: [],
        upcoming: [],
        tvChannels: [],
        streamingApps: []
      }));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGuide(region, query);
  }, [region, query]);

  const counts = useMemo(
    () => ({
      liveNow: guide.liveNow.length,
      upcoming: guide.upcoming.length,
      tvChannels: guide.tvChannels.length,
      streamingApps: guide.streamingApps.length
    }),
    [guide]
  );

  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">One Stop TV Hub</p>
        <h1>My TV Guide</h1>
        <p className="subhead">
          Discover live programmes, TV channels, and streaming apps in one place.
          Built for a free Vercel deployment and designed to expand country by country.
        </p>
        <div className="hero-meta">
          <span>UK MVP live</span>
          <span>Auto open API integrations</span>
          <span>Open standards compatible</span>
        </div>
      </section>

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
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="section-title-row">
          <h2>Guide</h2>
          <button type="button" className="ghost" onClick={() => loadGuide(region, query)}>
            Refresh
          </button>
        </div>

        <div className="tabs-row">
          {tabs.map((item) => (
            <button
              key={item.key}
              type="button"
              className={tab === item.key ? "tab-pill active" : "tab-pill"}
              onClick={() => setTab(item.key)}
            >
              {item.label} ({counts[item.key]})
            </button>
          ))}
        </div>

        {loading ? <p className="state">Loading listings...</p> : null}
        {error ? <p className="state error">{error}</p> : null}
        {!loading && !error && guide.providerWarnings.length > 0 ? (
          <div className="warning-box">
            {guide.providerWarnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        {!loading && !error && guide.sourceStatus.length > 0 ? (
          <div className="source-grid">
            {guide.sourceStatus.map((source) => (
              <article key={source.id} className="source-card">
                <h3>{source.name}</h3>
                <p>{source.standard}</p>
                <p className="meta">Mode: {source.integration}</p>
                <p className={`status ${source.status}`}>Status: {source.status}</p>
              </article>
            ))}
          </div>
        ) : null}

        {!loading && !error && tab === "liveNow" && guide.liveNow.length === 0 ? (
          <p className="state">No programmes are marked as live right now.</p>
        ) : null}
        {!loading && !error && tab === "liveNow" && guide.liveNow.length > 0 ? (
          <ul className="listing-grid">
            {guide.liveNow.map((item) => (
              <li key={item.id} className="listing-card">
                <p className="sport-tag">LIVE</p>
                <h3>{item.show}</h3>
                <p>{item.title}</p>
                <p className="meta">{item.channel}</p>
                <p className="meta">Started: {formatDateTime(item.startAt)}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !error && tab === "upcoming" && guide.upcoming.length === 0 ? (
          <p className="state">No upcoming programmes match this search.</p>
        ) : null}
        {!loading && !error && tab === "upcoming" && guide.upcoming.length > 0 ? (
          <ul className="listing-grid">
            {guide.upcoming.map((item) => (
              <li key={item.id} className="listing-card">
                <p className="sport-tag">UP NEXT</p>
                <h3>{item.show}</h3>
                <p>{item.title}</p>
                <p className="meta">{item.channel}</p>
                <p className="meta">Starts: {formatDateTime(item.startAt)}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !error && tab === "tvChannels" && guide.tvChannels.length === 0 ? (
          <p className="state">No channels match this search.</p>
        ) : null}
        {!loading && !error && tab === "tvChannels" && guide.tvChannels.length > 0 ? (
          <ul className="listing-grid">
            {guide.tvChannels.map((item) => (
              <li key={item.id} className="listing-card">
                <p className="sport-tag">{item.genre}</p>
                <h3>{item.name}</h3>
                <p>{item.access}</p>
                <p className="meta">Watch via: {item.watchVia.join(", ")}</p>
              </li>
            ))}
          </ul>
        ) : null}

        {!loading && !error && tab === "streamingApps" && guide.streamingApps.length === 0 ? (
          <p className="state">No streaming apps match this search.</p>
        ) : null}

        {!loading && !error && tab === "streamingApps" && guide.streamingApps.length > 0 ? (
          <ul className="listing-grid">
            {guide.streamingApps.map((item) => (
              <li key={item.id} className="listing-card">
                <p className="sport-tag">{item.category}</p>
                <h3>{item.name}</h3>
                <p>{item.priceModel}</p>
                <p className="meta">Platforms: {item.platforms.join(", ")}</p>
                <p className="meta">Highlights: {item.highlights.join(" • ")}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </main>
  );
}