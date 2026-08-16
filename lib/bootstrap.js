/**
 * @fileoverview Framework initialization and bootstrap
 * Sets up the framework with all registered plugins
 */

import { initializeFramework } from './framework';
import { getEnabledPlugins } from './plugins';

let initialized = false;

/**
 * Bootstrap the TV Guide framework
 * @returns {Promise<void>}
 */
export async function bootstrap() {
  if (initialized) {
    console.log('[Bootstrap] Already initialized');
    return;
  }
  
  try {
    console.log('[Bootstrap] Starting TV Guide framework...');
    
    // Get enabled plugins based on environment configuration
    const plugins = getEnabledPlugins();
    
    console.log(`[Bootstrap] Found ${plugins.length} enabled plugins`);
    
    // Initialize the framework with plugins
    await initializeFramework(plugins);
    
    initialized = true;
    console.log('[Bootstrap] Framework ready');
    
  } catch (error) {
    console.error('[Bootstrap] Failed to initialize framework:', error);
    throw error;
  }
}

/**
 * Check if framework is initialized
 * @returns {boolean}
 */
export function isInitialized() {
  return initialized;
}

/**
 * Reset framework (useful for testing)
 */
export function reset() {
  initialized = false;
}

export { getFrameworkStats } from './framework';
export { getRegionManager } from './framework/RegionManager';
export { getConfig } from './framework/ConfigManager';
