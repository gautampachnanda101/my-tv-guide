import test from 'node:test';
import assert from 'node:assert/strict';

import { matchQuery } from './index.js';

const programme = (show, channel = 'Some Channel', summary = '') => ({ show, title: show, channel, summary });

test('bollywood does not match one-letter-off proper nouns', () => {
  assert.equal(matchQuery(programme('Paul Hollywood City Bakes', 'Food Network'), 'bollywood'), false);
  assert.equal(matchQuery(programme('Joe Hollywood', 'Capital'), 'bollywood'), false);
  assert.equal(matchQuery(programme('Nollywood Uncut', 'Channels 24'), 'bollywood'), false);
});

test('bollywood still matches real Bollywood listings', () => {
  assert.equal(matchQuery(programme('Bollywood Sing-Along Anthems', 'BBC Asian Network'), 'bollywood'), true);
  assert.equal(matchQuery(programme('Asian Network Bollywood with Haroon Rashid', 'BBC Asian Network'), 'bollywood'), true);
});

test('typos that keep the first letter still match', () => {
  assert.equal(matchQuery(programme('Bollywood Sing-Along Anthems'), 'bolywood'), true);
  assert.equal(matchQuery(programme('Bollywood Sing-Along Anthems'), 'bollywod'), true);
  assert.equal(matchQuery(programme('EastEnders', 'BBC One'), 'eastenders'), true);
});

test('off-air placeholders are treated as filler, real shows are not', async () => {
  const { isChannelIdentFiller } = await import('./index.js');
  const item = (show, channel = 'RTÉ KIDSjr') => ({ show, title: show, channel });
  assert.equal(isChannelIdentFiller(item('..programmes start at 7.00pm')), true);
  assert.equal(isChannelIdentFiller(item('.programmes start at 7.00am')), true);
  assert.equal(isChannelIdentFiller(item('Programmes Start at 07:00')), true);
  assert.equal(isChannelIdentFiller(item('Teleshopping')), true);
  assert.equal(isChannelIdentFiller(item('This is BBC Two', 'BBC Two HD')), true);
  assert.equal(isChannelIdentFiller(item('Timothy Spall: Back at Sea', 'Channel 5')), false);
  assert.equal(isChannelIdentFiller(item('BBC News', 'BBC NEWS HD')), false);
});
