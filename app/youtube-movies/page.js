/**
 * YouTube Free Movies Demo Page
 * Demonstrates the YouTube movies integration
 */

'use client';

import { useState } from 'react';
import YouTubeMovies from '@/app/components/YouTubeMovies';
import YouTubePlayer from '@/app/components/YouTubePlayer';
import styles from './page.module.css';

export default function YouTubeMoviesPage() {
  const [selectedMovie, setSelectedMovie] = useState(null);

  const handlePlayMovie = (movie) => {
    setSelectedMovie(movie);
  };

  const handleClosePlayer = () => {
    setSelectedMovie(null);
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>🎬 Free Movies on YouTube</h1>
        <p className={styles.subtitle}>
          Watch free movies legally on YouTube - no subscription required!
        </p>
      </header>

      <main className={styles.main}>
        <YouTubeMovies
          maxResults={24}
          onPlayMovie={handlePlayMovie}
        />
      </main>

      {selectedMovie && (
        <YouTubePlayer
          movie={selectedMovie}
          onClose={handleClosePlayer}
        />
      )}

      <footer className={styles.footer}>
        <p>
          💡 <strong>Tip:</strong> Configure your <code>YOUTUBE_API_KEY</code> in{' '}
          <code>.env.local</code> to see real free movies from YouTube.
        </p>
        <p>
          Get your free API key at{' '}
          <a
            href="https://console.cloud.google.com/apis/credentials"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Cloud Console
          </a>
        </p>
      </footer>
    </div>
  );
}
