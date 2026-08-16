/**
 * @fileoverview TV Guide Extensible Framework
 * Main entry point for the plugin-based architecture
 */

export { getProviderRegistry, default as ProviderRegistry } from './ProviderRegistry';
export { getPluginManager, default as PluginManager } from './PluginManager';
export { getRegionManager, default as RegionManager } from './RegionManager';

// Re-export types for convenience
export * from './types';

/**
 * Initialize the framework with plugins
 * @param {import('./types').PluginManifest[]} plugins - Array of plugin manifests
 * @returns {Promise<void>}
 */
export async function initializeFramework(plugins = []) {
  const { getPluginManager } = await import('./PluginManager');
  const manager = getPluginManager();
  
  console.log(`[Framework] Initializing with ${plugins.length} plugins...`);
  
  // Register all plugins first
  for (const plugin of plugins) {
    try {
      await manager.register(plugin);
    } catch (error) {
      console.error(`[Framework] Failed to register plugin ${plugin.id}:`, error);
    }
  }
  
  // Load plugins that have no dependencies
  for (const plugin of plugins) {
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      try {
        await manager.load(plugin.id);
      } catch (error) {
        console.error(`[Framework] Failed to load plugin ${plugin.id}:`, error);
      }
    }
  }
  
  console.log('[Framework] Initialization complete');
}

/**
 * Create a simple provider plugin
 * @param {string} id - Plugin ID
 * @param {string} name - Plugin name
 * @param {import('./types').DataProvider[]} providers - Data providers
 * @returns {import('./types').PluginManifest}
 */
export function createProviderPlugin(id, name, providers) {
  return {
    id,
    name,
    version: '1.0.0',
    providers,
    onLoad: () => {
      console.log(`[Plugin] ${name} loaded`);
    }
  };
}

/**
 * Create a region plugin
 * @param {string} id - Plugin ID
 * @param {import('./types').RegionConfig} regionConfig - Region configuration
 * @param {import('./types').DataProvider[]} providers - Data providers
 * @returns {import('./types').PluginManifest}
 */
export function createRegionPlugin(id, regionConfig, providers) {
  return {
    id,
    name: `${regionConfig.name} Region Plugin`,
    version: '1.0.0',
    regions: [regionConfig],
    providers,
    onLoad: () => {
      console.log(`[Plugin] ${regionConfig.name} region loaded with ${providers.length} providers`);
    }
  };
}

/**
 * Get framework statistics
 * @returns {Object}
 */
export function getFrameworkStats() {
  const { getPluginManager } = require('./PluginManager');
  const { getProviderRegistry } = require('./ProviderRegistry');
  const { getRegionManager } = require('./RegionManager');
  
  return {
    plugins: getPluginManager().getStats(),
    providers: getProviderRegistry().getStats(),
    regions: getRegionManager().getStats()
  };
}
