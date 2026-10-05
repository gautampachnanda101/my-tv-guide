/**
 * @fileoverview Framework Stats API Route
 * Provides information about loaded plugins, providers, and regions
 */

import { NextResponse } from 'next/server';
import { bootstrap, getFrameworkStats, isInitialized } from '@/lib/bootstrap';
import { getProviderRegistry } from '@/lib/framework';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Exposes provider configuration status - off unless explicitly enabled
  // (the flag documented in .env.example but previously never read).
  if (process.env.NEXT_PUBLIC_ENABLE_STATS !== "true") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Ensure framework is initialized
    if (!isInitialized()) {
      await bootstrap();
    }
    
    const stats = getFrameworkStats();
    const registry = getProviderRegistry();
    
    // Get detailed provider information
    const providers = registry.getAll().map(p => ({
      id: p.id,
      name: p.name,
      region: p.region,
      type: p.type,
      priority: p.priority,
      enabled: p.enabled,
      hasSchedule: !!p.fetchSchedule,
      hasChannels: !!p.fetchChannels,
      hasApps: !!p.fetchApps,
      hasHealthCheck: !!p.healthCheck
    }));
    
    // Get configuration status
    const configStatus = {};
    const regions = Array.from(new Set(providers.map(p => p.region)));
    for (const region of regions) {
      configStatus[region] = registry.checkConfiguration(region);
    }
    
    return NextResponse.json({
      framework: stats,
      providers,
      configStatus,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('[Stats API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats', message: error.message },
      { status: 500 }
    );
  }
}
