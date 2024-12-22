import { NextResponse } from 'next/server';

// Rate limiting state
interface RateLimitState {
  hits: number;
  period: number;
  restricted: number;
  lastReset: number;
}

let rateLimitState: RateLimitState = {
  hits: 0,
  period: 5,
  restricted: 0,
  lastReset: Date.now()
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const response = await fetch(`https://www.pathofexile.com/api/trade2/search/${body.league}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'OAuth poe-item-checker/1.0.0',
        'Accept': '*/*',
      },
      body: JSON.stringify(body.query),
    });

    // Parse rate limit headers
    const policy = response.headers.get('X-Rate-Limit-Policy');
    const rules = response.headers.get('X-Rate-Limit-Rules')?.split(',') || [];

    rules.forEach(rule => {
      const limit = response.headers.get(`X-Rate-Limit-${rule}`)?.split(':').map(Number);
      const state = response.headers.get(`X-Rate-Limit-${rule}-State`)?.split(':').map(Number);

      if (limit && state) {
        rateLimitState = {
          hits: state[0],
          period: limit[1],
          restricted: state[2],
          lastReset: Date.now()
        };
      }
    });

    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '10');
        return NextResponse.json({
          error: 'Rate limit exceeded',
          details: `Please wait ${retryAfter} seconds`,
          retryAfter
        }, { status: 429 });
      }

      if (response.status === 403) {
        console.error('API Access Forbidden:', {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        return NextResponse.json({
          error: 'API Access Forbidden',
          details: 'The PoE Trade API is currently blocking requests from this service. Please try using the official trade site directly.',
        }, { status: 403 });
      }

      return NextResponse.json({
        error: `API Error: ${response.status}`,
        details: response.statusText
      }, { status: response.status });
    }

    const data = await response.json();
    if (!data.id) {
      console.error('Invalid API Response:', data);
      return NextResponse.json({
        error: 'Invalid API Response',
        details: 'The API response did not contain a search ID'
      }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error with trade search:', error);
    return NextResponse.json({
      error: 'Failed to perform trade search',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}
