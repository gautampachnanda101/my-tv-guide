# My TV Guide

**Your Complete UK TV & Streaming Hub** - Free, open-source TV discovery platform with live schedules, streaming availability, and rich show metadata.

Next.js App Router project designed to deploy cleanly on the Vercel Hobby tier.

## Features

### 🎬 Streaming & TV Hub Capabilities

- **Live TV Schedules** - Real-time schedule data from TVmaze
- **Streaming Availability** - Find where to watch shows across 10+ UK streaming services (powered by JustWatch)
- **Rich Metadata** - High-quality images, cast info, ratings from TMDB (The Movie Database)
- **UK Channel Catalog** - Comprehensive list of UK TV channels
- **Streaming App Directory** - Browse all available streaming services
- **Smart Search** - Find shows, channels, and streaming apps
- **What's On Now** - Live content currently broadcasting
- **Upcoming Shows** - See what's coming next

### 🚀 Technical Features

- Provider-based architecture for easy expansion
- Automatic data enrichment from multiple APIs
- Request-time data fetching with intelligent caching
- Graceful degradation when APIs are unavailable
- Mobile-first responsive design

## Hobby Tier Scope

This project is intentionally scoped for Vercel Hobby (free tier):

- No paid Vercel features required
- No background workers required
- No persistent server-side database required for the current MVP
- Guide data comes from open external sources at request time with caching

The architecture is provider-based so new countries and API sources can be added quickly.

## Run locally

1. Install dependencies:

	```bash
	npm install
	```

2. (Optional) Configure TMDB API for enhanced metadata:
   - Sign up at https://www.themoviedb.org/signup
   - Get API key at https://www.themoviedb.org/settings/api
   - Create `.env.local` and add:
     ```
     TMDB_API_KEY=your_api_key_here
     ```
   - See [API Integrations Guide](docs/API_INTEGRATIONS.md) for details

3. Start development server:

	```bash
	npm run dev
	```

4. Open http://localhost:3000

## API Integrations

This app integrates with multiple free APIs to provide rich TV and streaming data:

- **TVmaze** - Live TV schedules (free, no key required)
- **TMDB** - Rich metadata, images, cast, ratings (free API key required - 1M requests/month)
- **JustWatch** - Streaming availability across UK services (no key required)

See the complete [API Integrations Guide](docs/API_INTEGRATIONS.md) for setup instructions and usage details.

## Build check

Run this before deploying:

npm run build

## Lint checks

Run these while editing UI code:

npm run lint
npm run lint:css
npm run lint:all

## API

- `GET /api/guide?region=uk&q=football`

Response includes `liveNow`, `upcoming`, `tvChannels`, `streamingApps`, and `sourceStatus`.

## Automatic Open Integrations

The UK provider auto-integrates these sources:

- TVMaze (Open API JSON) for live schedule windows
- IPTV-org channels dataset (Open Dataset JSON) for broad channel coverage
- XMLTV feed (open standard) when configured

Default free source URLs baked into the app:

- TVMaze UK schedule API: https://api.tvmaze.com/schedule?country=GB
- IPTV-org channels JSON: https://iptv-org.github.io/api/channels.json
- Default UK XMLTV feed: https://raw.githubusercontent.com/dp247/Freeview-EPG/master/epg.xml

Additional optional public datasets you can ingest later:

- IPTV-org feeds JSON: https://iptv-org.github.io/api/feeds.json
- IPTV-org logos JSON: https://iptv-org.github.io/api/logos.json
- IPTV-org streams dataset: https://iptv-org.github.io/api/streams.json
- IPTV-org UK playlist (M3U): https://iptv-org.github.io/iptv/countries/gb.m3u

Optional XMLTV override configuration:

OPEN_XMLTV_UK_URL=https://example.com/guide.xml

For local setup, copy values from .env.example into .env.local.

For Vercel, add OPEN_XMLTV_UK_URL in Project Settings -> Environment Variables only if you want to override the default UK XMLTV feed.

## Extending to more regions

1. Add a new region catalog under `lib/regions/<region>/catalog.js`.
2. Add a region provider under `lib/providers/<region>/index.js`.
3. Register it in `lib/providers/index.js`.

## Deploy on Vercel Hobby

1. Push this repo to GitHub.
2. Import the repository in Vercel.
3. Framework preset should auto-detect as Next.js.
4. Click Deploy.

No paid Vercel features are required for this app.

## Optional Profiles on Hobby

If you later add user profiles/login and want to stay free-tier friendly:

- Do not use local SQLite file storage on Vercel serverless
- Use a remote free-tier database (for example Turso/libSQL, Neon, or Supabase)
- Keep auth simple (email/password credentials) and avoid paid identity providers for MVP
