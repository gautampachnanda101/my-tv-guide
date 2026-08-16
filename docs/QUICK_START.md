# Quick Start Guide

Get the TV Guide framework running in 5 minutes.

## Step 1: Configure Environment (1 min)

```bash
# Copy the example environment file
cp .env.example .env.local

# Edit .env.local if needed
# Defaults are already production-ready
```

Default configuration:
```bash
NEXT_PUBLIC_DEFAULT_REGION=uk
NEXT_PUBLIC_ENABLED_REGIONS=uk,us
NEXT_PUBLIC_CACHE_ENABLED=true
NEXT_PUBLIC_CACHE_TTL=300
```

## Step 2: Basic Usage (2 min)

### Server Component

```javascript
// app/page.js
import { bootstrap, getRegionManager } from '@/lib/bootstrap';

export default async function Home() {
  // Initialize framework
  await bootstrap();
  
  // Get region manager
  const regionManager = getRegionManager();
  
  // Fetch guide data for UK
  const guideData = await regionManager.fetchGuideData('uk');
  
  return (
    <div>
      <h1>TV Guide</h1>
      <ul>
        {guideData.today.map(item => (
          <li key={item.id}>
            {item.show} - {item.channel}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Client Component

```javascript
// app/components/TVGuide.jsx
'use client';
import { useGuideData } from '@/lib/hooks/useFramework';

export default function TVGuide() {
  const { data, loading, error } = useGuideData('uk');
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      <h1>TV Guide</h1>
      <ul>
        {data.today.map(item => (
          <li key={item.id}>
            {item.show} - {item.channel}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Step 3: Test the API (1 min)

```bash
# Start dev server
npm run dev

# Test framework stats endpoint
curl http://localhost:3000/api/framework-stats

# Test guide endpoint
curl http://localhost:3000/api/guide-v2?region=uk

# Test with search
curl "http://localhost:3000/api/guide-v2?region=uk&query=news"
```

## Step 4: Add UI Components (1 min)

```javascript
'use client';
import { FrameworkStatus, RegionSelector } from '@/lib/components/Framework';
import { useGuideData, useRegion } from '@/lib/hooks/useFramework';

export default function MyPage() {
  const { region, setRegion } = useRegion('uk');
  const { data, loading } = useGuideData(region);
  
  return (
    <div>
      <FrameworkStatus />
      <RegionSelector onChange={setRegion} />
      
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div>
          <h2>Today's TV ({region.toUpperCase()})</h2>
          {data.today.map(item => (
            <div key={item.id}>{item.show}</div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## What You Get

✅ **Multi-region support** - UK and US out of the box  
✅ **Multiple data providers** - TVMaze, BBC iPlayer, local data  
✅ **Automatic error handling** - Graceful degradation  
✅ **Built-in caching** - 5-minute cache by default  
✅ **Type safety** - JSDoc types for IntelliSense  
✅ **React hooks** - Easy client-side integration  
✅ **Health monitoring** - Provider status tracking  

## Data Structure

The framework returns this structure:

```javascript
{
  region: 'uk',
  today: [
    {
      id: 'unique-id',
      show: 'Programme Title',
      channel: 'Channel Name',
      startAt: '2024-01-15T20:00:00Z',
      endAt: '2024-01-15T21:00:00Z',
      runtime: 60,
      genres: ['Drama'],
      summary: 'Description...',
      image: 'https://...',
      watchVia: ['iPlayer']
    }
  ],
  upcoming: [...],  // Future programmes
  channels: [...],  // Available channels
  apps: [...],      // Streaming apps
  warnings: []      // Provider warnings
}
```

## Common Use Cases

### Filter by Search Query

```javascript
const guideData = await regionManager.fetchGuideData('uk', {
  query: 'football'
});
```

### Filter by Date

```javascript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);

const guideData = await regionManager.fetchGuideData('uk', {
  date: tomorrow
});
```

### Multiple Regions

```javascript
const ukData = await regionManager.fetchGuideData('uk');
const usData = await regionManager.fetchGuideData('us');
```

### With React Hook Filters

```javascript
const { data, updateFilter, clearFilters } = useFilteredGuide('uk', {
  query: 'sports'
});

// Update filter
updateFilter('query', 'news');

// Clear all filters
clearFilters();
```

## Next Steps

- 📖 Read [FRAMEWORK.md](../FRAMEWORK.md) for architecture details
- 🔌 See [CREATING_PROVIDER.md](./CREATING_PROVIDER.md) to add new data sources
- 🚀 Check [MIGRATION.md](./MIGRATION.md) if migrating existing code
- 🌍 Add more regions by creating new plugins

## Troubleshooting

### No data returned
```javascript
// Check framework initialization
import { isInitialized } from '@/lib/bootstrap';
console.log('Initialized:', isInitialized());

// Check provider status
const stats = await fetch('/api/framework-stats').then(r => r.json());
console.log('Providers:', stats.providers);
```

### Wrong region
```bash
# Check enabled regions in .env.local
NEXT_PUBLIC_ENABLED_REGIONS=uk,us
```

### Type errors
```javascript
// Import types for IntelliSense
/** @typedef {import('@/lib/framework/types').GuideData} GuideData */
```

## Development vs Production

### Development
- All features enabled
- Debug mode available
- Framework stats accessible
- Longer timeouts

### Production
```bash
# .env.production
NEXT_PUBLIC_ENABLED_REGIONS=uk
NEXT_PUBLIC_DEBUG_MODE=false
NEXT_PUBLIC_CACHE_ENABLED=true
NEXT_PUBLIC_CACHE_TTL=600  # 10 minutes
LOG_LEVEL=warn
```

## Support

- Framework documentation: [FRAMEWORK.md](../FRAMEWORK.md)
- Provider creation: [CREATING_PROVIDER.md](./CREATING_PROVIDER.md)
- Migration guide: [MIGRATION.md](./MIGRATION.md)
- Implementation summary: [FRAMEWORK_SUMMARY.md](./FRAMEWORK_SUMMARY.md)

That's it! You're ready to build with the TV Guide framework. 🚀
