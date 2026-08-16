/**
 * YouTube Free Movies Provider
 * Fetches free movies from YouTube using the YouTube Data API v3
 * 
 * Free tier: 10,000 quota units/day
 * Each search costs 100 units = ~100 searches/day
 */

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

// Official YouTube channels with free movies
const FREE_MOVIE_CHANNELS = [
  'UCcB3bcWy0_QK7uPQvTD0LwQ', // YouTube Movies - Free to Watch
  'UCi8e0iOVk1fEOogdfu4YgfA', // Paramount Movies
  'UCVash9xyFG3b3jVYOgVB7wg', // Magnolia Pictures & Magnet Releasing
];

// Search queries for free movies
const FREE_MOVIE_QUERIES = [
  'free movie',
  'full movie free',
  'watch free',
];

let cache = {
  movies: null,
  timestamp: 0,
};

/**
 * Fetch free movies from YouTube
 * @param {number} maxResults - Maximum number of results (default: 50)
 * @returns {Promise<Array>} Array of movie objects
 */
export async function fetchYouTubeFreeMovies(maxResults = 50) {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;

  if (!apiKey) {
    console.warn('YouTube API key not configured. Returning sample data.');
    return getSampleMovies();
  }

  // Check cache
  const now = Date.now();
  if (cache.movies && (now - cache.timestamp) < CACHE_DURATION) {
    return cache.movies;
  }

  try {
    const movies = [];

    // Fetch from official movie channels
    for (const channelId of FREE_MOVIE_CHANNELS.slice(0, 2)) { // Limit to 2 channels to save quota
      try {
        const channelMovies = await fetchFromChannel(channelId, apiKey, 10);
        movies.push(...channelMovies);
      } catch (error) {
        console.error(`Error fetching from channel ${channelId}:`, error.message);
      }
    }

    // Fetch additional free movies via search
    try {
      const searchMovies = await searchFreeMovies(apiKey, maxResults - movies.length);
      movies.push(...searchMovies);
    } catch (error) {
      console.error('Error searching for free movies:', error.message);
    }

    // Deduplicate by video ID
    const uniqueMovies = Array.from(
      new Map(movies.map(m => [m.id, m])).values()
    ).slice(0, maxResults);

    // Cache results
    cache = {
      movies: uniqueMovies,
      timestamp: now,
    };

    return uniqueMovies;
  } catch (error) {
    console.error('Error fetching YouTube free movies:', error);
    return getSampleMovies();
  }
}

/**
 * Fetch movies from a specific channel
 */
async function fetchFromChannel(channelId, apiKey, maxResults = 10) {
  const url = `${YOUTUBE_API_BASE}/search?` + new URLSearchParams({
    key: apiKey,
    channelId: channelId,
    part: 'snippet',
    order: 'date',
    type: 'video',
    maxResults: maxResults.toString(),
    videoDuration: 'long', // Movies are typically long videos
    videoEmbeddable: 'true',
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items?.map(item => formatMovie(item)) || [];
}

/**
 * Search for free movies
 */
async function searchFreeMovies(apiKey, maxResults = 20) {
  const query = 'free full movie';
  const url = `${YOUTUBE_API_BASE}/search?` + new URLSearchParams({
    key: apiKey,
    q: query,
    part: 'snippet',
    order: 'relevance',
    type: 'video',
    maxResults: maxResults.toString(),
    videoDuration: 'long',
    videoEmbeddable: 'true',
    videoLicense: 'any', // Include both creative commons and standard
  });

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();
  return data.items?.map(item => formatMovie(item)) || [];
}

/**
 * Format YouTube video data into movie object
 */
function formatMovie(item) {
  const snippet = item.snippet;
  const videoId = item.id.videoId || item.id;

  return {
    id: `youtube-${videoId}`,
    title: snippet.title,
    description: snippet.description,
    thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
    channel: snippet.channelTitle,
    publishedAt: snippet.publishedAt,
    videoId: videoId,
    embedUrl: `https://www.youtube.com/embed/${videoId}`,
    watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    type: 'youtube',
    source: 'YouTube Free Movies',
    duration: null, // Would need additional API call to get duration
    year: new Date(snippet.publishedAt).getFullYear(),
    genre: extractGenreFromTitle(snippet.title),
  };
}

/**
 * Extract genre from title (basic heuristic)
 */
function extractGenreFromTitle(title) {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('horror')) return 'Horror';
  if (lowerTitle.includes('comedy')) return 'Comedy';
  if (lowerTitle.includes('action')) return 'Action';
  if (lowerTitle.includes('drama')) return 'Drama';
  if (lowerTitle.includes('thriller')) return 'Thriller';
  if (lowerTitle.includes('sci-fi') || lowerTitle.includes('science fiction')) return 'Sci-Fi';
  if (lowerTitle.includes('romance')) return 'Romance';
  if (lowerTitle.includes('documentary')) return 'Documentary';
  return 'Movie';
}

/**
 * Get sample movies (for when API key is not configured)
 */
function getSampleMovies() {
  return [
    {
      id: 'youtube-sample-1',
      title: 'Classic Free Movie (Sample)',
      description: 'Configure YOUTUBE_API_KEY in .env.local to see real free movies from YouTube.',
      thumbnail: 'https://via.placeholder.com/480x360?text=Configure+YouTube+API',
      channel: 'YouTube Movies',
      publishedAt: new Date().toISOString(),
      videoId: 'dQw4w9WgXcQ', // Sample video ID
      embedUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      watchUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      type: 'youtube',
      source: 'YouTube Free Movies',
      duration: null,
      year: new Date().getFullYear(),
      genre: 'Sample',
    },
  ];
}

/**
 * Health check for YouTube provider
 */
export async function youtubeHealthCheck() {
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
  
  if (!apiKey) {
    return {
      provider: 'YouTube Free Movies',
      status: 'degraded',
      message: 'API key not configured - using sample data',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Simple quota-efficient health check (just check API key validity)
    const url = `${YOUTUBE_API_BASE}/search?` + new URLSearchParams({
      key: apiKey,
      part: 'snippet',
      type: 'video',
      maxResults: '1',
      q: 'test',
    });

    const response = await fetch(url, { method: 'HEAD' });
    
    return {
      provider: 'YouTube Free Movies',
      status: response.ok ? 'healthy' : 'unhealthy',
      message: response.ok ? 'API accessible' : `API returned ${response.status}`,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      provider: 'YouTube Free Movies',
      status: 'unhealthy',
      message: error.message,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Get movie categories for filtering
 */
export function getYouTubeMovieCategories() {
  return [
    { id: 'action', name: 'Action', query: 'action movie free' },
    { id: 'comedy', name: 'Comedy', query: 'comedy movie free' },
    { id: 'drama', name: 'Drama', query: 'drama movie free' },
    { id: 'horror', name: 'Horror', query: 'horror movie free' },
    { id: 'thriller', name: 'Thriller', query: 'thriller movie free' },
    { id: 'scifi', name: 'Sci-Fi', query: 'sci-fi movie free' },
    { id: 'classic', name: 'Classic', query: 'classic movie free' },
    { id: 'documentary', name: 'Documentary', query: 'documentary free' },
  ];
}
