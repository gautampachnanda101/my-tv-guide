"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./VideoPlayer.module.css";

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
  channelName,
  title,
  autoPlay = false,
  muted = false,
  onClose
}) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playlistEntries, setPlaylistEntries] = useState([]);
  const [selectedPlaylistUrl, setSelectedPlaylistUrl] = useState("");
  const [playlistLoading, setPlaylistLoading] = useState(false);

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
        setSelectedPlaylistUrl(entries[0]?.url || "");
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
  }, [isChannelPlaylist, streamUrl]);

  // Load HLS.js dynamically (only on client)
  useEffect(() => {
    let hls = null;
    
    const initPlayer = async () => {
      if (!activeStreamUrl || !videoRef.current) return;

      setError(null);
      setIsLoading(true);

      const video = videoRef.current;

      // Check if stream is HLS. IPTV sources use both the modern ".m3u8"
      // extension and the older bare ".m3u" playlist extension for what's
      // still functionally an HLS/live stream - a plain <video src> can't
      // parse either as a playlist, so both need to go through hls.js.
      const lowerUrl = activeStreamUrl.toLowerCase();
      const isHLS = lowerUrl.includes('.m3u8') || lowerUrl.includes('.m3u');

      if (isHLS) {
        // Dynamically import HLS.js
        try {
          const Hls = (await import('hls.js')).default;

          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
            });

            hls.loadSource(activeStreamUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setIsLoading(false);
              if (autoPlay) {
                video.play().catch(e => {
                  console.error('Auto-play failed:', e);
                  setError('Auto-play blocked. Click play to start.');
                });
              }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('HLS error:', data);
              if (data.fatal) {
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
                      setError('This stream refused the connection (blocked by its source) - try a different channel.');
                    } else {
                      setError('Network error. Please check your connection.');
                      hls.startLoad();
                    }
                    break;
                  }
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    setError('Media error. Attempting recovery...');
                    hls.recoverMediaError();
                    break;
                  default:
                    setError('Fatal error. Cannot play this stream.');
                    break;
                }
              }
            });

            hlsRef.current = hls;
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            // Native HLS support (Safari)
            video.src = activeStreamUrl;
            setIsLoading(false);
            if (autoPlay) {
              video.play().catch(e => {
                console.error('Auto-play failed:', e);
                setError('Auto-play blocked. Click play to start.');
              });
            }
          } else {
            setError('HLS not supported in this browser.');
          }
        } catch (err) {
          console.error('Failed to load HLS.js:', err);
          setError('Failed to load video player library.');
        }
      } else {
        // Direct video source
        video.src = activeStreamUrl;
        setIsLoading(false);
        if (autoPlay) {
          video.play().catch(e => {
            console.error('Auto-play failed:', e);
            setError('Auto-play blocked. Click play to start.');
          });
        }
      }
    };

    initPlayer();

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStreamUrl, autoPlay]);

  // Handle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      videoRef.current.play()
        .then(() => setIsPlaying(true))
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

  // Update playing state when video plays/pauses
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
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
            <span className={styles.srOnly}>Choose channel</span>
            <select value={selectedPlaylistUrl} onChange={(event) => setSelectedPlaylistUrl(event.target.value)}>
              {playlistEntries.map((entry) => (
                <option key={entry.id} value={entry.url}>{entry.title}</option>
              ))}
            </select>
          </label>
        ) : null}
        {onClose && (
          <button 
            onClick={onClose} 
            className={styles.closeBtn}
            aria-label="Close player"
          >
            ✕
          </button>
        )}
      </div>

      <div className={styles.videoWrapper}>
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
            <button onClick={() => window.location.reload()} className={styles.retryBtn}>
              Retry
            </button>
          </div>
        )}

        <div className={styles.controls}>
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
