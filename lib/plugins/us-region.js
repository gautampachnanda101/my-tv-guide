/**
 * @fileoverview US Region Plugin Example
 * Demonstrates how to add a new region with custom providers
 */

import { createRegionPlugin } from '../framework';

/** @type {import('../framework/types').RegionConfig} */
const usRegionConfig = {
  code: 'us',
  name: 'United States',
  timeZone: 'America/New_York',
  locale: 'en-US',
  providers: ['tvmaze-us', 'us-channels'],
  metadata: {
    currency: 'USD',
    broadcastStandard: 'ATSC',
    defaultChannels: ['ABC', 'CBS', 'NBC', 'FOX', 'The CW']
  }
};

/** @type {import('../framework/types').DataProvider[]} */
const usDataProviders = [
  // TVMaze provider for US schedule data
  {
    id: 'tvmaze-us',
    name: 'TVMaze US',
    region: 'us',
    type: 'schedule',
    priority: 80,
    enabled: true,
    async fetchSchedule(options = {}) {
      try {
        const country = 'US';
        const date = options.date || new Date();
        const dateStr = date.toISOString().split('T')[0];
        
        const response = await fetch(
          `https://api.tvmaze.com/schedule?country=${country}&date=${dateStr}`,
          { signal: AbortSignal.timeout(10000) }
        );
        
        if (!response.ok) return [];
        
        const data = await response.json();
        
        return data.map(item => ({
          id: `tvmaze-us-${item.id}`,
          show: item.show?.name || 'Unknown Show',
          channel: item.show?.network?.name || item.show?.webChannel?.name || 'Unknown',
          network: item.show?.network?.name,
          startAt: item.airstamp,
          runtime: item.runtime,
          genres: item.show?.genres || [],
          summary: item.summary,
          image: item.image?.original || item.show?.image?.original,
          url: item.url || item.show?.url,
          watchVia: item.show?.webChannel?.name ? [item.show.webChannel.name] : []
        }));
      } catch (error) {
        console.error('[TVMaze US] Error fetching schedule:', error);
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

  // US Channels provider (static data example)
  {
    id: 'us-channels',
    name: 'US Channels',
    region: 'us',
    type: 'channels',
    priority: 90,
    enabled: true,
    async fetchChannels() {
      return [
        { id: 'abc', name: 'ABC', number: 7, network: 'ABC', category: 'Broadcast', hd: true },
        { id: 'cbs', name: 'CBS', number: 2, network: 'CBS', category: 'Broadcast', hd: true },
        { id: 'nbc', name: 'NBC', number: 4, network: 'NBC', category: 'Broadcast', hd: true },
        { id: 'fox', name: 'FOX', number: 5, network: 'FOX', category: 'Broadcast', hd: true },
        { id: 'cw', name: 'The CW', number: 11, network: 'The CW', category: 'Broadcast', hd: true },
        { id: 'pbs', name: 'PBS', number: 13, network: 'PBS', category: 'Broadcast', hd: true },
        { id: 'espn', name: 'ESPN', number: 206, network: 'ESPN', category: 'Sports', hd: true },
        { id: 'cnn', name: 'CNN', number: 202, network: 'CNN', category: 'News', hd: true },
        { id: 'hbo', name: 'HBO', number: 300, network: 'HBO', category: 'Premium', hd: true },
        { id: 'showtime', name: 'Showtime', number: 318, network: 'Showtime', category: 'Premium', hd: true }
      ];
    },
    async fetchApps() {
      return [
        { id: 'hulu', name: 'Hulu', category: 'Streaming', priceModel: 'Subscription', website: 'https://www.hulu.com' },
        { id: 'peacock', name: 'Peacock', category: 'Streaming', priceModel: 'Freemium', website: 'https://www.peacocktv.com' },
        { id: 'paramount-plus', name: 'Paramount+', category: 'Streaming', priceModel: 'Subscription', website: 'https://www.paramountplus.com' },
        { id: 'max', name: 'Max', category: 'Streaming', priceModel: 'Subscription', website: 'https://www.max.com' },
        { id: 'disney-plus', name: 'Disney+', category: 'Streaming', priceModel: 'Subscription', website: 'https://www.disneyplus.com' },
        { id: 'netflix', name: 'Netflix', category: 'Streaming', priceModel: 'Subscription', website: 'https://www.netflix.com' },
        { id: 'prime-video', name: 'Prime Video', category: 'Streaming', priceModel: 'Subscription', website: 'https://www.primevideo.com' },
        { id: 'apple-tv-plus', name: 'Apple TV+', category: 'Streaming', priceModel: 'Subscription', website: 'https://tv.apple.com' }
      ];
    },
    async healthCheck() {
      return true; // Static data
    }
  }
];

// Create and export the US plugin
export const usPlugin = createRegionPlugin(
  'us-region-plugin',
  usRegionConfig,
  usDataProviders
);

export default usPlugin;
