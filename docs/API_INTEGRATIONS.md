# API Integrations Guide

This guide covers the external API integrations for enriching TV Guide data with metadata and streaming availability.

## Overview

My TV Guide integrates with multiple APIs to provide rich metadata and streaming availability information:

1. **TVmaze** - TV schedules and show data (free, no API key required)
2. **TMDB** (The Movie Database) - Rich metadata, images, cast, ratings (free API key required)
3. **JustWatch** - Streaming availability across UK platforms (no API key required)

## TMDB Integration

### Getting Started

1. **Sign up for a free TMDB account**: https://www.themoviedb.org/signup
2. **Request an API key**: https://www.themoviedb.org/settings/api
3. **Add to your environment**:
   ```bash
   TMDB_API_KEY=your_api_key_here
   ```

### Features

TMDB provides:
- High-quality images (posters and backdrops)
- Detailed show information (seasons, episodes, cast, crew)
- User ratings and popularity scores
- Genre information
- External IDs (IMDB, TVDB)

### Rate Limits

- **Free Tier**: 1 million requests per month
- **Request Rate**: ~40 requests per 10 seconds (soft limit)

### Usage in Code

```javascript
import { 
  fetchTmdbShowMetadata, 
  fetchTmdbShowDetails,
  enrichScheduleWithTmdb 
} from '@/lib/providers/uk/tmdb';

// Search for a show
const metadata = await fetchTmdbShowMetadata('Doctor Who');

// Get detailed information
const details = await fetchTmdbShowDetails(tmdbId);

// Enrich schedule items
const enriched = await enrichScheduleWithTmdb(scheduleItems);
```

## JustWatch Integration

### Getting Started

JustWatch integration works out of the box - no API key required!

### Features

JustWatch provides:
- Streaming availability (which services have the show)
- Pricing information for rent/buy options
- Links to streaming platforms
- Regional availability (UK-focused)

### Supported Services

Popular UK streaming services tracked:
- Netflix
- BBC iPlayer
- Amazon Prime Video
- Disney+
- NOW
- Apple TV+
- ITVX
- Channel 4
- Paramount+
- Discovery+

### Usage in Code

```javascript
import { 
  fetchJustWatchAvailability,
  fetchJustWatchProviders,
  enrichScheduleWithJustWatch 
} from '@/lib/providers/uk/justwatch';

// Check streaming availability
const availability = await fetchJustWatchAvailability('The Crown', '2023');

// Get all UK providers
const providers = await fetchJustWatchProviders();

// Enrich schedule items
const enriched = await enrichScheduleWithJustWatch(scheduleItems);
```

## TVmaze Integration

### Getting Started

TVmaze is free and requires no API key.

### Features

- Live TV schedules
- Episode information
- Show metadata
- Network information

### Rate Limits

- Maximum 20 calls per 10 seconds
- Please respect their API and implement caching

### Usage in Code

```javascript
import { fetchUkSchedule } from '@/lib/providers/uk/tvmaze';

const schedule = await fetchUkSchedule();
```

## Data Enrichment Flow

The UK provider automatically enriches schedule data in this order:

1. **Fetch base schedule** from TVmaze and other sources
2. **Enrich with TMDB** (if API key configured) - adds metadata, images, cast
3. **Enrich with JustWatch** - adds streaming availability
4. **Return combined data** with all available information

### Example Enriched Item

```javascript
{
  id: "tvmaze-12345",
  title: "Doctor Who",
  show: "Doctor Who",
  channel: "BBC One",
  startAt: "2024-01-15T20:00:00Z",
  endAt: "2024-01-15T21:00:00Z",
  summary: "Original summary...",
  
  // TMDB enrichment
  tmdb: {
    id: 57243,
    rating: 8.5,
    posterPath: "https://image.tmdb.org/t/p/w500/...",
    backdropPath: "https://image.tmdb.org/t/p/original/...",
    genres: ["Sci-Fi", "Drama"],
    cast: [
      { name: "Ncuti Gatwa", character: "The Doctor" },
      // ...
    ]
  },
  
  // JustWatch enrichment
  justWatch: {
    id: "tm12345",
    streamingServices: [
      { name: "BBC iPlayer", type: "flatrate" }
    ],
    justWatchUrl: "https://www.justwatch.com/uk/tv-series/doctor-who"
  },
  
  // Convenience fields
  isStreaming: true,
  streamingOn: ["BBC iPlayer"]
}
```

## UI Components

### EnhancedShowCard

Displays show with TMDB images and JustWatch streaming info:

```jsx
import EnhancedShowCard from '@/lib/components/EnhancedShowCard';

<EnhancedShowCard 
  item={scheduleItem} 
  onClick={() => handleClick(scheduleItem)} 
/>
```

### StreamingBadge

Shows streaming availability badges:

```jsx
import StreamingBadge from '@/lib/components/StreamingBadge';

<StreamingBadge
  services={['Netflix', 'Prime Video']}
  justWatchUrl="https://www.justwatch.com/..."
  compact={true}
/>
```

### StreamingProviders

Lists all available streaming services:

```jsx
import StreamingProviders from '@/lib/components/StreamingProviders';

<StreamingProviders providers={providersList} />
```

## Performance Considerations

### Caching

All API calls use Next.js `revalidate` for caching:
- TMDB: 1 hour (3600 seconds)
- JustWatch: 1 hour (3600 seconds)
- TVmaze: 5 minutes (300 seconds)

### Rate Limit Management

To avoid hitting rate limits:
- Only enriching top 50 schedule items by default
- Implement exponential backoff on failures
- Use health checks before making calls
- Cache responses aggressively

### Optimization Tips

1. **Batch requests** when possible
2. **Limit enrichment** to visible items only
3. **Lazy load** detailed information on demand
4. **Monitor API usage** regularly

## Troubleshooting

### TMDB Not Working

1. Verify API key is set: `echo $TMDB_API_KEY`
2. Check health status in provider warnings
3. Review rate limits on TMDB dashboard

### JustWatch Not Working

1. Check internet connectivity
2. Verify JustWatch API is accessible
3. Check source status for errors

### No Streaming Data

1. Ensure show name matches JustWatch database
2. Some shows may not have streaming availability
3. Regional restrictions (only UK services tracked)

## Best Practices

1. **Always check health** before making API calls
2. **Handle failures gracefully** - show base data if enrichment fails
3. **Respect rate limits** - implement proper caching
4. **Monitor usage** - especially for TMDB free tier
5. **Update regularly** - API endpoints and data can change

## API Documentation Links

- TMDB API: https://developers.themoviedb.org/3
- TVmaze API: https://www.tvmaze.com/api
- JustWatch: https://www.justwatch.com/ (unofficial API)

## Future Enhancements

Potential future integrations:
- Trakt.tv for personalized recommendations
- OMDB for additional metadata
- Letterboxd for film community data
- Rotten Tomatoes for critic/audience scores
