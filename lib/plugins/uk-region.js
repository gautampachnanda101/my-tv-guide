/**
 * @fileoverview UK Region Plugin
 * Comprehensive plugin for UK TV guide data
 */

import { createRegionPlugin } from '../framework';

// Import existing UK providers
import { ukProviders } from '../providers/uk';
import { bbcIPlayerProvider } from '../providers/uk/bbc-iplayer';
import { tvMazeProvider } from '../providers/uk/tvmaze';
import { enhancedChannelsProvider } from '../providers/uk/enhanced-channels';

/** @type {import('../framework/types').RegionConfig} */
const ukRegionConfig = {
  code: 'uk',
  name: 'United Kingdom',
  timeZone: 'Europe/London',
  locale: 'en-GB',
  providers: ['tvmaze-uk', 'bbc-iplayer', 'enhanced-channels-uk'],
  metadata: {
    currency: 'GBP',
    broadcastStandard: 'DVB-T2',
    defaultChannels: ['BBC One', 'BBC Two', 'ITV', 'Channel 4', 'Channel 5']
  }
};

/** @type {import('../framework/types').DataProvider[]} */
const ukDataProviders = [
  // TVMaze provider for UK schedule data
  {
    id: 'tvmaze-uk',
    name: 'TVMaze UK',
    region: 'uk',
    type: 'schedule',
    priority: 80,
    enabled: true,
    async fetchSchedule(options = {}) {
      // Use existing TVMaze implementation
      if (tvMazeProvider?.fetchSchedule) {
        return await tvMazeProvider.fetchSchedule(options);
      }
      return [];
    },
    async healthCheck() {
      try {
        const response = await fetch('https://api.tvmaze.com/schedule', {
          method: 'HEAD',
          signal: AbortSignal.timeout(5000)
        });
        return response.ok;
      } catch {
        return false;
      }
    }
  },

  // BBC iPlayer provider for schedule and channels
  {
    id: 'bbc-iplayer',
    name: 'BBC iPlayer',
    region: 'uk',
    type: 'schedule',
    priority: 90,
    enabled: true,
    async fetchSchedule(options = {}) {
      if (bbcIPlayerProvider?.fetchSchedule) {
        return await bbcIPlayerProvider.fetchSchedule(options);
      }
      return [];
    },
    async fetchChannels(options = {}) {
      if (bbcIPlayerProvider?.fetchChannels) {
        return await bbcIPlayerProvider.fetchChannels(options);
      }
      return [];
    },
    async healthCheck() {
      return true; // BBC iPlayer has no specific health endpoint
    }
  },

  // Enhanced Channels provider
  {
    id: 'enhanced-channels-uk',
    name: 'Enhanced UK Channels',
    region: 'uk',
    type: 'channels',
    priority: 100,
    enabled: true,
    async fetchChannels(options = {}) {
      if (enhancedChannelsProvider?.fetchChannels) {
        return await enhancedChannelsProvider.fetchChannels(options);
      }
      return [];
    },
    async fetchApps(options = {}) {
      if (enhancedChannelsProvider?.fetchApps) {
        return await enhancedChannelsProvider.fetchApps(options);
      }
      return [];
    },
    async healthCheck() {
      return true; // Local data
    }
  }
];

// Create and export the UK plugin
export const ukPlugin = createRegionPlugin(
  'uk-region-plugin',
  ukRegionConfig,
  ukDataProviders
);

export default ukPlugin;
