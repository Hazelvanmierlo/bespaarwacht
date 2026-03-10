import { NextResponse } from 'next/server';
import { syncAffiliateProgrammas } from '@/lib/daisycon/service';

/** GET /api/daisycon/urls — retourneert alle tracking URLs als { naam: url } map */
export async function GET() {
  try {
    const result = await syncAffiliateProgrammas();
    const urls: Record<string, string> = {};

    for (const m of result.leveranciers) {
      if (m.status !== 'unmapped' && m.trackingUrl) {
        urls[m.leverancierNaam] = m.trackingUrl;
      }
    }

    return NextResponse.json(urls);
  } catch (error) {
    console.error('[daisycon/urls] Error:', error);
    return NextResponse.json({});
  }
}
