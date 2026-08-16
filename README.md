# My TV Guide

Next.js App Router project designed to deploy cleanly on the Vercel Hobby tier.

## Hobby Tier Scope

This project is intentionally scoped for Vercel Hobby (free tier):

- No paid Vercel features required
- No background workers required
- No persistent server-side database required for the current MVP
- Guide data comes from open external sources at request time with caching

This app is a one-stop TV discovery hub that combines:

- live schedule data from a free API source
- UK TV channel catalog
- UK streaming app catalog
- automatic open-source integrations where available

The architecture is provider-based so new countries and API sources can be added quickly.

## Run locally

1. Install dependencies:

	npm install

2. Start development server:

	npm run dev

3. Open http://localhost:3000

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
