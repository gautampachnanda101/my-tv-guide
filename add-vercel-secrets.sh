#!/bin/bash
# Script to add TMDB secrets to Vercel from .env.local
# Usage: ./add-vercel-secrets.sh

set -e

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
  echo "❌ Error: .env.local file not found"
  echo "Please create .env.local with TMDB_API_KEY and TMDB_API_READ_ACCESS_TOKEN"
  exit 1
fi

# Source the .env.local file to get the variables
echo "📖 Reading credentials from .env.local..."
set -a
source .env.local
set +a

# Validate required variables
if [ -z "$TMDB_API_KEY" ]; then
  echo "❌ Error: TMDB_API_KEY is not set in .env.local"
  exit 1
fi

if [ -z "$TMDB_API_READ_ACCESS_TOKEN" ]; then
  echo "❌ Error: TMDB_API_READ_ACCESS_TOKEN is not set in .env.local"
  exit 1
fi

echo "✅ Found TMDB credentials"
echo ""
echo "🔐 Adding secrets to Vercel..."
echo ""

# Add TMDB_API_KEY to all environments
echo "📦 Adding TMDB_API_KEY to Production..."
vercel env add TMDB_API_KEY production <<EOF
$TMDB_API_KEY
EOF

echo "📦 Adding TMDB_API_KEY to Preview..."
vercel env add TMDB_API_KEY preview <<EOF
$TMDB_API_KEY
EOF

echo "📦 Adding TMDB_API_KEY to Development..."
vercel env add TMDB_API_KEY development <<EOF
$TMDB_API_KEY
EOF

# Add TMDB_API_READ_ACCESS_TOKEN to all environments
echo "📦 Adding TMDB_API_READ_ACCESS_TOKEN to Production..."
vercel env add TMDB_API_READ_ACCESS_TOKEN production <<EOF
$TMDB_API_READ_ACCESS_TOKEN
EOF

echo "📦 Adding TMDB_API_READ_ACCESS_TOKEN to Preview..."
vercel env add TMDB_API_READ_ACCESS_TOKEN preview <<EOF
$TMDB_API_READ_ACCESS_TOKEN
EOF

echo "📦 Adding TMDB_API_READ_ACCESS_TOKEN to Development..."
vercel env add TMDB_API_READ_ACCESS_TOKEN development <<EOF
$TMDB_API_READ_ACCESS_TOKEN
EOF

echo ""
echo "✅ Done! All TMDB secrets added to Vercel"
echo ""
echo "Next steps:"
echo "1. Redeploy: vercel --prod"
echo "2. Or push to trigger automatic deployment"
