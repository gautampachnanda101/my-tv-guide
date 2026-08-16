# TV Guide Extensible Framework

A plugin-based, extensible architecture for building TV guide applications with multi-region support.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TV Guide App                             │
├─────────────────────────────────────────────────────────────────┤
│                      Framework Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Plugin     │  │   Provider   │  │    Region    │         │
│  │   Manager    │  │   Registry   │  │   Manager    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
├─────────────────────────────────────────────────────────────────┤
│                      Plugin Layer                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  UK Plugin   │  │  US Plugin   │  │ Custom Plugin│         │
│  │              │  │              │  │              │         │
│  │ • Providers  │  │ • Providers  │  │ • Providers  │         │
│  │ • Config     │  │ • Config     │  │ • Config     │         │
│  │ • Components │  │ • Components │  │ • Components │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

## Core Concepts

### 1. Plugins

Plugins are self-contained modules that extend the application's functionality. Each plugin can provide:

- **Data Providers**: Fetch TV schedule, channel, and app data
- **UI Components**: Custom React components
- **Region Configurations**: Locale, timezone, and provider settings
- **Lifecycle Hooks**: Initialization and cleanup logic

### 2. Data Providers

Providers are responsible for fetching data from various sources:

```javascript
{
  id: 'my-provider',
  name: 'My Provider',
  region: 'uk',
  type: 'schedule',  // 'schedule' | 'channels' | 'metadata'
  priority: 80,      // Higher = preferred
  enabled: true,
  async fetchSchedule(options) {
    // Fetch and return schedule data
  },
  async healthCheck() {
    // Return true if provider is healthy
  }
}
```

### 3. Region Manager

Manages region-specific configurations and coordinates providers for each region.

### 4. Configuration

Environment-based configuration with feature flags:

```bash
NEXT_PUBLIC_DEFAULT_REGION=uk
NEXT_PUBLIC_ENABLED_REGIONS=uk,us
NEXT_PUBLIC_FEATURE_LIVE_NOW=true
NEXT_PUBLIC_CACHE_ENABLED=true
NEXT_PUBLIC_CACHE_TTL=300
```

## Quick Start

### 1. Bootstrap the Framework

```javascript
import { bootstrap } from '@/lib/bootstrap';

// In your app initialization
await bootstrap();
```

### 2. Fetch Guide Data

```javascript
import { getRegionManager } from '@/lib/bootstrap';

const regionManager = getRegionManager();
const guideData = await regionManager.fetchGuideData('uk', {
  query: 'sports',
  date: new Date()
});
```

### 3. Create a Custom Plugin

```javascript
import { createRegionPlugin } from '@/lib/framework';

const myRegionConfig = {
  code: 'ca',
  name: 'Canada',
  timeZone: 'America/Toronto',
  locale: 'en-CA',
  providers: ['my-provider']
};

const myProviders = [
  {
    id: 'my-provider',
    name: 'My TV Provider',
    region: 'ca',
    type: 'schedule',
    priority: 90,
    enabled: true,
    async fetchSchedule(options) {
      // Your implementation
      return [];
    }
  }
];

export const canadaPlugin = createRegionPlugin(
  'ca-region-plugin',
  myRegionConfig,
  myProviders
);
```

### 4. Register Your Plugin

Add to `lib/plugins/index.js`:

```javascript
import canadaPlugin from './ca-region';

export function getAllPlugins() {
  return [
    ukPlugin,
    usPlugin,
    canadaPlugin  // Add your plugin
  ];
}
```

### 5. Enable Your Region

Update `.env.local`:

```bash
NEXT_PUBLIC_ENABLED_REGIONS=uk,us,ca
```

## Creating Data Providers

### Provider Types

1. **Schedule Provider**: Fetches TV programme schedule
2. **Channels Provider**: Fetches available TV channels
3. **Metadata Provider**: Fetches programme metadata and enrichment

### Provider Template

```javascript
{
  id: 'unique-provider-id',
  name: 'Display Name',
  region: 'region-code',
  type: 'schedule',
  priority: 80,
  enabled: true,
  requiredEnv: ['API_KEY'],  // Optional
  
  async fetchSchedule(options = {}) {
    const { query, date, limit } = options;
    // Fetch data from your source
    return [
      {
        id: 'unique-id',
        show: 'Programme Title',
        channel: 'Channel Name',
        startAt: '2024-01-01T20:00:00Z',
        endAt: '2024-01-01T21:00:00Z',
        runtime: 60,
        genres: ['Drama'],
        summary: 'Description',
        image: 'https://...',
        watchVia: ['iPlayer']
      }
    ];
  },
  
  async healthCheck() {
    try {
      // Verify your API is accessible
      return true;
    } catch {
      return false;
    }
  }
}
```

## Advanced Features

### Provider Priority

Providers with higher priority are preferred when multiple providers return the same content:

```javascript
priority: 100  // Highest priority
priority: 80   // Medium priority
priority: 50   // Low priority
```

### Error Handling

The framework handles provider errors gracefully:

```javascript
const result = await regionManager.fetchGuideData('uk');
console.log(result.providerWarnings);  // Array of error messages
```

### Caching

Built-in caching support with configurable TTL:

```bash
NEXT_PUBLIC_CACHE_ENABLED=true
NEXT_PUBLIC_CACHE_TTL=300  # 5 minutes
```

### Health Checks

Providers can implement health checks for monitoring:

```javascript
async healthCheck() {
  const response = await fetch('https://api.example.com/health');
  return response.ok;
}
```

## API Reference

### ProviderRegistry

```javascript
import { getProviderRegistry } from '@/lib/framework';

const registry = getProviderRegistry();

// Register a provider
registry.register(provider);

// Get providers for a region
const providers = registry.getByRegion('uk');

// Execute providers
const result = await registry.execute('uk', { query: 'news' });
```

### RegionManager

```javascript
import { getRegionManager } from '@/lib/framework';

const manager = getRegionManager();

// Get region config
const config = manager.getRegionConfig('uk');

// Fetch guide data
const data = await manager.fetchGuideData('uk', {
  query: 'sports',
  date: new Date()
});

// Format date/time
const formatted = manager.formatDateTime(new Date(), 'uk', {
  hour: '2-digit',
  minute: '2-digit'
});
```

### PluginManager

```javascript
import { getPluginManager } from '@/lib/framework';

const manager = getPluginManager();

// Register plugin
await manager.register(plugin);

// Load plugin
await manager.load('plugin-id');

// Get component
const component = manager.getComponent('component-id');

// Get stats
const stats = manager.getStats();
```

### ConfigManager

```javascript
import { getConfig } from '@/lib/framework';

const config = getConfig();

// Get value
const defaultRegion = config.get('defaultRegion');

// Set value
config.set('features.liveNow', true);

// Check feature
if (config.isFeatureEnabled('search')) {
  // ...
}
```

## Testing

### Unit Testing Providers

```javascript
import { myProvider } from './my-provider';

describe('MyProvider', () => {
  it('fetches schedule data', async () => {
    const data = await myProvider.fetchSchedule();
    expect(data).toBeInstanceOf(Array);
  });
  
  it('passes health check', async () => {
    const healthy = await myProvider.healthCheck();
    expect(healthy).toBe(true);
  });
});
```

### Integration Testing

```javascript
import { bootstrap } from '@/lib/bootstrap';
import { getRegionManager } from '@/lib/framework';

beforeAll(async () => {
  await bootstrap();
});

test('fetches UK guide data', async () => {
  const manager = getRegionManager();
  const data = await manager.fetchGuideData('uk');
  
  expect(data.region).toBe('uk');
  expect(data.today).toBeInstanceOf(Array);
});
```

## Best Practices

1. **Provider Design**
   - Keep providers focused on single data sources
   - Implement proper error handling
   - Add health checks for external APIs
   - Use TypeScript/JSDoc for type safety

2. **Performance**
   - Implement caching where appropriate
   - Use concurrent requests for multiple providers
   - Set reasonable timeouts
   - Deduplicate data by ID

3. **Error Handling**
   - Never throw errors from providers
   - Return empty arrays on failure
   - Log errors for debugging
   - Provide meaningful error messages

4. **Configuration**
   - Use environment variables for API keys
   - Make features configurable
   - Document required environment variables
   - Validate configuration on startup

## Example: Adding a New Region

Let's add support for Australia:

1. **Create the provider** (`lib/plugins/au-region.js`):

```javascript
import { createRegionPlugin } from '../framework';

const auRegionConfig = {
  code: 'au',
  name: 'Australia',
  timeZone: 'Australia/Sydney',
  locale: 'en-AU',
  providers: ['au-tv-provider']
};

const auProviders = [
  {
    id: 'au-tv-provider',
    name: 'Australian TV Guide',
    region: 'au',
    type: 'schedule',
    priority: 90,
    enabled: true,
    async fetchSchedule() {
      // Your implementation
      return [];
    }
  }
];

export const auPlugin = createRegionPlugin(
  'au-region-plugin',
  auRegionConfig,
  auProviders
);
```

2. **Register the plugin** (`lib/plugins/index.js`):

```javascript
import auPlugin from './au-region';

export function getAllPlugins() {
  return [ukPlugin, usPlugin, auPlugin];
}
```

3. **Enable the region** (`.env.local`):

```bash
NEXT_PUBLIC_ENABLED_REGIONS=uk,us,au
```

4. **Use it**:

```javascript
const data = await regionManager.fetchGuideData('au');
```

## Troubleshooting

### Provider Not Loading

1. Check plugin is registered in `lib/plugins/index.js`
2. Verify region is enabled in `NEXT_PUBLIC_ENABLED_REGIONS`
3. Check console for initialization errors
4. Verify provider ID is unique

### No Data Returned

1. Check provider's `enabled` flag is `true`
2. Verify API keys are set in environment
3. Run provider's `healthCheck()` method
4. Check network requests in browser DevTools

### Type Errors

All types are defined in `lib/framework/types.js`. Import them:

```javascript
/** @typedef {import('./framework/types').DataProvider} DataProvider */
```

## License

MIT
