/**
 * Enhanced UK TV Channels with comprehensive metadata
 * Includes all major UK free-to-air and popular channels
 */

export const enhancedUkChannels = [
  // BBC Channels
  { id: 'bbc-one', name: 'BBC One', number: 1, network: 'BBC', category: 'General', hd: true, watchVia: ['BBC iPlayer', 'Freely'], logo: null },
  { id: 'bbc-two', name: 'BBC Two', number: 2, network: 'BBC', category: 'General', hd: true, watchVia: ['BBC iPlayer', 'Freely'], logo: null },
  { id: 'bbc-three', name: 'BBC Three', number: null, network: 'BBC', category: 'Entertainment', hd: true, watchVia: ['BBC iPlayer', 'Freely'], logo: null },
  { id: 'bbc-four', name: 'BBC Four', number: 9, network: 'BBC', category: 'Arts', hd: true, watchVia: ['BBC iPlayer', 'Freely'], logo: null },
  { id: 'bbc-news', name: 'BBC News', number: 107, network: 'BBC', category: 'News', hd: true, watchVia: ['BBC iPlayer', 'Freely'], logo: null },
  { id: 'bbc-parliament', name: 'BBC Parliament', number: 81, network: 'BBC', category: 'Politics', hd: false, watchVia: ['BBC iPlayer', 'Freely'], logo: null },
  { id: 'cbbc', name: 'CBBC', number: 71, network: 'BBC', category: 'Children', hd: true, watchVia: ['BBC iPlayer', 'Freely'], logo: null },
  { id: 'cbeebies', name: 'CBeebies', number: 72, network: 'BBC', category: 'Children', hd: true, watchVia: ['BBC iPlayer', 'Freely'], logo: null },
  
  // ITV Channels
  { id: 'itv1', name: 'ITV1', number: 3, network: 'ITV', category: 'General', hd: true, watchVia: ['ITVX', 'Freely'], logo: null },
  { id: 'itv2', name: 'ITV2', number: 6, network: 'ITV', category: 'Entertainment', hd: true, watchVia: ['ITVX', 'Freely'], logo: null },
  { id: 'itv3', name: 'ITV3', number: 10, network: 'ITV', category: 'Drama', hd: true, watchVia: ['ITVX', 'Freely'], logo: null },
  { id: 'itv4', name: 'ITV4', number: 24, network: 'ITV', category: 'Entertainment', hd: true, watchVia: ['ITVX', 'Freely'], logo: null },
  { id: 'itvbe', name: 'ITVBe', number: 35, network: 'ITV', category: 'Reality', hd: true, watchVia: ['ITVX', 'Freely'], logo: null },
  { id: 'citv', name: 'CITV', number: 73, network: 'ITV', category: 'Children', hd: false, watchVia: ['ITVX'], logo: null },
  
  // Channel 4
  { id: 'channel4', name: 'Channel 4', number: 4, network: 'Channel 4', category: 'General', hd: true, watchVia: ['Channel 4', 'Freely'], logo: null },
  { id: 'e4', name: 'E4', number: 11, network: 'Channel 4', category: 'Entertainment', hd: true, watchVia: ['Channel 4'], logo: null },
  { id: 'more4', name: 'More4', number: 14, network: 'Channel 4', category: 'Factual', hd: false, watchVia: ['Channel 4'], logo: null },
  { id: 'film4', name: 'Film4', number: 15, network: 'Channel 4', category: 'Movies', hd: true, watchVia: ['Channel 4'], logo: null },
  { id: '4seven', name: '4seven', number: 46, network: 'Channel 4', category: 'Entertainment', hd: false, watchVia: ['Channel 4'], logo: null },
  
  // Channel 5
  { id: 'channel5', name: 'Channel 5', number: 5, network: 'Channel 5', category: 'General', hd: true, watchVia: ['My5', 'Freely'], logo: null },
  { id: '5star', name: '5STAR', number: 30, network: 'Channel 5', category: 'Entertainment', hd: false, watchVia: ['My5'], logo: null },
  { id: '5usa', name: '5USA', number: 32, network: 'Channel 5', category: 'Drama', hd: false, watchVia: ['My5'], logo: null },
  { id: '5select', name: '5SELECT', number: 45, network: 'Channel 5', category: 'Documentaries', hd: false, watchVia: ['My5'], logo: null },
  { id: '5action', name: '5ACTION', number: 49, network: 'Channel 5', category: 'Action', hd: false, watchVia: ['My5'], logo: null },
  
  // Sky Channels (Free)
  { id: 'pick', name: 'Pick', number: 11, network: 'Sky', category: 'Entertainment', hd: false, watchVia: ['Freely'], logo: null },
  { id: 'challenge', name: 'Challenge', number: 46, network: 'Sky', category: 'Game Show', hd: false, watchVia: ['Freely'], logo: null },
  
  // UKTV Channels
  { id: 'dave', name: 'Dave', number: 12, network: 'UKTV', category: 'Comedy', hd: true, watchVia: ['U', 'Freely'], logo: null },
  { id: 'drama', name: 'Drama', number: 20, network: 'UKTV', category: 'Drama', hd: false, watchVia: ['U'], logo: null },
  { id: 'w', name: 'W', number: 21, network: 'UKTV', category: 'Entertainment', hd: false, watchVia: ['U'], logo: null },
  { id: 'yesterday', name: 'Yesterday', number: 23, network: 'UKTV', category: 'History', hd: false, watchVia: ['U'], logo: null },
  { id: 'gold', name: 'Gold', number: 41, network: 'UKTV', category: 'Comedy', hd: false, watchVia: ['U'], logo: null },
  
  // Sony Channels
  { id: 'sony-crime', name: 'Sony Crime', number: 156, network: 'Sony', category: 'Crime', hd: false, watchVia: ['Freely'], logo: null },
  { id: 'sony-movies', name: 'Sony Movies', number: 157, network: 'Sony', category: 'Movies', hd: false, watchVia: ['Freely'], logo: null },
  
  // Quest
  { id: 'quest', name: 'Quest', number: 38, network: 'Quest', category: 'Factual', hd: true, watchVia: ['Freely'], logo: null },
  { id: 'quest-red', name: 'Quest Red', number: 64, network: 'Quest', category: 'Lifestyle', hd: false, watchVia: ['Freely'], logo: null },
  
  // News Channels
  { id: 'sky-news', name: 'Sky News', number: 501, network: 'Sky', category: 'News', hd: true, watchVia: ['Freely', 'Sky'], logo: null },
  { id: 'gb-news', name: 'GB News', number: 236, network: 'GB News', category: 'News', hd: true, watchVia: ['Freely'], logo: null },
  
  // Music Channels
  { id: 'box-hits', name: 'Box Hits', number: 185, network: 'The Box', category: 'Music', hd: false, watchVia: null, logo: null },
  { id: 'kerrang', name: 'Kerrang!', number: 186, network: 'The Box', category: 'Music', hd: false, watchVia: null, logo: null },
  { id: 'kiss', name: 'Kiss', number: 187, network: 'The Box', category: 'Music', hd: false, watchVia: null, logo: null },
  { id: 'magic', name: 'Magic', number: 188, network: 'The Box', category: 'Music', hd: false, watchVia: null, logo: null },
  
  // Shopping
  { id: 'qvc', name: 'QVC', number: 16, network: 'QVC', category: 'Shopping', hd: true, watchVia: null, logo: null },
  
  // Regional
  { id: 's4c', name: 'S4C', number: 104, network: 'S4C', category: 'Regional', hd: true, watchVia: ['S4C Clic'], logo: null },
  { id: 'bbc-alba', name: 'BBC Alba', number: 108, network: 'BBC', category: 'Regional', hd: false, watchVia: ['BBC iPlayer'], logo: null }
];

/**
 * Group channels by category for better UI organization
 */
export function groupChannelsByCategory(channels) {
  const groups = {
    'Featured': [],
    'General': [],
    'Entertainment': [],
    'Drama': [],
    'Movies': [],
    'News': [],
    'Sport': [],
    'Documentaries': [],
    'Children': [],
    'Music': [],
    'Other': []
  };
  
  // Add top channels to Featured
  const featuredIds = ['bbc-one', 'bbc-two', 'itv1', 'channel4', 'channel5'];
  
  channels.forEach(channel => {
    if (featuredIds.includes(channel.id)) {
      groups['Featured'].push(channel);
    }
    
    const category = channel.category || 'Other';
    if (groups[category]) {
      groups[category].push(channel);
    } else {
      groups['Other'].push(channel);
    }
  });
  
  // Remove empty categories
  Object.keys(groups).forEach(key => {
    if (groups[key].length === 0) {
      delete groups[key];
    }
  });
  
  return groups;
}

/**
 * Get channel by number (e.g., "BBC One is channel 1")
 */
export function getChannelByNumber(number) {
  return enhancedUkChannels.find(ch => ch.number === number);
}

/**
 * Search channels by name, network, or category
 */
export function searchChannels(query) {
  const normalized = query.toLowerCase().trim();
  return enhancedUkChannels.filter(ch => 
    ch.name.toLowerCase().includes(normalized) ||
    ch.network.toLowerCase().includes(normalized) ||
    ch.category.toLowerCase().includes(normalized)
  );
}
