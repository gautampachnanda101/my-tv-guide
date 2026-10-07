"use client";

import { useEffect, useState } from "react";
import {
  addLocalSource,
  clearLocalSources,
  loadLocalSources,
  LocalSourcesUnreadableError,
  removeLocalSource,
  SecureStorageUnavailableError
} from "@/lib/personalSources/localStore";

// "On this device" personal sources: no sign-in, never stored server-side,
// encrypted in this browser (see lib/personalSources/localStore.js).
export default function LocalSourcesManager() {
  const [sources, setSources] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | unavailable | unreadable
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [type, setType] = useState("stream");
  const [acknowledged, setAcknowledged] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadLocalSources()
      .then((list) => {
        setSources(list);
        setStatus("ready");
      })
      .catch((error) => {
        if (error instanceof LocalSourcesUnreadableError) setStatus("unreadable");
        else setStatus("unavailable");
      });
  }, []);

  async function handleAdd(event) {
    event.preventDefault();
    const trimmedUrl = url.trim();
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      setMessage("Enter an http:// or https:// URL.");
      return;
    }
    try {
      setSources(await addLocalSource({ name, type, url: trimmedUrl }));
      setName("");
      setUrl("");
      setAcknowledged(false);
      setMessage(`${type === "stream" ? "Stream" : "Playlist"} saved on this device, encrypted.`);
    } catch (error) {
      setMessage(error instanceof SecureStorageUnavailableError
        ? "This browser can't store it securely (private browsing?), so it wasn't saved."
        : "Couldn't save it - try again.");
    }
  }

  async function handleRemove(id) {
    try {
      setSources(await removeLocalSource(id));
    } catch {
      setMessage("Couldn't remove it - try again.");
    }
  }

  function handleClearUnreadable() {
    clearLocalSources();
    setSources([]);
    setStatus("ready");
    setMessage("");
  }

  return (
    <>
      <section className="panel" style={{ marginTop: "1rem" }}>
        <h2>Saved on this device</h2>
        <p className="subhead">
          No sign-in needed. Encrypted in this browser with a key that never leaves it, and never stored on our server
          (playing a stream may still pass its URL through our player proxy, which doesn&apos;t keep it).
        </p>

        {status === "unavailable" ? (
          <p className="state error" role="alert">
            This browser can&apos;t store sources securely (for example in private browsing), so device saving is off here.
          </p>
        ) : null}

        {status === "unreadable" ? (
          <div className="state error" role="alert">
            <p>
              Sources saved on this device can no longer be decrypted - the browser&apos;s key was cleared (usually by clearing
              site data). They can&apos;t be recovered.
            </p>
            <button type="button" className="cta cta-secondary" onClick={handleClearUnreadable}>Clear and start again</button>
          </div>
        ) : null}

        {status === "ready" ? (
          <form onSubmit={handleAdd} className="controls-grid" style={{ marginTop: "1rem" }}>
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
              <input
                required
                type="url"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                placeholder={type === "stream" ? "https://example.com/channel.m3u8" : "https://example.com/channels.m3u"}
              />
            </label>
            <label className="control-item legal-ack">
              <input type="checkbox" required checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} />
              <span>I confirm I have the legal right to access this stream. I understand this app does not host, verify, or take responsibility for it.</span>
            </label>
            <button className="cta cta-primary" type="submit">Save on this device</button>
          </form>
        ) : null}
        {message ? <p className="state" role="status">{message}</p> : null}

        {status === "loading" ? <p className="state">Loading...</p> : null}
        {status === "ready" && sources.length === 0 ? <p className="state">Nothing saved on this device yet.</p> : null}
        {status === "ready" && sources.length > 0 ? (
          <div className="source-grid" style={{ marginTop: "1rem" }}>
            {sources.map((source) => (
              <article className="panel" key={source.id}>
                <h3>{source.name}</h3>
                <p className="meta">{source.type === "stream" ? "Direct stream - shown in the guide's channels" : "M3U playlist"}</p>
                <p className="meta">Not verified - use at your own risk</p>
                <div className="detail-actions">
                  <a
                    className="cta cta-primary"
                    href={source.type === "stream" ? source.url : `/api/playlist?url=${encodeURIComponent(source.url)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.type === "stream" ? "Open stream" : "Preview playlist"}
                  </a>
                  <button className="cta cta-secondary" type="button" onClick={() => handleRemove(source.id)}>Remove</button>
                </div>
              </article>
            ))}
          </div>
        ) : null}
      </section>
    </>
  );
}
