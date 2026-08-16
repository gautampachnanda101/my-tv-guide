/**
 * @fileoverview TV Guide API Route (Framework-based)
 * Uses the extensible framework to serve guide data
 */

import { NextResponse } from 'next/server';
import { bootstrap, getRegionManager, isInitialized } from '@/lib/bootstrap';

// Initialize framework on cold start
if (!isInitialized()) {
  bootstrap().catch(error => {
    console.error('[API] Failed to bootstrap framework:', error);
  });
}

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide
 * Query params:
 * - region: Region code (default: 'uk')
 * - query: Search query
 * - date: ISO date string
 */
export async function GET(request) {
  try {
    // Ensure framework is initialized
    if (!isInitialized()) {
      await bootstrap();
    }
    
    const { searchParams } = new URL(request.url);
    const region = searchParams.get('region') || 'uk';
    const query = searchParams.get('query') || '';
    const dateStr = searchParams.get('date');
    
    // Parse date if provided
    const date = dateStr ? new Date(dateStr) : new Date();
    
    // Get region manager
    const regionManager = getRegionManager();
    
    // Check if region is supported
    if (!regionManager.isRegionSupported(region)) {
      return NextResponse.json(
        { 
          error: `Region '${region}' is not supported`,
          supportedRegions: regionManager.getSupportedRegionCodes()
        },
        { status: 400 }
      );
    }
    
    // Fetch guide data
    const guideData = await regionManager.fetchGuideData(region, {
      query,
      date
    });
    
    return NextResponse.json(guideData, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
    
  } catch (error) {
    console.error('[API] Error fetching guide data:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch guide data',
        message: error.message 
      },
      { status: 500 }
    );
  }
}
