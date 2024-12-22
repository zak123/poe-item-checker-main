import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h

async function readCache() {
  try {
    const cachePath = path.join(process.cwd(), 'app', 'cache', 'stats.json');
    const cacheContent = await fs.readFile(cachePath, 'utf-8');
    return JSON.parse(cacheContent);
  } catch (error) {
    console.error('Error reading cache:', error);
    return null;
  }
}

export async function GET() {
  try {
    const cache = await readCache();
    const now = new Date().getTime();

    if (cache && cache.lastUpdated) {
      const cacheAge = now - new Date(cache.lastUpdated).getTime();
      if (cacheAge < CACHE_DURATION) {
        return NextResponse.json(cache.data);
      }
    }

    const response = await fetch('https://www.pathofexile.com/api/trade2/data/stats', {
      headers: {
        'User-Agent': 'OAuth poe-item-checker/1.0.0 (contact: sanzodown@hotmail.fr)',
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // If API call fails and we have cache, use it regardless of age
      if (cache && cache.data) {
        console.log('Using expired cache due to API failure');
        return NextResponse.json(cache.data);
      }
      throw new Error(`Failed to fetch stats: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching PoE stats:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
