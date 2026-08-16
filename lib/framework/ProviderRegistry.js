/**
 * @fileoverview Provider Registry - Central registry for data providers
 * Manages registration, discovery, and execution of data providers
 */

/** @typedef {import('./types').DataProvider} DataProvider */
/** @typedef {import('./types').ProviderOptions} ProviderOptions */

class ProviderRegistry {
  constructor() {
    /** @type {Map<string, DataProvider>} */
    this.providers = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.regionProviders = new Map();
    
    /** @type {Map<string, Set<string>>} */
    this.typeProviders = new Map();
  }

  /**
   * Register a new data provider
   * @param {DataProvider} provider - The provider to register
   * @throws {Error} If provider is invalid or already registered
   */
  register(provider) {
    if (!provider.id) {
      throw new Error('Provider must have an id');
    }
    
    if (this.providers.has(provider.id)) {
      throw new Error(`Provider ${provider.id} is already registered`);
    }
    
    // Validate provider has at least one fetch method
    if (!provider.fetchSchedule && !provider.fetchChannels && !provider.fetchApps) {
      throw new Error(`Provider ${provider.id} must implement at least one fetch method`);
    }
    
    this.providers.set(provider.id, provider);
    
    // Index by region
    if (!this.regionProviders.has(provider.region)) {
      this.regionProviders.set(provider.region, new Set());
    }
    this.regionProviders.get(provider.region).add(provider.id);
    
    // Index by type
    if (!this.typeProviders.has(provider.type)) {
      this.typeProviders.set(provider.type, new Set());
    }
    this.typeProviders.get(provider.type).add(provider.id);
    
    console.log(`[ProviderRegistry] Registered provider: ${provider.id} (${provider.region}/${provider.type})`);
  }

  /**
   * Unregister a provider
   * @param {string} providerId - Provider ID to unregister
   */
  unregister(providerId) {
    const provider = this.providers.get(providerId);
    if (!provider) return;
    
    this.providers.delete(providerId);
    
    // Remove from region index
    const regionSet = this.regionProviders.get(provider.region);
    if (regionSet) {
      regionSet.delete(providerId);
      if (regionSet.size === 0) {
        this.regionProviders.delete(provider.region);
      }
    }
    
    // Remove from type index
    const typeSet = this.typeProviders.get(provider.type);
    if (typeSet) {
      typeSet.delete(providerId);
      if (typeSet.size === 0) {
        this.typeProviders.delete(provider.type);
      }
    }
    
    console.log(`[ProviderRegistry] Unregistered provider: ${providerId}`);
  }

  /**
   * Get a provider by ID
   * @param {string} providerId - Provider ID
   * @returns {DataProvider|undefined}
   */
  get(providerId) {
    return this.providers.get(providerId);
  }

  /**
   * Get all providers for a region
   * @param {string} region - Region code
   * @param {string} [type] - Optional type filter
   * @returns {DataProvider[]}
   */
  getByRegion(region, type = null) {
    const providerIds = this.regionProviders.get(region) || new Set();
    const providers = Array.from(providerIds)
      .map(id => this.providers.get(id))
      .filter(p => p && p.enabled);
    
    if (type) {
      return providers.filter(p => p.type === type);
    }
    
    return providers;
  }

  /**
   * Get all providers of a specific type
   * @param {string} type - Provider type
   * @returns {DataProvider[]}
   */
  getByType(type) {
    const providerIds = this.typeProviders.get(type) || new Set();
    return Array.from(providerIds)
      .map(id => this.providers.get(id))
      .filter(p => p && p.enabled);
  }

  /**
   * Get all registered providers
   * @returns {DataProvider[]}
   */
  getAll() {
    return Array.from(this.providers.values());
  }

  /**
   * Execute providers for a region with aggregation
   * @param {string} region - Region code
   * @param {ProviderOptions} [options] - Provider options
   * @returns {Promise<{schedule: any[], channels: any[], apps: any[], errors: any[]}>}
   */
  async execute(region, options = {}) {
    const providers = this.getByRegion(region);
    
    if (providers.length === 0) {
      console.warn(`[ProviderRegistry] No providers found for region: ${region}`);
      return { schedule: [], channels: [], apps: [], errors: [] };
    }
    
    // Sort by priority (descending)
    providers.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    
    const results = {
      schedule: [],
      channels: [],
      apps: [],
      errors: []
    };
    
    // Execute all providers in parallel with error handling
    const executions = providers.map(async (provider) => {
      try {
        // Health check if available
        if (provider.healthCheck) {
          const healthy = await Promise.race([
            provider.healthCheck(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Health check timeout')), 5000))
          ]);
          
          if (!healthy) {
            results.errors.push({
              providerId: provider.id,
              error: 'Health check failed'
            });
            return;
          }
        }
        
        // Fetch schedule
        if (provider.fetchSchedule) {
          const schedule = await provider.fetchSchedule(options);
          if (Array.isArray(schedule)) {
            results.schedule.push(...schedule);
          }
        }
        
        // Fetch channels
        if (provider.fetchChannels) {
          const channels = await provider.fetchChannels(options);
          if (Array.isArray(channels)) {
            results.channels.push(...channels);
          }
        }
        
        // Fetch apps
        if (provider.fetchApps) {
          const apps = await provider.fetchApps(options);
          if (Array.isArray(apps)) {
            results.apps.push(...apps);
          }
        }
      } catch (error) {
        console.error(`[ProviderRegistry] Error executing provider ${provider.id}:`, error);
        results.errors.push({
          providerId: provider.id,
          error: error.message
        });
      }
    });
    
    await Promise.allSettled(executions);
    
    return results;
  }

  /**
   * Check environment configuration for providers
   * @param {string} region - Region code
   * @returns {Object.<string, boolean>} Provider ID to configured status
   */
  checkConfiguration(region) {
    const providers = this.getByRegion(region);
    const status = {};
    
    for (const provider of providers) {
      if (!provider.requiredEnv || provider.requiredEnv.length === 0) {
        status[provider.id] = true;
        continue;
      }
      
      const allConfigured = provider.requiredEnv.every(
        envVar => process.env[envVar] !== undefined && process.env[envVar] !== ''
      );
      
      status[provider.id] = allConfigured;
    }
    
    return status;
  }

  /**
   * Get provider statistics
   * @returns {Object}
   */
  getStats() {
    const all = this.getAll();
    return {
      total: all.length,
      enabled: all.filter(p => p.enabled).length,
      byRegion: Object.fromEntries(Array.from(this.regionProviders.entries()).map(([k, v]) => [k, v.size])),
      byType: Object.fromEntries(Array.from(this.typeProviders.entries()).map(([k, v]) => [k, v.size]))
    };
  }
}

// Singleton instance
let registryInstance = null;

/**
 * Get the global provider registry instance
 * @returns {ProviderRegistry}
 */
export function getProviderRegistry() {
  if (!registryInstance) {
    registryInstance = new ProviderRegistry();
  }
  return registryInstance;
}

export default ProviderRegistry;
