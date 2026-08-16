/**
 * JustWatch Provider
 * Provides streaming availability information for TV shows and movies
 * Uses the unofficial JustWatch API
 */

const JUSTWATCH_BASE_URL = "https://apis.justwatch.com";
const JUSTWATCH_GRAPHQL_URL = "https://apis.justwatch.com/graphql";

// Country code for UK
const COUNTRY_CODE = "GB";

/**
 * Fetch streaming availability for a show
 * @param {string} showName - Name of the show
 * @param {string} releaseYear - Optional release year for better matching
 * @returns {Promise<Object|null>} Streaming availability data
 */
export async function fetchJustWatchAvailability(showName, releaseYear = null) {
  try {
    // First, search for the show
    const searchUrl = `${JUSTWATCH_BASE_URL}/content/titles/en_${COUNTRY_CODE}/popular`;
    
    const searchParams = {
      body: JSON.stringify({
        query: showName,
        content_types: ["show"],
        ...(releaseYear && { release_year_from: parseInt(releaseYear), release_year_until: parseInt(releaseYear) })
      })
    };

    const searchResponse = await fetch(searchUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      ...searchParams,
      next: { revalidate: 3600 } // Cache for 1 hour
    });

    if (!searchResponse.ok) {
      console.warn(`JustWatch search failed with ${searchResponse.status}`);
      return null;
    }

    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return null;
    }

    const show = searchData.items[0];
    
    // Extract streaming offers
    const streamingServices = [];
    const rentBuyServices = [];
    
    if (show.offers) {
      show.offers.forEach(offer => {
        const service = {
          name: offer.package_short_name || offer.provider_id,
          type: offer.monetization_type,
          quality: offer.presentation_type,
          url: offer.urls?.standard_web || null,
          price: offer.retail_price || null,
          currency: offer.currency || null
        };

        if (offer.monetization_type === "flatrate" || offer.monetization_type === "free") {
          streamingServices.push(service);
        } else if (offer.monetization_type === "rent" || offer.monetization_type === "buy") {
          rentBuyServices.push(service);
        }
      });
    }

    return {
      id: show.id,
      title: show.title,
      releaseYear: show.original_release_year,
      posterPath: show.poster ? `https://images.justwatch.com${show.poster.replace("{profile}", "s718")}` : null,
      backdropPath: show.backdrops?.[0] ? `https://images.justwatch.com${show.backdrops[0].replace("{profile}", "s1920")}` : null,
      streamingServices,
      rentBuyServices,
      totalOffers: (streamingServices.length + rentBuyServices.length),
      justWatchUrl: `https://www.justwatch.com/uk/tv-series/${show.full_path || show.id}`,
      genres: show.genre_ids || [],
      rating: show.tmdb_popularity || null
    };
  } catch (error) {
    console.error("JustWatch availability fetch error:", error);
    return null;
  }
}

/**
 * Fetch streaming providers available in UK
 * @returns {Promise<Array>} List of available streaming providers
 */
export async function fetchJustWatchProviders() {
  try {
    const providersUrl = `${JUSTWATCH_BASE_URL}/content/providers/locale/en_${COUNTRY_CODE}`;
    
    const response = await fetch(providersUrl, {
      headers: {
        Accept: "application/json"
      },
      next: { revalidate: 86400 } // Cache for 24 hours
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    
    return data.map(provider => ({
      id: provider.id,
      name: provider.clear_name,
      shortName: provider.short_name,
      logoPath: provider.icon_url ? `https://images.justwatch.com${provider.icon_url.replace("{profile}", "s100")}` : null,
      monetizationTypes: provider.monetization_types || []
    }));
  } catch (error) {
    console.error("JustWatch providers fetch error:", error);
    return [];
  }
}

/**
 * Enrich schedule items with JustWatch streaming availability
 * @param {Array} scheduleItems - Schedule items to enrich
 * @returns {Promise<Array>} Enriched schedule items
 */
export async function enrichScheduleWithJustWatch(scheduleItems) {
  const enrichedItems = await Promise.all(
    scheduleItems.map(async (item) => {
      // Extract year from startAt or firstAirDate
      let year = null;
      if (item.startAt) {
        year = new Date(item.startAt).getFullYear().toString();
      } else if (item.tmdb?.firstAirDate) {
        year = item.tmdb.firstAirDate.split("-")[0];
      }

      const availability = await fetchJustWatchAvailability(item.show || item.title, year);
      
      if (availability) {
        return {
          ...item,
          justWatch: availability,
          // Add streaming info to top level for easy access
          streamingOn: availability.streamingServices.map(s => s.name),
          isStreaming: availability.streamingServices.length > 0,
          streamingUrl: availability.justWatchUrl
        };
      }
      
      return item;
    })
  );

  return enrichedItems;
}

/**
 * Get popular streaming services in UK
 * @returns {Array} Popular UK streaming services
 */
export function getPopularUkStreamingServices() {
  return [
    { name: "Netflix", icon: "netflix", color: "#E50914" },
    { name: "BBC iPlayer", icon: "bbc-iplayer", color: "#FF1A8C" },
    { name: "Amazon Prime Video", icon: "prime-video", color: "#00A8E1" },
    { name: "Disney+", icon: "disney-plus", color: "#113CCF" },
    { name: "NOW", icon: "now-tv", color: "#00CFFF" },
    { name: "Apple TV+", icon: "apple-tv-plus", color: "#000000" },
    { name: "ITVX", icon: "itv", color: "#FF6B00" },
    { name: "Channel 4", icon: "channel-4", color: "#0094C6" },
    { name: "Paramount+", icon: "paramount-plus", color: "#0064FF" },
    { name: "Discovery+", icon: "discovery-plus", color: "#0066FF" }
  ];
}

/**
 * Health check for JustWatch provider
 * @returns {Promise<boolean>} True if provider is healthy
 */
export async function justWatchHealthCheck() {
  try {
    const response = await fetch(`${JUSTWATCH_BASE_URL}/content/providers/locale/en_${COUNTRY_CODE}`, {
      next: { revalidate: 86400 }
    });
    
    return response.ok;
  } catch {
    return false;
  }
}
