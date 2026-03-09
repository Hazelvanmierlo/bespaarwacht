import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

// GET /api/setup — creates missing database tables
export async function GET() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase niet geconfigureerd' }, { status: 500 });
  }

  const results: Record<string, string> = {};

  // Check if energie_leads exists
  const { error: checkError } = await supabase
    .from('energie_leads')
    .select('id')
    .limit(1);

  if (checkError?.code === 'PGRST205') {
    // Table doesn't exist — create it via raw SQL using rpc
    // First create the helper function if it doesn't exist
    const { error: fnError } = await supabase.rpc('exec_sql', {
      sql: `SELECT 1`,
    });

    if (fnError) {
      // Can't run raw SQL via REST API — provide manual instructions
      results.energie_leads = 'TABEL ONTBREEKT — run migration-leads.sql in Supabase SQL Editor';
    }
  } else {
    results.energie_leads = 'OK';
  }

  // Check other tables
  for (const table of ['verzekeraars', 'premies', 'users', 'saved_analyses']) {
    const { error } = await supabase.from(table).select('id').limit(1);
    results[table] = error ? `FOUT: ${error.message}` : 'OK';
  }

  // Check env vars
  const envStatus: Record<string, string> = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'ingesteld' : 'ONTBREEKT',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'ingesteld' : 'ONTBREEKT',
    KV_REST_API_URL: process.env.KV_REST_API_URL ? 'ingesteld' : 'ONTBREEKT',
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'ingesteld' : 'ONTBREEKT',
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN ? 'ingesteld' : 'ONTBREEKT',
    WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID ? 'ingesteld' : 'ONTBREEKT',
  };

  return NextResponse.json({ tables: results, env: envStatus });
}
