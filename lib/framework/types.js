/**
 * @fileoverview Type definitions for the TV Guide extensible framework
 * These JSDoc types ensure type safety and provide IntelliSense support
 */

/**
 * @typedef {Object} ProgrammeItem
 * @property {string} id - Unique identifier
 * @property {string} show - Programme title
 * @property {string} channel - Channel name
 * @property {string} [network] - Network/broadcaster name
 * @property {string} [startAt] - ISO 8601 start time
 * @property {string} [endAt] - ISO 8601 end time
 * @property {number} [runtime] - Duration in minutes
 * @property {string[]} [genres] - Genre tags
 * @property {string} [summary] - Programme description
 * @property {string} [image] - Image URL
 * @property {string[]} [watchVia] - Streaming platforms
 * @property {string} [url] - Programme page URL
 * @property {string} [streamUrl] - Direct stream URL
 * @property {string} [channelWebsite] - Channel website URL
 */

/**
 * @typedef {Object} ChannelItem
 * @property {string} id - Unique identifier
 * @property {string} name - Channel name
 * @property {number} [number] - Channel number
 * @property {string} [network] - Network/broadcaster
 * @property {string} [category] - Channel category
 * @property {boolean} [hd] - HD availability
 * @property {string[]} [watchVia] - Streaming platforms
 * @property {string} [logo] - Logo URL
 * @property {string} [streamUrl] - Direct stream URL
 * @property {string} [website] - Channel website
 */

/**
 * @typedef {Object} StreamingApp
 * @property {string} id - Unique identifier
 * @property {string} name - App name
 * @property {string} [category] - App category
 * @property {string} [priceModel] - Pricing model
 * @property {string[]} [platforms] - Supported platforms
 * @property {string[]} [highlights] - Key features
 * @property {string} [website] - App website
 */

/**
 * @typedef {Object} ProviderSource
 * @property {string} id - Source identifier
 * @property {string} name - Source name
 * @property {string} [standard] - Standard/protocol used
 * @property {string} [integration] - Integration type
 * @property {string} [url] - Source URL
 * @property {string} [defaultUrl] - Default fallback URL
 * @property {boolean} [required] - Whether source is required
 * @property {string} [env] - Environment variable name
 * @property {string} status - Status: 'connected' | 'error' | 'pending' | 'not-configured'
 */

/**
 * @typedef {Object} GuideData
 * @property {string} region - Region identifier
 * @property {ProgrammeItem[]} today - Today's programmes
 * @property {ProgrammeItem[]} liveNow - Currently airing programmes
 * @property {ProgrammeItem[]} upcoming - Upcoming programmes
 * @property {ChannelItem[]} tvChannels - Available TV channels
 * @property {StreamingApp[]} streamingApps - Available streaming apps
 * @property {ProviderSource[]} sourceStatus - Data source status
 * @property {string[]} providerWarnings - Warning messages
 */

/**
 * @typedef {Object} ProviderOptions
 * @property {string} [query] - Search query
 * @property {Date} [date] - Target date
 * @property {number} [limit] - Result limit
 * @property {Object.<string, any>} [config] - Provider-specific config
 */

/**
 * @typedef {Object} DataProvider
 * @property {string} id - Provider unique identifier
 * @property {string} name - Provider display name
 * @property {string} region - Region code (e.g., 'uk', 'us')
 * @property {string} type - Provider type: 'schedule' | 'channels' | 'metadata'
 * @property {number} priority - Provider priority (higher = preferred)
 * @property {boolean} enabled - Whether provider is enabled
 * @property {string[]} [requiredEnv] - Required environment variables
 * @property {(options?: ProviderOptions) => Promise<ProgrammeItem[]>} [fetchSchedule] - Fetch schedule data
 * @property {(options?: ProviderOptions) => Promise<ChannelItem[]>} [fetchChannels] - Fetch channel data
 * @property {(options?: ProviderOptions) => Promise<StreamingApp[]>} [fetchApps] - Fetch streaming apps
 * @property {() => Promise<boolean>} [healthCheck] - Health check function
 */

/**
 * @typedef {Object} RegionConfig
 * @property {string} code - Region code (e.g., 'uk')
 * @property {string} name - Region display name
 * @property {string} timeZone - IANA timezone
 * @property {string} locale - Locale code (e.g., 'en-GB')
 * @property {string[]} providers - Enabled provider IDs
 * @property {Object.<string, any>} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} UIComponent
 * @property {string} id - Component identifier
 * @property {string} name - Component display name
 * @property {string} type - Component type
 * @property {Function} render - React component function
 * @property {Object} [defaultProps] - Default props
 */

/**
 * @typedef {Object} PluginManifest
 * @property {string} id - Plugin identifier
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} [description] - Plugin description
 * @property {string[]} [dependencies] - Required plugin IDs
 * @property {DataProvider[]} [providers] - Data providers
 * @property {UIComponent[]} [components] - UI components
 * @property {RegionConfig[]} [regions] - Region configurations
 * @property {() => void} [onLoad] - Plugin initialization hook
 * @property {() => void} [onUnload] - Plugin cleanup hook
 */

export {};
