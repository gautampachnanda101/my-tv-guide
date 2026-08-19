/**
 * TMDB (The Movie Database) Provider
 * Provides rich metadata for TV shows and movies
 * Free API with 1M requests/month limit
 */

import { getCredential } from "@/lib/security/credentials";
import { mapWithConcurrency, resilientFetch } from "@/lib/framework/resilientFetch";

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

// TMDB's free tier allows 40 req/10s, but a flaky/traveling connection can
// stack up slow requests just as easily as a rate limit - cap concurrency
// so one bad connection doesn't serialize into a multi-minute page load.
const MAX_CONCURRENT_LOOKUPS = 5;

/**
 * Fetch show metadata from TMDB
 * @param {string} showName - Name of the show to search for
 * @returns {Promise<Object|null>} Show metadata or null if not found
 */
export async function fetchTmdbShowMetadata(showName) {
  const apiKey = await getCredential("TMDB_API_KEY");

  if (!apiKey) {
    console.warn("TMDB_API_KEY not configured");
    return null;
  }

  try {
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(showName)}`;

    const data = await resilientFetch(
      `tmdb:search:${showName}`,
      searchUrl,
      { headers: { Accept: "application/json" } },
      { ttlMs: 3600000, staleMs: 24 * 3600000, timeoutMs: 6000 }
    );

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const show = data.results[0]; // Get best match

    return {
      id: show.id,
      title: show.name,
      originalTitle: show.original_name,
      overview: show.overview,
      posterPath: show.poster_path ? `${TMDB_IMAGE_BASE}/w500${show.poster_path}` : null,
      backdropPath: show.backdrop_path ? `${TMDB_IMAGE_BASE}/original${show.backdrop_path}` : null,
      rating: show.vote_average,
      voteCount: show.vote_count,
      popularity: show.popularity,
      firstAirDate: show.first_air_date,
      genreIds: show.genre_ids,
      originalLanguage: show.original_language,
      originCountry: show.origin_country
    };
  } catch (error) {
    console.error("TMDB metadata fetch error:", error);
    return null;
  }
}

/**
 * Fetch detailed show information including cast, crew, and episodes
 * @param {number} tmdbId - TMDB show ID
 * @returns {Promise<Object|null>} Detailed show information
 */
export async function fetchTmdbShowDetails(tmdbId) {
  const apiKey = await getCredential("TMDB_API_KEY");

  if (!apiKey) {
    console.warn("TMDB_API_KEY not configured");
    return null;
  }

  try {
    const detailsUrl = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${apiKey}&append_to_response=credits,content_ratings,external_ids`;

    const show = await resilientFetch(
      `tmdb:details:${tmdbId}`,
      detailsUrl,
      { headers: { Accept: "application/json" } },
      { ttlMs: 3600000, staleMs: 24 * 3600000, timeoutMs: 6000 }
    );

    return {
      id: show.id,
      title: show.name,
      tagline: show.tagline,
      overview: show.overview,
      posterPath: show.poster_path ? `${TMDB_IMAGE_BASE}/w500${show.poster_path}` : null,
      backdropPath: show.backdrop_path ? `${TMDB_IMAGE_BASE}/original${show.backdrop_path}` : null,
      rating: show.vote_average,
      voteCount: show.vote_count,
      popularity: show.popularity,
      firstAirDate: show.first_air_date,
      lastAirDate: show.last_air_date,
      genres: show.genres?.map(g => g.name) || [],
      networks: show.networks?.map(n => n.name) || [],
      numberOfSeasons: show.number_of_seasons,
      numberOfEpisodes: show.number_of_episodes,
      status: show.status,
      type: show.type,
      cast: show.credits?.cast?.slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        profilePath: c.profile_path ? `${TMDB_IMAGE_BASE}/w185${c.profile_path}` : null
      })) || [],
      creators: show.created_by?.map(c => c.name) || [],
      imdbId: show.external_ids?.imdb_id || null,
      tvdbId: show.external_ids?.tvdb_id || null
    };
  } catch (error) {
    console.error("TMDB details fetch error:", error);
    return null;
  }
}

/**
 * Fetch where a show is available to stream, via TMDB's watch-providers
 * endpoint. This is TMDB's own official, documented, high-rate-limit API -
 * it licenses the same underlying availability data JustWatch's unofficial
 * API serves, but reliably (no scraping, no undocumented rate limits).
 * "You must attribute the source of the data as JustWatch" per TMDB's terms
 * for this endpoint - see the attribution note next to where this is shown.
 * @param {number} tmdbId - TMDB show ID
 * @returns {Promise<{flatrate: string[], free: string[]}|null>}
 */
export async function fetchTmdbWatchProviders(tmdbId) {
  const apiKey = await getCredential("TMDB_API_KEY");
  if (!apiKey || !tmdbId) return null;

  try {
    const data = await resilientFetch(
      `tmdb:watch-providers:${tmdbId}`,
      `${TMDB_BASE_URL}/tv/${tmdbId}/watch/providers?api_key=${apiKey}`,
      { headers: { Accept: "application/json" } },
      { ttlMs: 21600000, staleMs: 3 * 86400000, timeoutMs: 6000 }
    );

    const gb = data.results?.GB;
    if (!gb) return null;

    return {
      flatrate: (gb.flatrate || []).map((p) => p.provider_name),
      free: (gb.free || []).map((p) => p.provider_name)
    };
  } catch (error) {
    console.error("TMDB watch-providers fetch error:", error);
    return null;
  }
}

/**
 * Enrich schedule items with TMDB metadata
 * @param {Array} scheduleItems - Schedule items to enrich
 * @returns {Promise<Array>} Enriched schedule items
 */
export async function enrichScheduleWithTmdb(scheduleItems) {
  if (!(await getCredential("TMDB_API_KEY"))) {
    return scheduleItems; // Return unchanged if no API key
  }

  return mapWithConcurrency(scheduleItems, MAX_CONCURRENT_LOOKUPS, async (item) => {
    const metadata = await fetchTmdbShowMetadata(item.show || item.title);

    if (metadata) {
      const providers = await fetchTmdbWatchProviders(metadata.id);
      const streamingOn = providers ? [...providers.free, ...providers.flatrate] : [];

      return {
        ...item,
        tmdb: metadata,
        // Prefer TMDB images if available
        image: metadata.backdropPath || metadata.posterPath || item.image,
        // Prefer TMDB rating if available
        rating: metadata.rating || item.rating,
        // Enhanced summary
        summary: metadata.overview || item.summary,
        streamingOn,
        isStreaming: streamingOn.length > 0
      };
    }

    return item;
  });
}

/**
 * Health check for TMDB provider
 * @returns {Promise<boolean>} True if provider is healthy
 */
export async function tmdbHealthCheck() {
  const apiKey = await getCredential("TMDB_API_KEY");

  if (!apiKey) {
    return false;
  }

  try {
    await resilientFetch(
      "tmdb:configuration",
      `${TMDB_BASE_URL}/configuration?api_key=${apiKey}`,
      { headers: { Accept: "application/json" } },
      { ttlMs: 86400000, staleMs: 7 * 86400000, timeoutMs: 6000 }
    );
    return true;
  } catch {
    return false;
  }
}
