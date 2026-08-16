# API Setup Guide - My TV Guide

This guide will walk you through setting up API keys for your TV Guide application, step by step.

## Table of Contents

1. [YouTube Data API v3](#1-youtube-data-api-v3) ✅ Already Integrated
2. [The Movie Database (TMDB)](#2-the-movie-database-tmdb) - Recommended
3. [TVmaze API](#3-tvmaze-api) - Free, No Key Required
4. [Environment Variables Setup](#environment-variables-setup)
5. [Testing Your Setup](#testing-your-setup)
6. [Troubleshooting](#troubleshooting)

---

## 1. YouTube Data API v3

**Purpose**: Access free movies from YouTube  
**Cost**: Free (10,000 quota units/day)  
**Status**: ✅ Already integrated in this app

### Step 1: Create Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Accept the terms of service if prompted

### Step 2: Create a New Project

1. Click the **project dropdown** at the top of the page
2. Click **"New Project"**
3. Enter project details:
   - **Project name**: `my-tv-guide` (or any name you prefer)
   - **Organization**: Leave as default (No organization)
4. Click **"Create"**
5. Wait 10-30 seconds for project creation

### Step 3: Enable YouTube Data API v3

1. Make sure your new project is selected (check top navigation bar)
2. Click the **☰ hamburger menu** → **"APIs & Services"** → **"Library"**
3. In the search box, type: `YouTube Data API v3`
4. Click on **"YouTube Data API v3"** from the results
5. Click the blue **"Enable"** button
6. Wait for the API to be enabled (~5 seconds)

### Step 4: Create API Credentials

1. Click **"Create Credentials"** (should appear after enabling)
   - **Or**: Go to **"APIs & Services"** → **"Credentials"** from the menu
2. Click **"+ Create Credentials"** → **"API Key"**
3. A popup will show your new API key
4. **Copy the API key** (looks like: `AIzaSyC...abc123`)
5. *(Optional but recommended)* Click **"Restrict Key"** to secure it:
   - Under **"API restrictions"**, select **"Restrict key"**
   - Check only **"YouTube Data API v3"**
   - Click **"Save"**

### Step 5: Add to Your App

1. Open your project folder in VS Code
2. Create or edit `.env.local` file:
   ```bash
   # YouTube Data API v3
   YOUTUBE_API_KEY=AIzaSyC...your_key_here
   ```
3. Save the file
4. Restart your dev server: `npm run dev`
5. Visit: http://localhost:3001/youtube-movies

**✅ You're done!** Free movies should now load from YouTube.

---

## 2. The Movie Database (TMDB)

**Purpose**: Get movie/TV metadata (posters, descriptions, ratings, cast)  
**Cost**: Free (no credit card required)  
**Use case**: Enrich your TV guide with rich metadata

### Step 1: Create TMDB Account

1. Go to [The Movie Database](https://www.themoviedb.org/)
2. Click **"Join TMDB"** (top right)
3. Fill in the registration form:
   - Username
   - Email
   - Password
   - Accept terms
4. Click **"Sign Up"**
5. Check your email and **verify your account**

### Step 2: Request API Access

1. Log in to TMDB
2. Click your **profile icon** (top right) → **"Settings"**
3. In the left sidebar, click **"API"**
4. Click **"Request an API Key"**
5. Choose **"Developer"** option
6. Fill in the application form:
   - **Type of Use**: Personal / Educational / Website
   - **Application Name**: `My TV Guide`
   - **Application URL**: `http://localhost:3001` (for now)
   - **Application Summary**: `Personal TV guide application for browsing TV schedules and movies`
7. Accept the terms and submit

### Step 3: Get Your API Key

1. After approval (usually instant), you'll see your API key
2. Copy the **API Key (v3 auth)** value
3. It looks like: `1a2b3c4d5e6f7g8h9i0j...`

### Step 4: Add to Your App

```bash
# In .env.local
TMDB_API_KEY=your_tmdb_api_key_here
```

**Test it**:
```bash
# In your terminal
curl "https://api.themoviedb.org/3/movie/550?api_key=YOUR_KEY"
```

You should get data about the movie "Fight Club".

---

## 3. TVmaze API

**Purpose**: Get TV show schedules, episode info, and show details  
**Cost**: Free, no API key required!  
**Rate limit**: 20 requests per 10 seconds

### Step 1: No Registration Needed!

TVmaze is **completely free** and requires **no API key**. Just start using it!

### Step 2: Test the API

Try these example requests:

```bash
# Get today's TV schedule
curl "https://api.tvmaze.com/schedule?country=GB&date=2026-08-16"

# Search for a TV show
curl "https://api.tvmaze.com/search/shows?q=friends"

# Get show information
curl "https://api.tvmaze.com/shows/431"
```

### Step 3: Use in Your App

No configuration needed! Just make fetch requests:

```javascript
// Example: Get UK TV schedule for today
const response = await fetch('https://api.tvmaze.com/schedule?country=GB');
const schedule = await response.json();
```

**Important**: Respect the rate limit (20 requests per 10 seconds)

---

## 4. Additional APIs (Optional)

### OMDB API (Alternative to TMDB)

**Purpose**: Movie/TV metadata  
**Cost**: Free tier (1,000 requests/day) or $1/month for premium

1. Go to [OMDb API](http://www.omdbapi.com/apikey.aspx)
2. Choose **FREE** or **Patreon** tier
3. Enter your email
4. Check email for activation link
5. Activate and receive your API key

```bash
# In .env.local
OMDB_API_KEY=your_omdb_key
```

---

## Environment Variables Setup

### Complete .env.local Template

Create a `.env.local` file in your project root:

```bash
# ==============================================
# MY TV GUIDE - API CONFIGURATION
# ==============================================
# Copy this file to .env.local and fill in your keys
# NEVER commit .env.local to version control!

# ---------------------------------------------
# YouTube Data API v3
# ---------------------------------------------
# Get from: https://console.cloud.google.com/
# Free tier: 10,000 quota units/day
YOUTUBE_API_KEY=

# ---------------------------------------------
# The Movie Database (TMDB)
# ---------------------------------------------
# Get from: https://www.themoviedb.org/settings/api
# Provides: Movie/TV metadata, posters, ratings
TMDB_API_KEY=

# ---------------------------------------------
# OMDB API (Optional alternative to TMDB)
# ---------------------------------------------
# Get from: http://www.omdbapi.com/apikey.aspx
# Free tier: 1,000 requests/day
OMDB_API_KEY=

# ---------------------------------------------
# App Configuration
# ---------------------------------------------
# Default region for TV schedules
NEXT_PUBLIC_DEFAULT_REGION=uk

# Enabled regions (comma-separated)
NEXT_PUBLIC_ENABLED_REGIONS=uk

# Cache duration in milliseconds (1 hour default)
NEXT_PUBLIC_CACHE_TTL=3600000
```

### Security Checklist

- ✅ `.env.local` is in `.gitignore` (it should be!)
- ✅ Never share API keys publicly
- ✅ Use different keys for development and production
- ✅ Restrict keys by domain/IP when possible
- ✅ Monitor API usage regularly

---

## Testing Your Setup

### 1. Check Environment Variables Loaded

Create a test page: `app/test-env/page.js`

```javascript
export default function TestEnv() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>Environment Variables Test</h1>
      <ul>
        <li>
          YouTube API: {process.env.YOUTUBE_API_KEY ? '✅ Configured' : '❌ Missing'}
        </li>
        <li>
          TMDB API: {process.env.TMDB_API_KEY ? '✅ Configured' : '❌ Missing'}
        </li>
      </ul>
      <p><strong>Note:</strong> Restart dev server after changing .env.local</p>
    </div>
  );
}
```

Visit: http://localhost:3001/test-env

### 2. Test YouTube Movies

Visit: http://localhost:3001/youtube-movies

**Expected**:
- ✅ Movies load from YouTube
- ✅ Genres filter works
- ✅ Clicking play opens video

**If you see sample data**: API key not configured yet

### 3. Test API Directly

```bash
# Test YouTube API
curl "https://www.googleapis.com/youtube/v3/search?part=snippet&q=free+movies&type=video&maxResults=5&key=YOUR_YOUTUBE_KEY"

# Test TMDB API
curl "https://api.themoviedb.org/3/configuration?api_key=YOUR_TMDB_KEY"
```

---

## Troubleshooting

### YouTube API Issues

#### Problem: "API key not valid"
**Solution**:
1. Check key is copied correctly (no extra spaces)
2. Make sure YouTube Data API v3 is enabled
3. Wait 1-2 minutes after creating the key

#### Problem: "Quota exceeded"
**Solution**:
1. You've hit the daily limit (10,000 units)
2. Wait until midnight Pacific Time for reset
3. Increase cache duration to reduce API calls
4. Consider upgrading quota (paid)

#### Problem: "Videos not playing"
**Solution**:
1. Some videos disable embedding
2. Click "Watch on YouTube" button instead
3. Check browser console for CORS errors

### TMDB API Issues

#### Problem: "Invalid API key"
**Solution**:
1. Make sure you copied the v3 API key (not v4)
2. Check for extra spaces in .env.local
3. Restart your dev server

#### Problem: "Request limit reached"
**Solution**:
1. TMDB free tier: 40 requests per 10 seconds
2. Add delays between requests
3. Implement caching

### General Issues

#### Problem: Environment variables not loading
**Solution**:
1. File must be named exactly `.env.local`
2. File must be in project root (same level as package.json)
3. **Restart dev server** after any changes
4. Check for typos in variable names

#### Problem: "Module not found" errors
**Solution**:
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

#### Problem: Changes not appearing
**Solution**:
1. Hard refresh browser: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. Clear browser cache
3. Restart dev server: `npm run dev`

---

## Best Practices

### 1. API Key Rotation

Rotate your API keys every 90 days for security:
1. Create a new key
2. Update .env.local
3. Test thoroughly
4. Delete old key

### 2. Monitor Usage

Check your API usage regularly:

- **YouTube**: [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Dashboard
- **TMDB**: No usage dashboard, but mind the rate limits
- **TVmaze**: Check their [status page](https://www.tvmaze.com/api)

### 3. Error Handling

Always handle API errors gracefully:

```javascript
try {
  const response = await fetch(`/api/youtube-movies`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const data = await response.json();
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
}
```

### 4. Caching Strategy

Reduce API calls with smart caching:

```javascript
// In your provider
const CACHE_DURATION = 3600000; // 1 hour
const cache = {
  data: null,
  timestamp: 0
};

function getCachedData() {
  const now = Date.now();
  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    return cache.data;
  }
  return null;
}
```

---

## Production Deployment (Vercel)

### Step 1: Add Environment Variables to Vercel

1. Go to your project on [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Settings"** → **"Environment Variables"**
3. Add each variable:
   - **Name**: `YOUTUBE_API_KEY`
   - **Value**: Your actual API key
   - **Environments**: Production, Preview, Development
4. Click **"Save"**
5. Repeat for all API keys

### Step 2: Redeploy

1. Push your code to GitHub
2. Vercel will automatically redeploy
3. **Or** manually redeploy from Vercel dashboard

### Step 3: Update API Restrictions

For production, restrict your API keys:

**YouTube API**:
1. Go to Google Cloud Console → Credentials
2. Edit your API key
3. Under **"Application restrictions"**:
   - Choose **"HTTP referrers"**
   - Add: `https://your-domain.vercel.app/*`
4. Save

**TMDB API**:
- No domain restrictions available (use rate limiting)

---

## Quick Reference

### API Documentation Links

- [YouTube Data API](https://developers.google.com/youtube/v3/docs)
- [TMDB API](https://developers.themoviedb.org/3)
- [TVmaze API](https://www.tvmaze.com/api)
- [OMDB API](http://www.omdbapi.com/)

### Rate Limits Summary

| API | Free Tier Limit | Reset Period |
|-----|-----------------|--------------|
| YouTube | 10,000 units/day | Daily (midnight PT) |
| TMDB | 40 requests/10 sec | Rolling |
| TVmaze | 20 requests/10 sec | Rolling |
| OMDB Free | 1,000 requests/day | Daily |

### Support & Help

- **YouTube API Issues**: [Stack Overflow - YouTube API](https://stackoverflow.com/questions/tagged/youtube-api)
- **TMDB Issues**: [TMDB Forums](https://www.themoviedb.org/talk)
- **General**: Check the [troubleshooting section](#troubleshooting) above

---

## What's Next?

Now that you have your APIs configured:

1. ✅ Test YouTube movies: http://localhost:3001/youtube-movies
2. 📺 Integrate TMDB for richer metadata
3. 🎬 Add TV show schedules with TVmaze
4. 🚀 Deploy to Vercel
5. 📱 Build more features!

**Need help?** Check the documentation:
- [YouTube Integration Guide](./YOUTUBE_INTEGRATION.md)
- [Main Framework Documentation](../FRAMEWORK.md)
- [README](../README.md)

---

**Last Updated**: August 2026  
**Version**: 1.0.0
