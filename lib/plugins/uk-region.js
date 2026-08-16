/**
 * @fileoverview UK Region Plugin
 * Comprehensive plugin for UK TV guide data
 */

import { createRegionPlugin } from '../framework';

// Import existing UK provider functions
import { fetchUkSchedule } from '../providers/uk/tvmaze';
import { fetchBbcSchedule } from '../providers/uk/bbc-iplayer';
import { enhancedUkChannels } from '../providers/uk/enhanced-channels';

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
      try {
        return await fetchUkSchedule();
      } catch (error) {
        console.error('TVMaze UK fetch error:', error);
        return [];
      }
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
      try {
        return await fetchBbcSchedule();
      } catch (error) {
        console.error('BBC iPlayer fetch error:', error);
        return [];
      }
    },
    async fetchChannels(options = {}) {
      // Return BBC channels from the enhanced channels list
      return enhancedUkChannels.filter(ch => ch.network === 'BBC');
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
      return enhancedUkChannels;
    },
    async fetchApps(options = {}) {
      // Return unique streaming apps from the channels
      const apps = new Set();
      enhancedUkChannels.forEach(channel => {
        if (channel.watchVia) {
          channel.watchVia.forEach(app => apps.add(app));
        }
      });
      return Array.from(apps).map(name => ({ name }));
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
