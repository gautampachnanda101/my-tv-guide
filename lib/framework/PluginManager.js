/**
 * @fileoverview Plugin Manager - Manages plugin lifecycle and dependencies
 * Enables extensibility through a plugin architecture
 */

import { getProviderRegistry } from './ProviderRegistry';

/** @typedef {import('./types').PluginManifest} PluginManifest */
/** @typedef {import('./types').DataProvider} DataProvider */
/** @typedef {import('./types').UIComponent} UIComponent */
/** @typedef {import('./types').RegionConfig} RegionConfig */

class PluginManager {
  constructor() {
    /** @type {Map<string, PluginManifest>} */
    this.plugins = new Map();
    
    /** @type {Map<string, 'pending' | 'loaded' | 'error'>} */
    this.pluginStatus = new Map();
    
    /** @type {Map<string, UIComponent>} */
    this.components = new Map();
    
    /** @type {Map<string, RegionConfig>} */
    this.regions = new Map();
    
    this.providerRegistry = getProviderRegistry();
  }

  /**
   * Register a plugin
   * @param {PluginManifest} plugin - Plugin manifest
   * @throws {Error} If plugin is invalid or has unmet dependencies
   */
  async register(plugin) {
    if (!plugin.id) {
      throw new Error('Plugin must have an id');
    }
    
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }
    
    // Check dependencies
    if (plugin.dependencies) {
      for (const depId of plugin.dependencies) {
        if (!this.plugins.has(depId)) {
          throw new Error(`Plugin ${plugin.id} depends on ${depId} which is not registered`);
        }
        if (this.pluginStatus.get(depId) !== 'loaded') {
          throw new Error(`Plugin ${plugin.id} depends on ${depId} which is not loaded`);
        }
      }
    }
    
    this.plugins.set(plugin.id, plugin);
    this.pluginStatus.set(plugin.id, 'pending');
    
    console.log(`[PluginManager] Registered plugin: ${plugin.id} v${plugin.version || '1.0.0'}`);
    
    // Auto-load if no dependencies
    if (!plugin.dependencies || plugin.dependencies.length === 0) {
      await this.load(plugin.id);
    }
  }

  /**
   * Load a plugin
   * @param {string} pluginId - Plugin ID
   * @throws {Error} If plugin fails to load
   */
  async load(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      throw new Error(`Plugin ${pluginId} not found`);
    }
    
    if (this.pluginStatus.get(pluginId) === 'loaded') {
      console.log(`[PluginManager] Plugin ${pluginId} already loaded`);
      return;
    }
    
    try {
      // Load dependencies first
      if (plugin.dependencies) {
        for (const depId of plugin.dependencies) {
          await this.load(depId);
        }
      }
      
      // Register providers
      if (plugin.providers) {
        for (const provider of plugin.providers) {
          this.providerRegistry.register(provider);
        }
      }
      
      // Register UI components
      if (plugin.components) {
        for (const component of plugin.components) {
          this.components.set(component.id, component);
        }
      }
      
      // Register regions
      if (plugin.regions) {
        for (const region of plugin.regions) {
          this.regions.set(region.code, region);
        }
      }
      
      // Call plugin initialization
      if (plugin.onLoad) {
        await plugin.onLoad();
      }
      
      this.pluginStatus.set(pluginId, 'loaded');
      console.log(`[PluginManager] Loaded plugin: ${pluginId}`);
      
    } catch (error) {
      this.pluginStatus.set(pluginId, 'error');
      console.error(`[PluginManager] Failed to load plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Unload a plugin
   * @param {string} pluginId - Plugin ID
   */
  async unload(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return;
    
    if (this.pluginStatus.get(pluginId) !== 'loaded') {
      return;
    }
    
    try {
      // Check if other plugins depend on this one
      for (const [otherPluginId, otherPlugin] of this.plugins.entries()) {
        if (otherPlugin.dependencies?.includes(pluginId) && 
            this.pluginStatus.get(otherPluginId) === 'loaded') {
          throw new Error(`Cannot unload ${pluginId}: ${otherPluginId} depends on it`);
        }
      }
      
      // Call plugin cleanup
      if (plugin.onUnload) {
        await plugin.onUnload();
      }
      
      // Unregister providers
      if (plugin.providers) {
        for (const provider of plugin.providers) {
          this.providerRegistry.unregister(provider.id);
        }
      }
      
      // Unregister UI components
      if (plugin.components) {
        for (const component of plugin.components) {
          this.components.delete(component.id);
        }
      }
      
      // Unregister regions
      if (plugin.regions) {
        for (const region of plugin.regions) {
          this.regions.delete(region.code);
        }
      }
      
      this.pluginStatus.set(pluginId, 'pending');
      console.log(`[PluginManager] Unloaded plugin: ${pluginId}`);
      
    } catch (error) {
      console.error(`[PluginManager] Failed to unload plugin ${pluginId}:`, error);
      throw error;
    }
  }

  /**
   * Get a component by ID
   * @param {string} componentId - Component ID
   * @returns {UIComponent|undefined}
   */
  getComponent(componentId) {
    return this.components.get(componentId);
  }

  /**
   * Get all components of a specific type
   * @param {string} type - Component type
   * @returns {UIComponent[]}
   */
  getComponentsByType(type) {
    return Array.from(this.components.values())
      .filter(c => c.type === type);
  }

  /**
   * Get a region configuration
   * @param {string} regionCode - Region code
   * @returns {RegionConfig|undefined}
   */
  getRegion(regionCode) {
    return this.regions.get(regionCode);
  }

  /**
   * Get all available regions
   * @returns {RegionConfig[]}
   */
  getAllRegions() {
    return Array.from(this.regions.values());
  }

  /**
   * Get plugin status
   * @param {string} pluginId - Plugin ID
   * @returns {'pending' | 'loaded' | 'error' | 'not-found'}
   */
  getStatus(pluginId) {
    return this.pluginStatus.get(pluginId) || 'not-found';
  }

  /**
   * Get all plugin statuses
   * @returns {Object.<string, string>}
   */
  getAllStatuses() {
    return Object.fromEntries(this.pluginStatus);
  }

  /**
   * Get plugin manager statistics
   * @returns {Object}
   */
  getStats() {
    const statuses = Array.from(this.pluginStatus.values());
    return {
      totalPlugins: this.plugins.size,
      loaded: statuses.filter(s => s === 'loaded').length,
      pending: statuses.filter(s => s === 'pending').length,
      error: statuses.filter(s => s === 'error').length,
      totalComponents: this.components.size,
      totalRegions: this.regions.size
    };
  }
}

// Singleton instance
let managerInstance = null;

/**
 * Get the global plugin manager instance
 * @returns {PluginManager}
 */
export function getPluginManager() {
  if (!managerInstance) {
    managerInstance = new PluginManager();
  }
  return managerInstance;
}

export default PluginManager;
