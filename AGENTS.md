# AI Agent Guidelines for My TV Guide

## Project Overview

This is a **Next.js 16.3+ App Router** TV Guide application with a plugin-based, multi-region architecture. Deployed on Vercel Hobby tier (free).

## Key Constraints

### Vercel Hobby Tier
- ✅ No paid Vercel features
- ✅ No background workers
- ✅ No persistent server-side database for MVP
- ✅ Guide data fetched at request time with caching

### Technology Stack
- **Next.js**: 16.3.1+ (App Router)
- **React**: 19.1.1
- **Node**: Modern ESM syntax
- **Styling**: CSS Modules (no Tailwind)

## Architecture Patterns

### Plugin-Based System
- Located in `lib/plugins/`
- Each plugin provides: data providers, UI components, region config
- Bootstrap framework before use: `import { bootstrap } from '@/lib/bootstrap'`

### Provider Pattern
- Data sources are **providers** (schedule, channels, metadata)
- Multiple providers per region with priority-based selection
- Each provider must implement: `fetchSchedule()`, `healthCheck()`

### Region Management
- Default region: UK
- Configurable via `NEXT_PUBLIC_DEFAULT_REGION`
- Add new regions by creating plugins

## Coding Conventions

### File Organization
```
app/           → Next.js App Router pages & layouts
lib/           → Framework, plugins, providers, utilities
docs/          → Documentation
```

### Linting
- Run `npm run lint:all` before commits
- ESLint + Stylelint configured
- Accessibility (jsx-a11y) enforced

### Environment Variables
- Prefix client-side vars with `NEXT_PUBLIC_`
- See `.env.example` for all available options
- Cache TTL, regions, feature flags are configurable

## Before Making Changes

1. **Check FRAMEWORK.md** for architecture details
2. **Run builds locally**: `npm run build`
3. **Lint your code**: `npm run lint:all`
4. **Test region switching** if touching providers
5. **Verify Hobby tier compliance** (no paid features)

## Common Tasks

### Adding a New Region
1. Create plugin in `lib/plugins/{region}/`
2. Add providers for schedule/channels/metadata
3. Update `NEXT_PUBLIC_ENABLED_REGIONS`
4. Test bootstrap and data fetching

### Adding a New Provider
1. Implement provider interface
2. Set appropriate priority (0-100)
3. Add health check logic
4. Register in plugin's provider list

### UI Components
- Use CSS Modules for styling
- Follow accessibility guidelines
- Test responsive behavior (mobile-first)

## Next.js 16.3+ Specific Notes

⚠️ **This version may have breaking changes from earlier Next.js versions**
- App Router is the default routing system
- Server Components by default (use `'use client'` when needed)
- Async Server Components are standard
- Check official Next.js docs for API changes

## Reference

See `FRAMEWORK.md` for detailed plugin & provider documentation.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
