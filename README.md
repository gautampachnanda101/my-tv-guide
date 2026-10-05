# My TV Guide

**Your Complete UK TV & Streaming Hub** - Free, open-source TV discovery platform with live schedules, streaming availability, and rich show metadata.

Next.js App Router project designed to deploy cleanly on the Vercel Hobby tier.

## Features

### 🎬 Streaming & TV Hub Capabilities

- **Live TV Schedules** - Freeview listings (XMLTV) plus TVmaze schedules
- **Watch in the guide** - In-browser HLS player for free channels, falling back across mirror streams automatically
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
- No database required for the public guide - guide data comes from open external sources at request time with caching
- Optional: the admin dashboard (`/admin`) and personal sources (`/sources`) use GitHub sign-in (Auth.js) and a free-tier Turso database

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

4. Open http://localhost:3002

## API Integrations

This app integrates with multiple free APIs to provide rich TV and streaming data:

- **TVmaze** - Live TV schedules (free, no key required)
- **TMDB** - Rich metadata, images, cast, ratings (free API key required - 1M requests/month)
- **JustWatch** - Streaming availability across UK services (no key required)

See the complete [API Integrations Guide](docs/API_INTEGRATIONS.md) for setup instructions and usage details.

## Build check

Run this before deploying:

```bash
npm run build
```

## Lint checks

Run these while editing UI code:

```bash
npm run lint
npm run lint:css
npm run lint:all
```

## API

- `GET /api/guide?region=uk&q=football`

Response includes `liveNow`, `upcoming`, `tvChannels`, `streamingApps`, and `sourceStatus`.

## Automatic Open Integrations

The UK provider auto-integrates these sources:

- TVMaze (Open API JSON) for live schedule windows
- IPTV-org datasets (channels, streams, feeds, logos) for channel coverage, playable streams, and logos
- Freeview XMLTV feed (open standard) for UK listings

Default free source URLs baked into the app:

- TVMaze UK schedule API: https://api.tvmaze.com/schedule?country=GB
- IPTV-org channels JSON: https://iptv-org.github.io/api/channels.json
- IPTV-org streams JSON: https://iptv-org.github.io/api/streams.json
- IPTV-org feeds JSON: https://iptv-org.github.io/api/feeds.json
- IPTV-org logos JSON: https://iptv-org.github.io/api/logos.json
- Default UK XMLTV feed: https://raw.githubusercontent.com/dp247/Freeview-EPG/master/epg.xml

Each IPTV-org URL can be overridden with `IPTV_ORG_CHANNELS_URL`, `IPTV_ORG_STREAMS_URL`, `IPTV_ORG_FEEDS_URL`, and `IPTV_ORG_LOGOS_URL`.

Optional XMLTV override configuration:

```bash
OPEN_XMLTV_UK_URL=https://example.com/guide.xml
```

Some UK streams are geo-restricted and only play from UK networks.

For local setup, copy values from .env.example into .env.local.

For Vercel, add OPEN_XMLTV_UK_URL in Project Settings -> Environment Variables only if you want to override the default UK XMLTV feed.

## Extending to more regions

1. Add a channel/app catalog under `lib/regions/<region>/catalog.js`.
2. Define a `<REGION>_REGION_CONFIG` (see `UK_REGION_CONFIG` in `lib/providers/uk/index.js`): `code`, `localChannels`, `streamingApps`, `fetchSchedule`, `fetchXmlTvSchedule`, `getFallbackWatchVia`.
3. Register it in `lib/providers/index.js` with `createRegionProvider(<REGION>_REGION_CONFIG)`. You don't need a separate provider function.

Regions without their own config fall back to the worldwide guide (IPTV-org channels plus TVmaze/XMLTV schedules by country).

## Deploy on Vercel Hobby

1. Push this repo to GitHub.
2. Import the repository in Vercel.
3. Framework preset should auto-detect as Next.js.
4. Click Deploy.

No paid Vercel features are required for this app.

## Sign-in and admin (optional)

GitHub sign-in powers the admin dashboard and personal sources. To enable it, set:

```bash
AUTH_SECRET=            # required in production: openssl rand -base64 32
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
ADMIN_GITHUB_LOGIN=     # the one GitHub login allowed into /admin
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

In local development, the app runs without these (sign-in just won't work). Don't use local SQLite file storage on Vercel serverless; use Turso (or another remote free-tier database).
