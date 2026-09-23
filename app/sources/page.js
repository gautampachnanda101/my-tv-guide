"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "my-tv-guide.public-sources";

export default function SourcesPage() {
  const [sources, setSources] = useState([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("stream");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      setSources(Array.isArray(stored) ? stored.map((source) => ({ ...source, type: source.type || "playlist" })) : []);
    } catch {
      setSources([]);
    }
  }, []);

  function saveSources(next) {
    setSources(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function addSource(event) {
    event.preventDefault();
    const trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setMessage("Enter a public http:// or https:// playlist URL.");
      return;
    }

    const next = [
      ...sources,
      { id: crypto.randomUUID(), name: name.trim() || (type === "stream" ? "My personal stream" : "My public playlist"), url: trimmedUrl, type }
    ];
    saveSources(next);
    setName("");
    setUrl("");
    setMessage(`${type === "stream" ? "Stream" : "Playlist"} saved in this browser only.`);
  }

  return (
    <main className="page-shell" style={{ maxWidth: 960, margin: "0 auto" }}>
      <p className="eyebrow">Personal sources</p>
      <h1>My personal sources</h1>
      <p className="subhead">Add direct streams or public M3U playlists for your own browser. They stay in this device&apos;s local cache and are never stored in the backend.</p>
      <p><Link className="watch-link" href="/">Back to guide</Link></p>

      <section className="panel">
        <h2>Add a private source</h2>
        <form onSubmit={addSource} className="controls-grid" style={{ marginTop: "1rem" }}>
          <label className="control-item">
            <span>Name</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="My sports playlist" />
          </label>
          <label className="control-item">
            <span>Source type</span>
            <select value={type} onChange={(event) => setType(event.target.value)}>
              <option value="stream">Direct stream</option>
              <option value="playlist">M3U playlist</option>
            </select>
          </label>
          <label className="control-item">
            <span>{type === "stream" ? "Stream URL" : "Playlist URL"}</span>
            <input required type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder={type === "stream" ? "https://example.com/channel.m3u8" : "https://example.com/channels.m3u"} />
          </label>
          <button className="cta cta-primary" type="submit">Save source</button>
        </form>
        {message ? <p className="state">{message}</p> : null}
      </section>

      <section className="panel" style={{ marginTop: "1rem" }}>
        <h2>Saved on this device</h2>
        {sources.length === 0 ? <p className="state">No personal playlists yet.</p> : (
          <div className="source-grid" style={{ marginTop: "1rem" }}>
            {sources.map((source) => (
              <article className="panel" key={source.id}>
                <h3>{source.name}</h3>
                <p className="meta">{source.type === "stream" ? "Direct stream" : "M3U playlist"}</p>
                <p className="meta">{source.url}</p>
                <div className="detail-actions">
                  <a className="cta cta-primary" href={source.type === "stream" ? source.url : `/api/playlist?url=${encodeURIComponent(source.url)}`} target="_blank" rel="noreferrer">{source.type === "stream" ? "Open stream" : "Preview playlist"}</a>
                  <button className="cta cta-secondary" type="button" onClick={() => saveSources(sources.filter((item) => item.id !== source.id))}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
