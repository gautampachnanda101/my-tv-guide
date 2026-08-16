# Claude Assistant Context

> This file provides additional context for Claude when working with this codebase.

## Quick Reference

**Primary Guidelines**: See [AGENTS.md](./AGENTS.md) for complete AI agent guidelines.

## Project Identity

**My TV Guide** - A free, open-source TV discovery hub for UK (and eventually multi-region) television.

- 🎯 **Goal**: One-stop TV schedule, channel catalog, and streaming app directory
- 🚀 **Deployment**: Vercel Hobby tier (must remain free-tier compatible)
- 🏗️ **Architecture**: Plugin-based, provider-driven, extensible

## Working with This Codebase

### When Adding Features
1. Check if it requires paid Vercel features → **reject or find free alternative**
2. Ensure it works within request-time data fetching model
3. Follow the plugin/provider pattern (don't hardcode region logic)
4. Update relevant docs (FRAMEWORK.md for architecture, README.md for user-facing)

### When Debugging
1. Check provider health: Are APIs responding?
2. Verify environment variables are set correctly
3. Look at Next.js build output for errors
4. Test with `npm run build` locally before deploying

### Code Style Preferences
- **Explicit over clever**: Readable code > terse code
- **Standard formatting**: Let ESLint/Prettier handle it
- **Document complex logic**: Especially provider data transformations
- **No unnecessary dependencies**: Keep bundle size small

## Context for AI Pair Programming

- **Be conservative with dependencies**: This is a Hobby tier project
- **Prioritize performance**: Server-side caching, request deduplication
- **Think mobile-first**: Many users browse TV guides on phones
- **Keep it free**: No features that require paid APIs or Vercel upgrades

## See Also

- [AGENTS.md](./AGENTS.md) - Complete guidelines for all AI agents
- [FRAMEWORK.md](./FRAMEWORK.md) - Plugin architecture documentation
- [README.md](./README.md) - User-facing setup and usage instructions
