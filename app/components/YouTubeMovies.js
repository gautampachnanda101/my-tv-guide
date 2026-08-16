/**
 * YouTube Free Movies Component
 * Displays a grid of free movies from YouTube
 */

'use client';

import { useState, useEffect } from 'react';
import styles from './YouTubeMovies.module.css';

export default function YouTubeMovies({ maxResults = 24, onPlayMovie }) {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    async function fetchMovies() {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/youtube-movies?maxResults=${maxResults}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch movies: ${response.status}`);
        }

        const data = await response.json();
        setMovies(data.movies || []);
      } catch (err) {
        console.error('Error fetching YouTube movies:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMovies();
  }, [maxResults]);

  async function refetchMovies() {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/youtube-movies?maxResults=${maxResults}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch movies: ${response.status}`);
      }

      const data = await response.json();
      setMovies(data.movies || []);
    } catch (err) {
      console.error('Error fetching YouTube movies:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const filteredMovies = movies.filter(movie => {
    if (filter === 'all') return true;
    return movie.genre?.toLowerCase() === filter;
  });

  const genres = ['all', ...new Set(movies.map(m => m.genre?.toLowerCase()).filter(Boolean))];

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading free movies from YouTube...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>⚠️ Error loading movies: {error}</p>
          <button onClick={refetchMovies} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>🎬 Free Movies on YouTube</h2>
        <div className={styles.filters}>
          {genres.map(genre => (
            <button
              key={genre}
              className={`${styles.filterButton} ${filter === genre ? styles.active : ''}`}
              onClick={() => setFilter(genre)}
            >
              {genre === 'all' ? 'All' : genre.charAt(0).toUpperCase() + genre.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredMovies.length === 0 ? (
        <div className={styles.empty}>
          <p>No movies found in this category.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredMovies.map(movie => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onPlay={onPlayMovie}
            />
          ))}
        </div>
      )}

      <div className={styles.footer}>
        <p>
          Showing {filteredMovies.length} of {movies.length} free movies
        </p>
      </div>
    </div>
  );
}

function MovieCard({ movie, onPlay }) {
  return (
    <div className={styles.card}>
      <div className={styles.thumbnail}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={movie.thumbnail}
          alt={movie.title}
          loading="lazy"
        />
        <button
          className={styles.playButton}
          onClick={() => onPlay?.(movie)}
          aria-label={`Play ${movie.title}`}
        >
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        </button>
      </div>
      
      <div className={styles.info}>
        <h3 className={styles.title}>{movie.title}</h3>
        <p className={styles.channel}>{movie.channel}</p>
        <div className={styles.meta}>
          {movie.genre && <span className={styles.genre}>{movie.genre}</span>}
          {movie.year && <span className={styles.year}>{movie.year}</span>}
        </div>
        {movie.description && (
          <p className={styles.description}>
            {movie.description.slice(0, 120)}
            {movie.description.length > 120 ? '...' : ''}
          </p>
        )}
      </div>
    </div>
  );
}
