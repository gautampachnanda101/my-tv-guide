/**
 * @fileoverview Plugin Registry
 * Central registry for all plugins
 */

import ukPlugin from './uk-region';
import usPlugin from './us-region';

/**
 * Get all registered plugins
 * @returns {import('../framework/types').PluginManifest[]}
 */
export function getAllPlugins() {
  return [
    ukPlugin,
    usPlugin
    // Add more plugins here
  ];
}

/**
 * Get plugins for specific regions
 * @param {string[]} regionCodes - Array of region codes
 * @returns {import('../framework/types').PluginManifest[]}
 */
export function getPluginsForRegions(regionCodes) {
  const all = getAllPlugins();
  return all.filter(plugin => {
    if (!plugin.regions) return false;
    return plugin.regions.some(region => regionCodes.includes(region.code));
  });
}

/**
 * Get enabled plugins based on configuration
 * @returns {import('../framework/types').PluginManifest[]}
 */
export function getEnabledPlugins() {
  const enabledRegions = (process.env.NEXT_PUBLIC_ENABLED_REGIONS || 'uk').split(',');
  return getPluginsForRegions(enabledRegions);
}

export { ukPlugin, usPlugin };
