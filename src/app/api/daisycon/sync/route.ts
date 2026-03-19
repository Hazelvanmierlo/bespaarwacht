import { NextResponse } from 'next/server';
import { syncAffiliateProgrammas } from '@/lib/daisycon/service';

export async function POST(request: Request) {
  // Bescherm met service role key
  const authHeader = request.headers.get('authorization');
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await syncAffiliateProgrammas();
    return NextResponse.json(result);
  } catch (error) {
    console.error('[daisycon/sync] Error:', error);
    return NextResponse.json(
      { error: 'Sync mislukt', details: String(error) },
      { status: 500 },
    );
  }
}
