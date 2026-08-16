/**
 * @fileoverview Configuration System
 * Manages application-wide configuration with validation and environment support
 */

/** @typedef {import('./types').RegionConfig} RegionConfig */

class ConfigManager {
  constructor() {
    this.config = {
      defaultRegion: process.env.NEXT_PUBLIC_DEFAULT_REGION || 'uk',
      enabledRegions: (process.env.NEXT_PUBLIC_ENABLED_REGIONS || 'uk').split(','),
      cacheEnabled: process.env.NEXT_PUBLIC_CACHE_ENABLED !== 'false',
      cacheTTL: parseInt(process.env.NEXT_PUBLIC_CACHE_TTL || '300', 10),
      maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS || '5', 10),
      requestTimeout: parseInt(process.env.REQUEST_TIMEOUT || '10000', 10),
      enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
      logLevel: process.env.LOG_LEVEL || 'info',
      features: {
        liveNow: process.env.NEXT_PUBLIC_FEATURE_LIVE_NOW !== 'false',
        upcoming: process.env.NEXT_PUBLIC_FEATURE_UPCOMING !== 'false',
        streamingApps: process.env.NEXT_PUBLIC_FEATURE_STREAMING_APPS !== 'false',
        search: process.env.NEXT_PUBLIC_FEATURE_SEARCH !== 'false',
        filters: process.env.NEXT_PUBLIC_FEATURE_FILTERS !== 'false'
      }
    };
  }

  /**
   * Get configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @returns {any}
   */
  get(key) {
    const keys = key.split('.');
    let value = this.config;
    
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  /**
   * Set configuration value
   * @param {string} key - Configuration key (supports dot notation)
   * @param {any} value - Value to set
   */
  set(key, value) {
    const keys = key.split('.');
    const lastKey = keys.pop();
    let current = this.config;
    
    for (const k of keys) {
      if (!current[k] || typeof current[k] !== 'object') {
        current[k] = {};
      }
      current = current[k];
    }
    
    current[lastKey] = value;
  }

  /**
   * Check if a feature is enabled
   * @param {string} featureName - Feature name
   * @returns {boolean}
   */
  isFeatureEnabled(featureName) {
    return this.get(`features.${featureName}`) === true;
  }

  /**
   * Check if a region is enabled
   * @param {string} regionCode - Region code
   * @returns {boolean}
   */
  isRegionEnabled(regionCode) {
    return this.config.enabledRegions.includes(regionCode);
  }

  /**
   * Get all configuration
   * @returns {Object}
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Merge configuration
   * @param {Object} newConfig - Configuration to merge
   */
  merge(newConfig) {
    this.config = {
      ...this.config,
      ...newConfig,
      features: {
        ...this.config.features,
        ...(newConfig.features || {})
      }
    };
  }

  /**
   * Validate configuration
   * @returns {{valid: boolean, errors: string[]}}
   */
  validate() {
    const errors = [];
    
    if (!this.config.defaultRegion) {
      errors.push('defaultRegion is required');
    }
    
    if (!Array.isArray(this.config.enabledRegions) || this.config.enabledRegions.length === 0) {
      errors.push('enabledRegions must be a non-empty array');
    }
    
    if (this.config.cacheTTL < 0) {
      errors.push('cacheTTL must be non-negative');
    }
    
    if (this.config.maxConcurrentRequests < 1) {
      errors.push('maxConcurrentRequests must be at least 1');
    }
    
    if (this.config.requestTimeout < 1000) {
      errors.push('requestTimeout must be at least 1000ms');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Singleton instance
let configInstance = null;

/**
 * Get the global configuration manager
 * @returns {ConfigManager}
 */
export function getConfig() {
  if (!configInstance) {
    configInstance = new ConfigManager();
  }
  return configInstance;
}

export default ConfigManager;
