/**
 * Sample Bollywood content for demonstration
 * In production, this would come from Zee5, Hotstar, Netflix APIs
 */

export function getBollywoodShows() {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return [
    {
      id: "zee5-kundali-bhagya",
      title: "Kundali Bhagya",
      show: "Kundali Bhagya",
      channel: "Zee TV",
      startAt: new Date(today.getTime() + 19 * 60 * 60 * 1000).toISOString(), // 7 PM
      endAt: new Date(today.getTime() + 19.5 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      genres: ["Drama", "Bollywood", "Romance"],
      watchVia: ["Zee5"],
      description: "Indian drama series about love and family relationships",
      language: "Hindi"
    },
    {
      id: "zee5-kumkum-bhagya",
      title: "Kumkum Bhagya",
      show: "Kumkum Bhagya",
      channel: "Zee TV",
      startAt: new Date(today.getTime() + 20 * 60 * 60 * 1000).toISOString(), // 8 PM
      endAt: new Date(today.getTime() + 20.5 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      genres: ["Drama", "Bollywood", "Romance"],
      watchVia: ["Zee5"],
      description: "Popular Indian television drama",
      language: "Hindi"
    },
    {
      id: "hotstar-anupamaa",
      title: "Anupamaa",
      show: "Anupamaa",
      channel: "Star Plus",
      startAt: new Date(today.getTime() + 21 * 60 * 60 * 1000).toISOString(), // 9 PM
      endAt: new Date(today.getTime() + 21.5 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      genres: ["Drama", "Bollywood", "Family"],
      watchVia: ["Hotstar", "Disney+"],
      description: "Story of a woman's journey to self-discovery",
      language: "Hindi"
    },
    {
      id: "netflix-sacred-games",
      title: "Sacred Games",
      show: "Sacred Games",
      channel: "Netflix Originals",
      startAt: new Date(today.getTime() + 22 * 60 * 60 * 1000).toISOString(), // 10 PM
      endAt: new Date(today.getTime() + 23 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      genres: ["Thriller", "Bollywood", "Crime"],
      watchVia: ["Netflix"],
      description: "A gripping crime thriller set in Mumbai",
      language: "Hindi"
    },
    {
      id: "prime-mirzapur",
      title: "Mirzapur",
      show: "Mirzapur",
      channel: "Prime Video Originals",
      startAt: new Date(today.getTime() + 23 * 60 * 60 * 1000).toISOString(), // 11 PM
      endAt: new Date(today.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      genres: ["Action", "Bollywood", "Crime"],
      watchVia: ["Prime Video"],
      description: "Crime thriller series from the heartland of India",
      language: "Hindi"
    },
    {
      id: "zee5-bhabi-ji",
      title: "Bhabi Ji Ghar Par Hai",
      show: "Bhabi Ji Ghar Par Hai",
      channel: "And TV",
      startAt: new Date(today.getTime() + 22.5 * 60 * 60 * 1000).toISOString(), // 10:30 PM
      endAt: new Date(today.getTime() + 23 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      genres: ["Comedy", "Bollywood"],
      watchVia: ["Zee5"],
      description: "Popular Indian sitcom",
      language: "Hindi"
    },
    {
      id: "hotstar-yeh-rishta",
      title: "Yeh Rishta Kya Kehlata Hai",
      show: "Yeh Rishta Kya Kehlata Hai",
      channel: "Star Plus",
      startAt: new Date(today.getTime() + 21.5 * 60 * 60 * 1000).toISOString(), // 9:30 PM
      endAt: new Date(today.getTime() + 22 * 60 * 60 * 1000).toISOString(),
      duration: 30,
      genres: ["Drama", "Bollywood", "Family", "Romance"],
      watchVia: ["Hotstar", "Disney+"],
      description: "Long-running family drama series",
      language: "Hindi"
    },
    {
      id: "netflix-delhi-crime",
      title: "Delhi Crime",
      show: "Delhi Crime",
      channel: "Netflix Originals",
      startAt: new Date(today.getTime() + 20.5 * 60 * 60 * 1000).toISOString(), // 8:30 PM
      endAt: new Date(today.getTime() + 21.5 * 60 * 60 * 1000).toISOString(),
      duration: 60,
      genres: ["Crime", "Bollywood", "Drama"],
      watchVia: ["Netflix"],
      description: "Award-winning police procedural drama",
      language: "Hindi"
    }
  ];
}

export function getBollywoodMovies() {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  return [
    {
      id: "zee5-ddlj",
      title: "Dilwale Dulhania Le Jayenge",
      show: "Dilwale Dulhania Le Jayenge",
      channel: "Zee Cinema",
      startAt: new Date(tomorrow.getTime() + 14 * 60 * 60 * 1000).toISOString(), // 2 PM tomorrow
      endAt: new Date(tomorrow.getTime() + 17 * 60 * 60 * 1000).toISOString(),
      duration: 180,
      genres: ["Romance", "Bollywood", "Classic"],
      watchVia: ["Zee5", "Prime Video"],
      description: "Iconic Bollywood romantic film",
      language: "Hindi",
      releaseYear: 1995
    },
    {
      id: "netflix-3-idiots",
      title: "3 Idiots",
      show: "3 Idiots",
      channel: "Netflix",
      startAt: new Date(tomorrow.getTime() + 18 * 60 * 60 * 1000).toISOString(), // 6 PM tomorrow
      endAt: new Date(tomorrow.getTime() + 21 * 60 * 60 * 1000).toISOString(),
      duration: 170,
      genres: ["Comedy", "Bollywood", "Drama"],
      watchVia: ["Netflix", "Prime Video"],
      description: "Comedy-drama about engineering students",
      language: "Hindi",
      releaseYear: 2009
    }
  ];
}
