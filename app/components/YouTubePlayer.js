/**
 * YouTube Video Player Modal Component
 * Embeds YouTube videos in a modal overlay
 */

'use client';

import { useEffect, useRef } from 'react';
import styles from './YouTubePlayer.module.css';

export default function YouTubePlayer({ movie, onClose }) {
  const backdropRef = useRef(null);

  useEffect(() => {
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden'; // Prevent background scroll

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === backdropRef.current) {
      onClose();
    }
  };

  // Handle keyboard on backdrop (for accessibility)
  const handleBackdropKeyDown = (e) => {
    // Clicking backdrop to close should also work with Enter/Space
    if ((e.key === 'Enter' || e.key === ' ') && e.target === backdropRef.current) {
      e.preventDefault();
      onClose();
    }
  };

  if (!movie) return null;

  return (
    <div
      ref={backdropRef}
      className={styles.modal}
      onClick={handleBackdropClick}
      onKeyDown={handleBackdropKeyDown}
      role="button"
      tabIndex={-1}
      aria-label="Close player by clicking backdrop"
    >
      <div
        className={styles.content}
        role="dialog"
        aria-modal="true"
        aria-labelledby="player-title"
      >
        <div className={styles.header}>
          <h2 id="player-title" className={styles.title}>
            {movie.title}
          </h2>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close player"
          >
            ✕
          </button>
        </div>

        <div className={styles.playerWrapper}>
          <iframe
            className={styles.player}
            src={`${movie.embedUrl}?autoplay=1&modestbranding=1&rel=0`}
            title={movie.title}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        <div className={styles.info}>
          <div className={styles.meta}>
            <span className={styles.channel}>📺 {movie.channel}</span>
            {movie.year && <span className={styles.year}>📅 {movie.year}</span>}
            {movie.genre && <span className={styles.genre}>🎬 {movie.genre}</span>}
          </div>
          
          {movie.description && (
            <p className={styles.description}>{movie.description}</p>
          )}

          <div className={styles.actions}>
            <a
              href={movie.watchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.watchButton}
            >
              Watch on YouTube →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
