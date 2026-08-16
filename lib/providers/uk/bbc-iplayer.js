/**
 * BBC iPlayer Schedule Provider
 * Fetches schedule data from BBC's public feeds
 */

const BBC_CHANNELS = [
  { id: "bbc_one", name: "BBC One", network: "BBC" },
  { id: "bbc_two", name: "BBC Two", network: "BBC" },
  { id: "bbc_three", name: "BBC Three", network: "BBC" },
  { id: "bbc_four", name: "BBC Four", network: "BBC" },
  { id: "bbc_news", name: "BBC News", network: "BBC" },
  { id: "cbbc", name: "CBBC", network: "BBC" },
  { id: "cbeebies", name: "CBeebies", network: "BBC" }
];

export async function fetchBbcSchedule(date = new Date()) {
  const schedule = [];
  
  // BBC provides a limited public schedule via their website
  // For a production app, you would integrate with BBC's official APIs
  // This is a placeholder that demonstrates the structure
  
  try {
    // In production, fetch from BBC's schedule API
    // For now, we'll return structured mock data that represents BBC's typical schedule
    
    const dateStr = date.toISOString().split('T')[0];
    
    for (const channel of BBC_CHANNELS) {
      // Add sample programmes for each BBC channel
      const programmes = generateBbcSampleProgrammes(channel, date);
      schedule.push(...programmes);
    }
    
    return schedule;
  } catch (error) {
    console.error('BBC schedule fetch error:', error);
    return [];
  }
}

function generateBbcSampleProgrammes(channel, baseDate) {
  // This function generates representative programme data
  // In production, this would be replaced with actual API calls
  
  const programmes = [];
  const startHour = 6; // Start at 6 AM
  const endHour = 26; // Go to 2 AM next day
  
  const sampleShows = {
    'BBC One': [
      { title: 'Breakfast', duration: 195, genres: ['News', 'Magazine'] },
      { title: 'Morning Live', duration: 60, genres: ['Magazine'] },
      { title: 'Homes Under the Hammer', duration: 60, genres: ['Property'] },
      { title: 'Bargain Hunt', duration: 45, genres: ['Antiques'] },
      { title: 'BBC News', duration: 30, genres: ['News'] },
      { title: 'Regional News', duration: 30, genres: ['News'] },
      { title: 'Pointless', duration: 45, genres: ['Game Show'] },
      { title: 'The One Show', duration: 60, genres: ['Magazine'] },
      { title: 'EastEnders', duration: 30, genres: ['Drama', 'Soap'] },
      { title: 'News at Ten', duration: 30, genres: ['News'] },
      { title: 'Question Time', duration: 60, genres: ['Politics'] }
    ],
    'BBC Two': [
      { title: 'Gardeners\' World', duration: 60, genres: ['Gardening'] },
      { title: 'Coast', duration: 60, genres: ['Documentary'] },
      { title: 'Mastermind', duration: 30, genres: ['Game Show'] },
      { title: 'University Challenge', duration: 30, genres: ['Game Show'] },
      { title: 'Newsnight', duration: 50, genres: ['News', 'Politics'] }
    ],
    'BBC Three': [
      { title: 'RuPaul\'s Drag Race UK', duration: 60, genres: ['Reality'] },
      { title: 'Fleabag', duration: 30, genres: ['Comedy', 'Drama'] },
      { title: 'Normal People', duration: 30, genres: ['Drama'] }
    ],
    'BBC Four': [
      { title: 'Storyville', duration: 90, genres: ['Documentary'] },
      { title: 'Arena', duration: 60, genres: ['Arts'] },
      { title: 'Horizon', duration: 60, genres: ['Science', 'Documentary'] }
    ]
  };
  
  const shows = sampleShows[channel.name] || sampleShows['BBC One'];
  
  let currentTime = new Date(baseDate);
  currentTime.setHours(startHour, 0, 0, 0);
  
  let showIndex = 0;
  while (currentTime.getHours() < endHour || (currentTime.getHours() < 6 && endHour > 24)) {
    const show = shows[showIndex % shows.length];
    const startAt = new Date(currentTime);
    const endAt = new Date(currentTime.getTime() + show.duration * 60 * 1000);
    
    programmes.push({
      id: `bbc-${channel.id}-${startAt.getTime()}`,
      show: show.title,
      channel: channel.name,
      network: channel.network,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      runtime: show.duration,
      genres: show.genres,
      summary: `${show.title} on ${channel.name}`,
      image: null,
      watchVia: ['BBC iPlayer', 'Freely']
    });
    
    currentTime = endAt;
    showIndex++;
  }
  
  return programmes;
}
