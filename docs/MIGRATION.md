# Migration Guide: Using the Framework

This guide helps you migrate from direct provider usage to the extensible framework.

## Overview

The framework provides:
- ✅ Plugin-based architecture for easy extensibility
- ✅ Multi-region support with automatic provider coordination
- ✅ Built-in error handling and health checks
- ✅ Configuration management
- ✅ Type safety with JSDoc
- ✅ Automatic deduplication and filtering

## Before: Direct Provider Usage

```javascript
// Old approach - app/page.js
import { ukProviders } from '@/lib/providers/uk';

export default async function Home() {
  const data = await ukProviders.fetchSchedule();
  // Manual error handling, no multi-region, tight coupling
}
```

## After: Framework-Based

```javascript
// New approach - app/page.js
import { bootstrap, getRegionManager } from '@/lib/bootstrap';

export default async function Home() {
  await bootstrap();
  const regionManager = getRegionManager();
  const guideData = await regionManager.fetchGuideData('uk');
  // Automatic multi-provider coordination, error handling, deduplication
}
```

## Migration Steps

### 1. Initialize the Framework

Update your root layout or main page:

```javascript
// app/layout.js or app/page.js
import { bootstrap } from '@/lib/bootstrap';

// Server component initialization
await bootstrap();
```

Or for client components:

```javascript
'use client';
import { useEffect } from 'react';

export default function MyComponent() {
  useEffect(() => {
    async function init() {
      const { bootstrap } = await import('@/lib/bootstrap');
      await bootstrap();
    }
    init();
  }, []);
}
```

### 2. Replace Provider Imports

**Before:**
```javascript
import { ukProviders } from '@/lib/providers/uk';
import { tvMazeProvider } from '@/lib/providers/uk/tvmaze';
```

**After:**
```javascript
import { getRegionManager } from '@/lib/bootstrap';
```

### 3. Update Data Fetching

**Before:**
```javascript
async function fetchData() {
  try {
    const schedule = await ukProviders.fetchSchedule();
    const channels = await ukProviders.fetchChannels();
    // Manual coordination
    return { schedule, channels };
  } catch (error) {
    // Manual error handling
    console.error(error);
    return { schedule: [], channels: [] };
  }
}
```

**After:**
```javascript
async function fetchData() {
  const regionManager = getRegionManager();
  const guideData = await regionManager.fetchGuideData('uk', {
    query: 'sports',  // Optional filter
    date: new Date()  // Optional date
  });
  
  // Returns: { region, today, upcoming, channels, apps, warnings }
  return guideData;
}
```

### 4. Use React Hooks (Client Components)

**Before:**
```javascript
'use client';
import { useState, useEffect } from 'react';

export default function TVGuide() {
  const [data, setData] = useState(null);
  
  useEffect(() => {
    async function load() {
      const res = await fetch('/api/guide');
      const json = await res.json();
      setData(json);
    }
    load();
  }, []);
  
  // ...
}
```

**After:**
```javascript
'use client';
import { useGuideData } from '@/lib/hooks/useFramework';

export default function TVGuide() {
  const { data, loading, error } = useGuideData('uk', {
    query: 'sports'
  });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  // Use data.today, data.upcoming, etc.
}
```

### 5. Update API Routes

**Before:**
```javascript
// app/api/guide/route.js
import { ukProviders } from '@/lib/providers/uk';

export async function GET() {
  const data = await ukProviders.fetchSchedule();
  return Response.json(data);
}
```

**After:**
```javascript
// app/api/guide-v2/route.js
import { bootstrap, getRegionManager, isInitialized } from '@/lib/bootstrap';

if (!isInitialized()) {
  await bootstrap();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get('region') || 'uk';
  
  const regionManager = getRegionManager();
  const guideData = await regionManager.fetchGuideData(region);
  
  return Response.json(guideData);
}
```

### 6. Add Environment Configuration

Create `.env.local`:

```bash
# Copy from .env.example
NEXT_PUBLIC_DEFAULT_REGION=uk
NEXT_PUBLIC_ENABLED_REGIONS=uk,us
NEXT_PUBLIC_FEATURE_LIVE_NOW=true
NEXT_PUBLIC_CACHE_ENABLED=true
NEXT_PUBLIC_CACHE_TTL=300
```

### 7. Migrate Existing Providers

Your existing providers need to match the framework interface. Update them if needed:

**Before:**
```javascript
export const myProvider = {
  fetchSchedule: async () => {
    // Implementation
  }
};
```

**After:**
```javascript
/** @type {import('../framework/types').DataProvider} */
export const myProvider = {
  id: 'my-provider',
  name: 'My Provider',
  region: 'uk',
  type: 'schedule',
  priority: 80,
  enabled: true,
  
  async fetchSchedule(options = {}) {
    // Implementation
    return [];  // Always return array
  },
  
  async healthCheck() {
    return true;
  }
};
```

## Feature Comparison

| Feature | Before | After |
|---------|--------|-------|
| Multi-region | Manual | Automatic |
| Provider coordination | Manual | Automatic |
| Error handling | Manual | Built-in |
| Deduplication | Manual | Automatic |
| Health checks | None | Built-in |
| Configuration | Hardcoded | Environment |
| Type safety | None | JSDoc types |
| Extensibility | Hard | Plugin-based |
| Testing | Complex | Simplified |

## Backward Compatibility

You can run both systems side-by-side during migration:

1. Keep old API route at `/api/guide`
2. Add new route at `/api/guide-v2`
3. Migrate components one by one
4. Remove old code when ready

## Testing Your Migration

1. **Test framework initialization:**
```javascript
import { bootstrap, isInitialized } from '@/lib/bootstrap';
await bootstrap();
console.log('Initialized:', isInitialized());
```

2. **Test data fetching:**
```javascript
import { getRegionManager } from '@/lib/bootstrap';
const regionManager = getRegionManager();
const data = await regionManager.fetchGuideData('uk');
console.log('Data:', data);
```

3. **Test framework stats:**
```bash
curl http://localhost:3000/api/framework-stats
```

4. **Check provider health:**
```javascript
import { getProviderRegistry } from '@/lib/framework';
const registry = getProviderRegistry();
const config = registry.checkConfiguration('uk');
console.log('Configuration:', config);
```

## Common Issues

### Providers not loading

**Symptom:** No data returned
**Solution:** Check that plugins are registered in `lib/plugins/index.js` and regions are enabled in environment variables.

### Import errors

**Symptom:** Module not found
**Solution:** Ensure all framework files are in `lib/framework/` and plugins in `lib/plugins/`.

### Type errors

**Symptom:** JSDoc warnings
**Solution:** Import types: `/** @typedef {import('./types').DataProvider} DataProvider */`

### Region not supported

**Symptom:** "Region 'xx' is not supported"
**Solution:** Add region to `NEXT_PUBLIC_ENABLED_REGIONS` in `.env.local`

## Next Steps

1. ✅ Complete migration to framework
2. ✅ Add environment configuration
3. ✅ Test all features
4. Create custom plugins for new regions
5. Add custom providers
6. Implement custom UI components
7. Add analytics and monitoring

## Getting Help

- Read [FRAMEWORK.md](../FRAMEWORK.md) for architecture details
- See [CREATING_PROVIDER.md](./CREATING_PROVIDER.md) for provider examples
- Check existing plugins in `lib/plugins/`
- Review framework source in `lib/framework/`
