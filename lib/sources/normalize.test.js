import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeChannelKey,
  dedupeAndMergeChannels,
  rankStreams
} from './normalize.js';
import { buildSourceSummary } from './index.js';

test('normalizeChannelKey makes a stable channel identity', () => {
  assert.equal(normalizeChannelKey('BBC One', 'GB'), 'bbc-one-gb');
  assert.equal(normalizeChannelKey('BBC One', 'gb'), 'bbc-one-gb');
  assert.equal(normalizeChannelKey('  ITV 1  ', 'GB'), 'itv-1-gb');
});

test('dedupeAndMergeChannels keeps the strongest source metadata', () => {
  const merged = dedupeAndMergeChannels([
    {
      id: 'a',
      name: 'BBC One',
      country: 'GB',
      logo: 'https://alpha.example/logo.png',
      languages: ['English'],
      streamUrl: 'https://example.com/one.m3u8',
      source: 'iptv-org'
    },
    {
      id: 'b',
      name: 'BBC One',
      country: 'GB',
      logo: 'https://beta.example/logo.png',
      languages: ['English', 'Welsh'],
      streamUrl: 'https://example.com/two.m3u8',
      source: 'xmltv'
    }
  ]);

  assert.equal(merged.length, 1);
  assert.deepEqual(merged[0].languages, ['English', 'Welsh']);
  assert.ok(merged[0].streamUrls.includes('https://example.com/one.m3u8'));
  assert.ok(merged[0].streamUrls.includes('https://example.com/two.m3u8'));
  assert.equal(merged[0].primarySource, 'iptv-org');
});

test('rankStreams sorts working sources ahead of dead or low-trust entries', () => {
  const ranked = rankStreams([
    { url: 'https://dead.example/live.m3u8', source: 'community', status: 'dead', quality: 'sd' },
    { url: 'https://good.example/live.m3u8', source: 'iptv-org', status: 'online', quality: 'hd' },
    { url: 'https://backup.example/live.m3u8', source: 'xmltv', status: 'online', quality: 'sd' }
  ]);

  assert.equal(ranked[0].url, 'https://good.example/live.m3u8');
  assert.equal(ranked[1].url, 'https://backup.example/live.m3u8');
  assert.equal(ranked[2].url, 'https://dead.example/live.m3u8');
});

test('buildSourceSummary counts stream health by source', () => {
  const summary = buildSourceSummary([
    {
      streamItems: [
        { source: 'iptv-org', status: 'online' },
        { source: 'iptv-org', status: 'unknown' },
        { source: 'xmltv', status: 'dead' }
      ]
    }
  ]);

  assert.deepEqual(summary, [
    { source: 'iptv-org', total: 2, healthy: 1, dead: 0, unknown: 1 },
    { source: 'xmltv', total: 1, healthy: 0, dead: 1, unknown: 0 }
  ]);
});
