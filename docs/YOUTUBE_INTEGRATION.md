# YouTube Free Movies Integration

This guide explains how to integrate YouTube's free movies into your TV Guide application.

## Features

- 🎬 **Free Movies**: Display legally available free movies from YouTube
- 🔍 **Genre Filtering**: Filter movies by genre (Action, Comedy, Drama, etc.)
- 📺 **Embedded Player**: Watch movies directly in the app with YouTube's embedded player
- 🚀 **Zero Cost**: Works with YouTube Data API v3 free tier (10,000 quota units/day)
- 📱 **Mobile Responsive**: Optimized for all screen sizes

## Setup

### 1. Get a YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **YouTube Data API v3**:
   - Navigate to "APIs & Services" > "Library"
   - Search for "YouTube Data API v3"
   - Click "Enable"
4. Create credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### 2. Configure Environment Variables

Add your API key to `.env.local`:

```bash
# YouTube Data API v3 Key
YOUTUBE_API_KEY=your_api_key_here
```

**Important**: Keep this file in `.gitignore` - never commit API keys to version control!

### 3. Run the Application

```bash
npm run dev
```

Visit [http://localhost:3000/youtube-movies](http://localhost:3000/youtube-movies) to see the YouTube movies page.

## API Quota Management

YouTube Data API v3 has a free tier with **10,000 quota units per day**:

- **Search query**: 100 units
- **Video details**: 1 unit per video

With the default configuration:
- ~100 searches per day
- Results are cached for 1 hour to minimize API calls

### Tips to Optimize Quota Usage

1. **Increase cache duration** in the provider:
   ```javascript
   const CACHE_DURATION = 7200000; // 2 hours instead of 1
   ```

2. **Reduce `maxResults`** parameter when fetching movies

3. **Monitor your quota usage** in Google Cloud Console

## Architecture

### File Structure

```
lib/providers/uk/
├── youtube-movies.js          # YouTube provider (fetch & format data)

app/components/
├── YouTubeMovies.js            # Movies grid component
├── YouTubeMovies.module.css    # Movies grid styles
├── YouTubePlayer.js            # Video player modal
└── YouTubePlayer.module.css    # Player modal styles

app/api/youtube-movies/
└── route.js                    # API route handler

app/youtube-movies/
├── page.js                     # Demo page
└── page.module.css             # Demo page styles
```

### Provider API

The YouTube provider exports three main functions:

```javascript
// Fetch free movies from YouTube
fetchYouTubeFreeMovies(maxResults = 50)

// Health check for monitoring
youtubeHealthCheck()

// Get movie categories for filtering
getYouTubeMovieCategories()
```

### Data Flow

```
User opens page
    ↓
YouTubeMovies component fetches from API route
    ↓
API route calls youtube-movies provider
    ↓
Provider checks cache (1 hour TTL)
    ↓
If cache miss: Fetch from YouTube Data API
    ↓
Format and return movie data
    ↓
Display in grid with play buttons
    ↓
User clicks play → Opens YouTubePlayer modal
```

## Usage Examples

### Basic Integration

```jsx
import YouTubeMovies from '@/app/components/YouTubeMovies';
import YouTubePlayer from '@/app/components/YouTubePlayer';
import { useState } from 'react';

export default function MyPage() {
  const [selectedMovie, setSelectedMovie] = useState(null);

  return (
    <>
      <YouTubeMovies
        maxResults={24}
        onPlayMovie={setSelectedMovie}
      />
      
      {selectedMovie && (
        <YouTubePlayer
          movie={selectedMovie}
          onClose={() => setSelectedMovie(null)}
        />
      )}
    </>
  );
}
```

### Custom Filtering

```jsx
// Get movies for a specific genre
const response = await fetch('/api/youtube-movies?maxResults=12');
const { movies } = await response.json();

const horrorMovies = movies.filter(m => m.genre === 'Horror');
```

### Health Check

```jsx
const response = await fetch('/api/youtube-movies?health=true');
const { health } = await response.json();

console.log(health.status); // 'healthy', 'degraded', or 'unhealthy'
```

## Movie Data Structure

Each movie object contains:

```javascript
{
  id: 'youtube-{videoId}',
  title: 'Movie Title',
  description: 'Movie description...',
  thumbnail: 'https://i.ytimg.com/vi/{videoId}/hqdefault.jpg',
  channel: 'Channel Name',
  publishedAt: '2024-01-01T00:00:00Z',
  videoId: 'abc123',
  embedUrl: 'https://www.youtube.com/embed/abc123',
  watchUrl: 'https://www.youtube.com/watch?v=abc123',
  type: 'youtube',
  source: 'YouTube Free Movies',
  duration: null,  // Would need additional API call
  year: 2024,
  genre: 'Action'
}
```

## Troubleshooting

### No API Key Configured

**Symptom**: See sample/placeholder movies instead of real content

**Solution**: Add `YOUTUBE_API_KEY` to `.env.local`

### API Quota Exceeded

**Symptom**: Error message about quota limits

**Solutions**:
1. Wait for quota to reset (daily at midnight Pacific Time)
2. Increase cache duration
3. Reduce number of searches
4. Consider upgrading quota (paid tier)

### Empty Results

**Symptom**: No movies returned from API

**Possible causes**:
- Region restrictions (some content is geo-restricted)
- Temporary API issues
- Search query returned no results

**Solutions**:
- Check YouTube API status
- Try different search queries in the provider
- Check Google Cloud Console for error logs

### CORS Errors

**Symptom**: Cannot load video in embed

**Cause**: Video has embedding disabled by uploader

**Solution**: Open video on YouTube.com instead (click "Watch on YouTube" button)

## Vercel Deployment

This integration is **100% compatible with Vercel Hobby tier**:

✅ No paid features required
✅ No background workers needed
✅ API routes work on free tier
✅ Client-side video playback

Just add `YOUTUBE_API_KEY` to your Vercel environment variables:

1. Go to your project settings in Vercel
2. Navigate to "Environment Variables"
3. Add `YOUTUBE_API_KEY` with your API key
4. Redeploy

## Next Steps

- [ ] Add more genre filters
- [ ] Integrate with TMDB for movie metadata enrichment
- [ ] Add search functionality within YouTube movies
- [ ] Create playlists/favorites feature
- [ ] Add watch history tracking (client-side)

## Resources

- [YouTube Data API Documentation](https://developers.google.com/youtube/v3)
- [Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [Google Cloud Console](https://console.cloud.google.com/)

## License

This integration uses YouTube's official embed player and complies with [YouTube Terms of Service](https://www.youtube.com/t/terms).
