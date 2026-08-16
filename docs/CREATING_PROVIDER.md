# Example: Creating a Custom Data Provider

This guide walks through creating a custom data provider for the TV Guide framework.

## Scenario

You want to add support for a fictional TV guide API called "StreamTV API" that provides schedule data for your region.

## Step 1: Create the Provider

Create a new file: `lib/providers/streamtv/index.js`

```javascript
/**
 * StreamTV API Provider
 * Fetches TV schedule from StreamTV API
 */

/** @type {import('../../framework/types').DataProvider} */
export const streamTVProvider = {
  id: 'streamtv-api',
  name: 'StreamTV API',
  region: 'uk',  // or your region
  type: 'schedule',
  priority: 85,
  enabled: true,
  requiredEnv: ['STREAMTV_API_KEY'],  // Optional: if you need API keys
  
  async fetchSchedule(options = {}) {
    const apiKey = process.env.STREAMTV_API_KEY;
    
    if (!apiKey) {
      console.warn('[StreamTV] API key not configured');
      return [];
    }
    
    try {
      const { query = '', date = new Date(), limit = 100 } = options;
      
      // Build API URL
      const params = new URLSearchParams({
        date: date.toISOString().split('T')[0],
        ...(query && { q: query }),
        limit: limit.toString()
      });
      
      const url = `https://api.streamtv.example/schedule?${params}`;
      
      // Fetch with timeout
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)  // 10 second timeout
      });
      
      if (!response.ok) {
        throw new Error(`API responded with ${response.status}`);
      }
      
      const data = await response.json();
      
      // Transform API response to our standard format
      return data.programmes.map(item => ({
        id: `streamtv-${item.id}`,
        show: item.title,
        channel: item.channel_name,
        network: item.network,
        startAt: item.start_time,
        endAt: item.end_time,
        runtime: item.duration_minutes,
        genres: item.genres || [],
        summary: item.description,
        image: item.thumbnail_url,
        url: item.watch_url,
        watchVia: item.streaming_platforms || []
      }));
      
    } catch (error) {
      console.error('[StreamTV] Error fetching schedule:', error);
      // Always return empty array on error, never throw
      return [];
    }
  },
  
  async fetchChannels(options = {}) {
    // Optional: implement if your API provides channel data
    try {
      const apiKey = process.env.STREAMTV_API_KEY;
      const response = await fetch('https://api.streamtv.example/channels', {
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) return [];
      
      const data = await response.json();
      
      return data.channels.map(ch => ({
        id: `streamtv-ch-${ch.id}`,
        name: ch.name,
        number: ch.number,
        network: ch.network,
        category: ch.category,
        hd: ch.hd_available,
        logo: ch.logo_url,
        website: ch.website
      }));
      
    } catch (error) {
      console.error('[StreamTV] Error fetching channels:', error);
      return [];
    }
  },
  
  async healthCheck() {
    try {
      const apiKey = process.env.STREAMTV_API_KEY;
      
      if (!apiKey) {
        return false;  // Not configured
      }
      
      const response = await fetch('https://api.streamtv.example/health', {
        method: 'HEAD',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(5000)
      });
      
      return response.ok;
      
    } catch (error) {
      console.error('[StreamTV] Health check failed:', error);
      return false;
    }
  }
};

export default streamTVProvider;
```

## Step 2: Create or Update Region Plugin

Create/update `lib/plugins/uk-region.js` (or your region):

```javascript
import { createRegionPlugin } from '../framework';
import { streamTVProvider } from '../providers/streamtv';
// ... other imports

const ukProviders = [
  // ... existing providers
  streamTVProvider  // Add your provider
];

export const ukPlugin = createRegionPlugin(
  'uk-region-plugin',
  ukRegionConfig,
  ukProviders
);
```

## Step 3: Add Environment Variables

Update `.env.example`:

```bash
# StreamTV API
STREAMTV_API_KEY=your_api_key_here
```

Update `.env.local`:

```bash
STREAMTV_API_KEY=sk_live_xxx...
```

## Step 4: Test Your Provider

Create a test file: `lib/providers/streamtv/test.js`

```javascript
import { streamTVProvider } from './index';

async function testProvider() {
  console.log('Testing StreamTV Provider...');
  
  // Test health check
  const healthy = await streamTVProvider.healthCheck();
  console.log('Health check:', healthy ? '✓' : '✗');
  
  // Test fetch schedule
  const schedule = await streamTVProvider.fetchSchedule({
    date: new Date(),
    limit: 5
  });
  console.log(`Fetched ${schedule.length} programmes`);
  
  if (schedule.length > 0) {
    console.log('Sample:', schedule[0]);
  }
  
  // Test fetch channels
  const channels = await streamTVProvider.fetchChannels();
  console.log(`Fetched ${channels.length} channels`);
}

testProvider();
```

Run the test:

```bash
node lib/providers/streamtv/test.js
```

## Step 5: Use in Your App

The provider is now automatically available through the framework:

```javascript
import { getRegionManager } from '@/lib/bootstrap';

const regionManager = getRegionManager();
const guideData = await regionManager.fetchGuideData('uk');

// Data from StreamTV provider is included in the results
console.log(guideData.today);
```

## Advanced: Rate Limiting

If the API has rate limits, add a simple rate limiter:

```javascript
class RateLimiter {
  constructor(maxRequests, perMilliseconds) {
    this.maxRequests = maxRequests;
    this.perMilliseconds = perMilliseconds;
    this.requests = [];
  }
  
  async wait() {
    const now = Date.now();
    this.requests = this.requests.filter(
      time => now - time < this.perMilliseconds
    );
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = this.requests[0];
      const waitTime = this.perMilliseconds - (now - oldestRequest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.requests.push(Date.now());
  }
}

// 10 requests per minute
const limiter = new RateLimiter(10, 60000);

export const streamTVProvider = {
  // ...
  async fetchSchedule(options = {}) {
    await limiter.wait();  // Wait if needed
    // ... rest of implementation
  }
};
```

## Advanced: Caching

Add caching to reduce API calls:

```javascript
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

function getCacheKey(options) {
  return JSON.stringify(options);
}

export const streamTVProvider = {
  // ...
  async fetchSchedule(options = {}) {
    const cacheKey = getCacheKey(options);
    const cached = cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('[StreamTV] Using cached data');
      return cached.data;
    }
    
    const data = await fetchFromAPI(options);
    
    cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }
};
```

## Best Practices

1. **Always return empty arrays on error**, never throw exceptions
2. **Implement health checks** for monitoring
3. **Use timeouts** for all network requests
4. **Transform data** to match the standard format
5. **Log errors** for debugging
6. **Document required environment variables**
7. **Add rate limiting** if the API has limits
8. **Implement caching** to reduce API calls
9. **Use TypeScript/JSDoc** for type safety
10. **Write tests** for your provider

## Troubleshooting

### Provider not loading
- Check it's registered in the region plugin
- Verify the region is enabled in environment variables
- Check console for initialization errors

### No data returned
- Verify API key is set correctly
- Check the API endpoint is accessible
- Review the health check status
- Check browser network tab for errors

### Type errors
- Import types: `@typedef {import('...').DataProvider}`
- Use JSDoc comments for parameters
- Follow the type definitions in `lib/framework/types.js`
