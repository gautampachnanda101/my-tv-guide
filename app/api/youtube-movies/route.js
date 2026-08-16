/**
 * API Route: Fetch YouTube Free Movies
 * GET /api/youtube-movies
 */

import { fetchYouTubeFreeMovies, youtubeHealthCheck } from '@/lib/providers/uk/youtube-movies';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const maxResults = parseInt(searchParams.get('maxResults') || '24', 10);
  const healthCheckOnly = searchParams.get('health') === 'true';

  try {
    // Health check endpoint
    if (healthCheckOnly) {
      const health = await youtubeHealthCheck();
      return NextResponse.json({ health });
    }

    // Fetch movies
    const movies = await fetchYouTubeFreeMovies(maxResults);

    return NextResponse.json({
      success: true,
      count: movies.length,
      movies,
      source: 'YouTube Free Movies',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('YouTube Movies API error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        movies: [],
      },
      { status: 500 }
    );
  }
}
