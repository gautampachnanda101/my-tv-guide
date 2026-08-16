# Performance Optimization

## Problem

The site was slow because it was making multiple external API calls on **every single request** with no caching:

- TVMaze API (TV schedules)
- IPTV.org API (channel lists)
- XMLTV feed (alternative schedules)
- TMDB API (show metadata)
- JustWatch API (streaming availability)

## Solution

### 1. API Route Caching

Added Next.js ISR (Incremental Static Regeneration) caching:

```javascript
export const revalidate = 300; // 5 minutes
```

API responses are now cached and reused for 5 minutes before fetching fresh data.

### 2. Cache-Control Headers

Added proper HTTP caching headers:

```javascript
'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
```

- `s-maxage=300`: Cache at CDN/edge for 5 minutes
- `stale-while-revalidate=600`: Serve stale content for 10 minutes while revalidating in background

### 3. Client-Side Caching

Updated client fetch to respect caching:

```javascript
fetch('/api/guide', {
  next: { revalidate: 300 }
})
```

## Configuration

Cache duration is configurable via environment variable:

```bash
NEXT_PUBLIC_CACHE_TTL=300  # seconds (default: 5 minutes)
```

## Expected Performance Improvement

- **Before**: ~2-5 seconds (multiple API calls)
- **After**: ~100-500ms (cached responses)

## Trade-offs

- Data freshness: Up to 5 minutes stale
- Acceptable for TV guide use case (schedules don't change every second)
- Can be tuned via `NEXT_PUBLIC_CACHE_TTL` for different requirements

## Vercel Deployment

On Vercel Hobby tier, this caching happens:
- At the Edge Network (global CDN)
- No database required
- No paid features needed
- Fully compatible with free tier
