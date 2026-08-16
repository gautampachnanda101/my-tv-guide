/**
 * TMDB (The Movie Database) Provider
 * Provides rich metadata for TV shows and movies
 * Free API with 1M requests/month limit
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

/**
 * Fetch show metadata from TMDB
 * @param {string} showName - Name of the show to search for
 * @returns {Promise<Object|null>} Show metadata or null if not found
 */
export async function fetchTmdbShowMetadata(showName) {
  const apiKey = process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    console.warn("TMDB_API_KEY not configured");
    return null;
  }

  try {
    const searchUrl = `${TMDB_BASE_URL}/search/tv?api_key=${apiKey}&query=${encodeURIComponent(showName)}`;
    
    const response = await fetch(searchUrl, {
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!response.ok) {
      throw new Error(`TMDB search failed with ${response.status}`);
    }

    const data = await response.json();
    
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
  const apiKey = process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    console.warn("TMDB_API_KEY not configured");
    return null;
  }

  try {
    const detailsUrl = `${TMDB_BASE_URL}/tv/${tmdbId}?api_key=${apiKey}&append_to_response=credits,content_ratings,external_ids`;
    
    const response = await fetch(detailsUrl, {
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`TMDB details failed with ${response.status}`);
    }

    const show = await response.json();
    
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
 * Enrich schedule items with TMDB metadata
 * @param {Array} scheduleItems - Schedule items to enrich
 * @returns {Promise<Array>} Enriched schedule items
 */
export async function enrichScheduleWithTmdb(scheduleItems) {
  if (!process.env.TMDB_API_KEY) {
    return scheduleItems; // Return unchanged if no API key
  }

  const enrichedItems = await Promise.all(
    scheduleItems.map(async (item) => {
      const metadata = await fetchTmdbShowMetadata(item.show || item.title);
      
      if (metadata) {
        return {
          ...item,
          tmdb: metadata,
          // Prefer TMDB images if available
          image: metadata.backdropPath || metadata.posterPath || item.image,
          // Prefer TMDB rating if available
          rating: metadata.rating || item.rating,
          // Enhanced summary
          summary: metadata.overview || item.summary
        };
      }
      
      return item;
    })
  );

  return enrichedItems;
}

/**
 * Health check for TMDB provider
 * @returns {Promise<boolean>} True if provider is healthy
 */
export async function tmdbHealthCheck() {
  const apiKey = process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    return false;
  }

  try {
    const response = await fetch(`${TMDB_BASE_URL}/configuration?api_key=${apiKey}`, {
      next: { revalidate: 86400 } // Cache for 24 hours
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
