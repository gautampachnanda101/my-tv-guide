"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./VideoPlayer.module.css";

function normalizeForMatch(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Multiple catalog channels can fall back to the same shared M3U playlist
// when no channel-specific stream URL is known (see getKnownPlaylistUrl in
// lib/providers/uk/open-standards.js) - defaulting to the playlist's first
// entry regardless of which channel was actually clicked made every one of
// those channels look "stuck" playing the same stream. Try to find the
// entry whose title actually matches the clicked channel's name first.
function findBestPlaylistEntry(entries, channelName) {
  const target = normalizeForMatch(channelName);
  if (!target) return null;
  return (
    entries.find((entry) => normalizeForMatch(entry.title) === target) ||
    entries.find((entry) => normalizeForMatch(entry.title).includes(target) || target.includes(normalizeForMatch(entry.title))) ||
    null
  );
}

/**
 * VideoPlayer Component
 * Client-side video player for live TV streams with HLS support
 * 
 * @param {Object} props
 * @param {string} props.streamUrl - URL to the video stream (M3U8 for HLS or direct video)
 * @param {string} props.channelName - Name of the channel being played
 * @param {string} props.title - Optional title/show currently playing
 * @param {boolean} props.autoPlay - Auto-play on mount (default: false)
 * @param {boolean} props.muted - Start muted (default: false)
 * @param {Function} props.onClose - Callback when user closes the player
 */
export default function VideoPlayer({
  streamUrl,
  streamReferrer,
  streamUserAgent,
  streamGeoBlocked,
  channelName,
  title,
  autoPlay = false,
  muted = false,
  onClose
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const hideControlsTimeoutRef = useRef(null);
  const stallTimeoutRef = useRef(null);
  // Some IPTV streams (often geo-blocked or down) never fire a manifest/
  // media error - they just hang forever, which on mobile networks looked
  // like a permanently stuck loading spinner instead of an actual failure.
  const playbackStartedRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [error, setError] = useState(null);
  // Autoplay being blocked by the browser isn't a real playback error - it
  // just needs a user gesture. Treating it as `error` rendered the same
  // full-screen "something's wrong" overlay (with only "Open source"/
  // "Retry" buttons), which sits on top of and hides the actual play
  // button it was telling the user to press.
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playlistEntries, setPlaylistEntries] = useState([]);
  const [selectedPlaylistUrl, setSelectedPlaylistUrl] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);
  // "Retry" used to be a full window.location.reload() - that lost the
  // user's place in the guide and still re-loaded the exact same failing
  // stream, so it never actually offered a way to recover. Bumping this
  // instead re-runs the load effect below in place.
  const [retryToken, setRetryToken] = useState(0);
  // Forces the next load attempt through /api/stream-proxy even for an
  // https:// source - set when a direct attempt fails with a network error,
  // since some CDNs (e.g. Pluto TV) lock CORS to their own origin and
  // reject any browser request from ours, which only a server-side fetch
  // (not subject to CORS at all) can get past.
  const [forceProxy, setForceProxy] = useState(false);
  const usingProxyRef = useRef(false);

  useEffect(() => {
    setForceProxy(false);
  }, [streamUrl, channelName]);

  const isChannelPlaylist = /\.m3u(?:$|\?)/i.test(streamUrl || "") && !/\.m3u8(?:$|\?)/i.test(streamUrl || "");
  const activeStreamUrl = isChannelPlaylist ? selectedPlaylistUrl : streamUrl;

  useEffect(() => {
    let cancelled = false;

    if (!isChannelPlaylist) {
      setPlaylistEntries([]);
      setSelectedPlaylistUrl("");
      return undefined;
    }

    setPlaylistLoading(true);
    setError(null);
    fetch(`/api/playlist?url=${encodeURIComponent(streamUrl)}`)
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not load playlist");
        return payload.entries || [];
      })
      .then((entries) => {
        if (cancelled) return;
        setPlaylistEntries(entries);
        const matched = findBestPlaylistEntry(entries, channelName);
        setSelectedPlaylistUrl(matched?.url || entries[0]?.url || "");
        if (entries.length === 0) setError("This M3U playlist contains no playable streams.");
      })
      .catch((error) => {
        if (!cancelled) setError(error.message || "Could not load M3U playlist.");
      })
      .finally(() => {
        if (!cancelled) setPlaylistLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isChannelPlaylist, streamUrl, channelName]);

  // Load HLS.js dynamically (only on client)
  useEffect(() => {
    let hls = null;
    
    const initPlayer = async () => {
      if (!activeStreamUrl || !videoRef.current) return;

      setError(null);
      setAutoplayBlocked(false);
      setIsLoading(true);
      playbackStartedRef.current = false;

      if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
      stallTimeoutRef.current = setTimeout(() => {
        if (!playbackStartedRef.current) {
          setIsLoading(false);
          setError(
            streamGeoBlocked
              ? 'This channel is restricted to viewers in the UK and may not be available on this network. Try another channel or use Open source.'
              : 'This channel is taking too long to load - it may be blocked on this network or temporarily down. Try another channel or use Open source.'
          );
        }
      }, 15000);

      const video = videoRef.current;

      // Check if stream is HLS. IPTV sources use both the modern ".m3u8"
      // extension and the older bare ".m3u" playlist extension for what's
      // still functionally an HLS/live stream - a plain <video src> can't
      // parse either as a playlist, so both need to go through hls.js.
      const lowerUrl = activeStreamUrl.toLowerCase();
      const isHLS = lowerUrl.includes('.m3u8') || lowerUrl.includes('.m3u');

      // Plenty of crowd-sourced IPTV streams are plain http:// - browsers
      // block loading that as "mixed content" into this https:// page at
      // the network layer, with no error event the player can catch. Our
      // own /api/stream-proxy fetches it server-side (no mixed-content rule
      // applies there) and re-serves it from this https:// origin instead.
      const needsHttpsProxy =
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        lowerUrl.startsWith("http://");
      // iptv-org records the exact Referer/User-Agent some CDNs require -
      // when we know it upfront, use the proxy right away instead of
      // waiting for a direct attempt to fail first, since a browser can't
      // set an arbitrary Referer on its own requests at all.
      const hasHeaderHints = Boolean(streamReferrer || streamUserAgent);
      const usingProxy = needsHttpsProxy || forceProxy || hasHeaderHints;
      usingProxyRef.current = usingProxy;
      const loadUrl = usingProxy
        ? `/api/stream-proxy?url=${encodeURIComponent(activeStreamUrl)}${
            streamReferrer ? `&referrer=${encodeURIComponent(streamReferrer)}` : ""
          }${streamUserAgent ? `&userAgent=${encodeURIComponent(streamUserAgent)}` : ""}`
        : activeStreamUrl;

      if (isHLS) {
        // Prefer native HLS where the browser supports it, especially Safari.
        // HLS.js is the fallback for browsers that need Media Source Extensions.
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Safari doesn't reliably pick up a new source on an already-loaded
          // <video> just by reassigning `.src` - without an explicit load(),
          // it keeps playing whatever was already buffered, so every "Play
          // now" click after the first looked like it played the same stream.
          video.src = loadUrl;
          video.load();
          setIsLoading(false);
          if (autoPlay) {
            video.play().catch(() => setAutoplayBlocked(true));
          }
          return;
        }

        try {
          const Hls = (await import('hls.js')).default;

          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });
            // Assign before attachMedia/loadSource: attaching media can
            // itself trigger a native <video> 'error' event, and that
            // listener uses hlsRef.current to tell hls.js-managed errors
            // apart from real ones - it needs to already see hls.js as
            // owning playback by the time that fires.
            hlsRef.current = hls;

            hls.loadSource(loadUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              if (autoPlay) {
                video.play().catch(e => {
                  console.error('Auto-play failed:', e);
                  setAutoplayBlocked(true);
                });
              }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('HLS error:', data);
              if (!data.fatal) return;

              // Some CDNs (e.g. Pluto TV) lock CORS to their own origin and
              // reject any request from ours, which hls.js reports as a
              // generic NETWORK_ERROR - a server-side fetch isn't subject to
              // CORS at all, so retry once through our own proxy before
              // giving up. Skipped for known geo-blocked streams: our proxy
              // runs from a fixed, non-UK Vercel region, so it can only
              // fail the exact same way - the browser's own request, from
              // the visitor's real location, is the only attempt with any
              // chance of working.
              if (data.type === Hls.ErrorTypes.NETWORK_ERROR && !usingProxy && !streamGeoBlocked) {
                setForceProxy(true);
                setRetryToken((current) => current + 1);
                return;
              }

              setIsLoading(false);
              switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR: {
                    // HLS.js buckets both real connectivity failures and
                    // the source's own CDN rejecting the request (401/403 -
                    // common on crowd-sourced IPTV lists, where a stream is
                    // geo-blocked or refuses playback outside its own app)
                    // under the same NETWORK_ERROR type. Only the former is
                    // worth auto-retrying.
                    const status = data.response?.code;
                    if (status === 401 || status === 403) {
                      setError('This channel is not available here right now. Try another channel or use Open source.');
                    } else if (data.response?.code === 404 || data.response?.code === 410) {
                      setError('This channel is no longer available. Try another channel or use Open source.');
                    } else {
                      setError('This channel cannot play in the guide right now. Use Open source to watch it in a new tab, or try another channel.');
                    }
                    break;
                  }
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    setError('This channel could not start in the player. Try another channel or use Open source.');
                    hls.recoverMediaError();
                    break;
                  default:
                    setError('This channel could not be played here. Try another channel or use Open source.');
                    break;
                }
            });
          } else {
            setIsLoading(false);
            setError('This channel format is not supported in this browser. Try Open source or another channel.');
          }
        } catch (err) {
          console.error('Failed to load HLS.js:', err);
          setIsLoading(false);
          setError('The player could not start this channel. Try Open source or another channel.');
        }
      } else {
        // Direct video source
        video.src = loadUrl;
        video.load();
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(e => {
            console.error('Auto-play failed:', e);
            setAutoplayBlocked(true);
          });
        }
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (stallTimeoutRef.current) {
        clearTimeout(stallTimeoutRef.current);
        stallTimeoutRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStreamUrl, autoPlay, retryToken, forceProxy, streamReferrer, streamUserAgent, streamGeoBlocked]);

  // Handle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(e => setError('Failed to play video'));
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  // Handle mute/unmute
  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      if (newVolume === 0) {
        setIsMuted(true);
      } else if (isMuted) {
        setIsMuted(false);
      }
    }
  };

  // Handle fullscreen
  const toggleFullscreen = () => {
    if (!videoRef.current) return;

    if (!document.fullscreenElement) {
      videoRef.current.requestFullscreen?.()
        .then(() => setIsFullscreen(true))
        .catch(e => console.error('Fullscreen failed:', e));
    } else {
      document.exitFullscreen?.()
        .then(() => setIsFullscreen(false))
        .catch(e => console.error('Exit fullscreen failed:', e));
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Controls only had a CSS `:hover` reveal, so once playback started they
  // were invisible (and undiscoverable on touch, which has no hover) unless
  // the mouse happened to still be over the player. Show them on any
  // interaction and auto-hide after a few seconds of inactivity, but only
  // while actually playing - a paused player always shows its controls.
  const revealControls = () => {
    setControlsVisible(true);
    if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    if (!isPlaying) return;
    hideControlsTimeoutRef.current = setTimeout(() => setControlsVisible(false), 5000);
  };

  useEffect(() => {
    revealControls();
    return () => {
      if (hideControlsTimeoutRef.current) clearTimeout(hideControlsTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only isPlaying should retrigger this
  }, [isPlaying]);

  // Update playing state when video plays/pauses
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setAutoplayBlocked(false);
      playbackStartedRef.current = true;
    };
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => {
      setIsLoading(false);
      playbackStartedRef.current = true;
    };
    // Native HLS (Safari/iOS) and the plain <video src> path set isLoading
    // false optimistically without waiting for real data - if the manifest
    // is blocked or the stream is down, the <video> element fires its own
    // 'error' event rather than through hls.js. hls.js-managed playback
    // already has its own (sometimes non-fatal/recoverable) error handling
    // via Hls.Events.ERROR, and the level-switch/recovery process it does
    // internally can itself trigger a spurious native 'error' on <video> -
    // treating that as fatal here broke playback that hls.js would have
    // otherwise recovered from, so skip it whenever hls.js is attached.
    const handleVideoError = () => {
      if (hlsRef.current) return;
      // Native HLS (Safari) also enforces CORS on cross-origin manifest
      // loads - a CDN that locks it to its own site's origin fails here
      // exactly like it does in hls.js, just as a generic native error.
      // Retry once through the server-side proxy before giving up, unless
      // this stream is known geo-blocked - our proxy runs from a fixed,
      // non-UK Vercel region and would only fail the same way.
      if (!usingProxyRef.current && !streamGeoBlocked) {
        setForceProxy(true);
        setRetryToken((current) => current + 1);
        return;
      }
      playbackStartedRef.current = true;
      setIsLoading(false);
      setError(
        streamGeoBlocked
          ? 'This channel is restricted to viewers in the UK and may not be available on this network. Try another channel or use Open source.'
          : 'This channel could not play on this device or network. Try another channel or use Open source.'
      );
    };

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleVideoError);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleVideoError);
    };
    // Intentionally mount-once: VideoPlayer remounts fresh per play request
    // (key={id} at the call site), so streamGeoBlocked is already correct
    // for whichever stream is currently loaded and doesn't need to
    // retrigger this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!streamUrl) {
    return (
      <div className={styles.error}>
        <p>No stream URL provided</p>
        {onClose && (
          <button onClick={onClose} className={styles.closeBtn}>Close</button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.playerContainer}>
      <div className={styles.playerHeader}>
        <div className={styles.playerInfo}>
          <h3 className={styles.channelName}>{channelName}</h3>
          {title && <p className={styles.showTitle}>{title}</p>}
        </div>
        {isChannelPlaylist && playlistEntries.length > 0 ? (
          <label className={styles.playlistSelect}>
            <span className={styles.playlistLabel}>Choose a channel</span>
            <select value={selectedPlaylistUrl} onChange={(event) => setSelectedPlaylistUrl(event.target.value)}>
              {playlistEntries.map((entry) => (
                <option key={entry.id} value={entry.url}>{entry.title}</option>
              ))}
            </select>
          </label>
        ) : null}
        {onClose && (
          <div className={styles.playerActions}>
            <button onClick={onClose} className={styles.backBtn} type="button">
              Back to guide
            </button>
            <button onClick={onClose} className={styles.closeBtn} type="button" aria-label="Close player">
              ✕
            </button>
          </div>
        )}
      </div>

      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- convenience reveal-on-click for mouse/touch; the actual controls underneath are the real interactive/keyboard-reachable elements */}
      <div className={styles.videoWrapper} onMouseMove={revealControls} onTouchStart={revealControls} onClick={revealControls}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption -- live stream has no captions track available */}
        <video
          ref={videoRef}
          className={styles.video}
          playsInline
          muted={muted}
          controls={false}
        />
        
        {(isLoading || playlistLoading) && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>{playlistLoading ? "Loading channel list..." : "Loading stream..."}</p>
          </div>
        )}

        {error && (
          <div className={styles.errorOverlay}>
            <p className={styles.errorMessage}>{error}</p>
            {/* Crowd-sourced IPTV streams fail often and unpredictably - showing
                which channel/URL actually failed (instead of just a generic
                message) makes it possible to tell a one-off dead link apart
                from a real player bug without needing devtools. */}
            <p className={styles.errorDetail}>
              {channelName}
              {activeStreamUrl ? ` · ${activeStreamUrl}` : ""}
            </p>
            <button
              onClick={() => window.open(activeStreamUrl, '_blank', 'noopener,noreferrer')}
              className={styles.retryBtn}
            >
              Open source
            </button>
            <button onClick={() => setRetryToken((current) => current + 1)} className={styles.retryBtn}>
              Retry
            </button>
          </div>
        )}

        {!error && !isLoading && autoplayBlocked && (
          <button
            type="button"
            className={styles.autoplayPrompt}
            onClick={togglePlay}
            aria-label="Press play to start"
          >
            <span aria-hidden="true">▶</span> Press play to start
          </button>
        )}

        <div className={`${styles.controls} ${controlsVisible ? styles.controlsVisible : ""}`}>
          <button 
            onClick={togglePlay}
            className={styles.playBtn}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <button
            onClick={toggleMute}
            className={styles.muteBtn}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>

          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            className={styles.volumeSlider}
            aria-label="Volume"
          />

          <div className={styles.spacer}></div>

          <span className={styles.liveIndicator}>🔴 LIVE</span>

          <button
            onClick={toggleFullscreen}
            className={styles.fullscreenBtn}
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </div>
    </div>
  );
}
