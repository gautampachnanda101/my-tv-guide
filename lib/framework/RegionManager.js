/**
 * @fileoverview Region Manager - Manages region configurations and locale settings
 * Provides unified access to region-specific settings and providers
 */

import { getPluginManager } from './PluginManager';
import { getProviderRegistry } from './ProviderRegistry';

/** @typedef {import('./types').RegionConfig} RegionConfig */
/** @typedef {import('./types').ProviderOptions} ProviderOptions */
/** @typedef {import('./types').GuideData} GuideData */

class RegionManager {
  constructor() {
    this.pluginManager = getPluginManager();
    this.providerRegistry = getProviderRegistry();
  }

  /**
   * Get configuration for a region
   * @param {string} regionCode - Region code (e.g., 'uk', 'us')
   * @returns {RegionConfig|null}
   */
  getRegionConfig(regionCode) {
    return this.pluginManager.getRegion(regionCode);
  }

  /**
   * Get all available regions
   * @returns {RegionConfig[]}
   */
  getAllRegions() {
    return this.pluginManager.getAllRegions();
  }

  /**
   * Check if a region is supported
   * @param {string} regionCode - Region code
   * @returns {boolean}
   */
  isRegionSupported(regionCode) {
    return this.pluginManager.getRegion(regionCode) !== undefined;
  }

  /**
   * Get supported region codes
   * @returns {string[]}
   */
  getSupportedRegionCodes() {
    return this.getAllRegions().map(r => r.code);
  }

  /**
   * Fetch guide data for a region
   * @param {string} regionCode - Region code
   * @param {ProviderOptions} [options] - Provider options
   * @returns {Promise<GuideData>}
   */
  async fetchGuideData(regionCode, options = {}) {
    const config = this.getRegionConfig(regionCode);
    
    if (!config) {
      throw new Error(`Region ${regionCode} is not supported`);
    }
    
    // Execute all providers for this region
    const results = await this.providerRegistry.execute(regionCode, options);
    
    // Get provider statuses
    const providers = this.providerRegistry.getByRegion(regionCode);
    const sourceStatus = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      standard: provider.type,
      integration: provider.type,
      required: false,
      status: results.errors.find(e => e.providerId === provider.id) ? 'error' : 'connected'
    }));
    
    // Get provider warnings
    const providerWarnings = results.errors.map(
      error => `${error.providerId}: ${error.error}`
    );
    
    // Process and deduplicate results
    const schedule = this.deduplicateById(results.schedule);
    const channels = this.deduplicateById(results.channels);
    const apps = this.deduplicateById(results.apps);
    
    // Split schedule into today/liveNow/upcoming
    const { today, liveNow, upcoming } = this.splitSchedule(schedule, config.timeZone);
    
    // Apply query filter if provided
    const filteredData = options.query 
      ? this.filterByQuery(
          { today, liveNow, upcoming, tvChannels: channels, streamingApps: apps },
          options.query
        )
      : { today, liveNow, upcoming, tvChannels: channels, streamingApps: apps };
    
    return {
      region: regionCode,
      ...filteredData,
      sourceStatus,
      providerWarnings
    };
  }

  /**
   * Split schedule into time-based categories
   * @param {any[]} schedule - Schedule items
   * @param {string} timeZone - IANA timezone
   * @returns {{today: any[], liveNow: any[], upcoming: any[]}}
   */
  splitSchedule(schedule, timeZone) {
    const now = new Date();
    const todayKey = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now);
    
    const today = [];
    const liveNow = [];
    const upcoming = [];
    
    for (const item of schedule) {
      if (!item.startAt) continue;
      
      const start = new Date(item.startAt);
      const end = item.endAt ? new Date(item.endAt) : new Date(start.getTime() + 30 * 60 * 1000);
      const startKey = new Intl.DateTimeFormat('en-CA', { timeZone }).format(start);
      
      if (startKey === todayKey) {
        today.push(item);
      }
      
      if (start <= now && now <= end) {
        liveNow.push(item);
      } else if (start > now) {
        upcoming.push(item);
      }
    }
    
    // Sort by start time
    today.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    upcoming.sort((a, b) => new Date(a.startAt) - new Date(b.startAt));
    
    return { today, liveNow, upcoming };
  }

  /**
   * Deduplicate items by ID
   * @param {any[]} items - Items with id property
   * @returns {any[]}
   */
  deduplicateById(items) {
    const seen = new Map();
    for (const item of items) {
      if (item?.id && !seen.has(item.id)) {
        seen.set(item.id, item);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Filter data by search query
   * @param {Object} data - Data object with arrays
   * @param {string} query - Search query
   * @returns {Object} Filtered data
   */
  filterByQuery(data, query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    if (!normalizedQuery) {
      return data;
    }
    
    const matchesQuery = (item) => {
      const searchableText = JSON.stringify(item).toLowerCase();
      return searchableText.includes(normalizedQuery);
    };
    
    return {
      today: data.today.filter(matchesQuery),
      liveNow: data.liveNow.filter(matchesQuery),
      upcoming: data.upcoming.filter(matchesQuery),
      tvChannels: data.tvChannels.filter(matchesQuery),
      streamingApps: data.streamingApps.filter(matchesQuery)
    };
  }

  /**
   * Format date/time for a region
   * @param {Date|string} date - Date to format
   * @param {string} regionCode - Region code
   * @param {Intl.DateTimeFormatOptions} [options] - Format options
   * @returns {string}
   */
  formatDateTime(date, regionCode, options = {}) {
    const config = this.getRegionConfig(regionCode);
    if (!config) {
      throw new Error(`Region ${regionCode} not found`);
    }
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat(config.locale, {
      timeZone: config.timeZone,
      ...options
    }).format(dateObj);
  }

  /**
   * Get region statistics
   * @returns {Object}
   */
  getStats() {
    const regions = this.getAllRegions();
    const stats = {
      totalRegions: regions.length,
      byRegion: {}
    };
    
    for (const region of regions) {
      const providers = this.providerRegistry.getByRegion(region.code);
      stats.byRegion[region.code] = {
        name: region.name,
        providers: providers.length,
        enabledProviders: providers.filter(p => p.enabled).length
      };
    }
    
    return stats;
  }
}

// Singleton instance
let regionManagerInstance = null;

/**
 * Get the global region manager instance
 * @returns {RegionManager}
 */
export function getRegionManager() {
  if (!regionManagerInstance) {
    regionManagerInstance = new RegionManager();
  }
  return regionManagerInstance;
}

export default RegionManager;
