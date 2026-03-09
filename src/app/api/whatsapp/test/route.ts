import { NextRequest, NextResponse } from 'next/server';

// POST /api/whatsapp/test — stuur een testbericht naar een telefoonnummer
export async function POST(req: NextRequest) {
  try {
    const { to, message } = await req.json();

    if (!to || !message) {
      return NextResponse.json({ error: 'Vul "to" (telefoonnummer) en "message" in.' }, { status: 400 });
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!token || !phoneId) {
      return NextResponse.json({
        error: 'WHATSAPP_TOKEN of WHATSAPP_PHONE_ID niet ingesteld in .env.local',
        config: {
          WHATSAPP_TOKEN: token ? '***ingesteld***' : 'ONTBREEKT',
          WHATSAPP_PHONE_ID: phoneId ? '***ingesteld***' : 'ONTBREEKT',
          WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN ? '***ingesteld***' : 'ONTBREEKT',
          ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '***ingesteld***' : 'ONTBREEKT',
          KV_REST_API_URL: process.env.KV_REST_API_URL ? '***ingesteld***' : 'ONTBREEKT',
        },
      }, { status: 500 });
    }

    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      }),
    });

    const data = await res.json();

    if (data.error) {
      return NextResponse.json({ error: data.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

// GET /api/whatsapp/test — check configuratie status
export async function GET() {
  const config = {
    WHATSAPP_TOKEN: process.env.WHATSAPP_TOKEN ? 'ingesteld' : 'ONTBREEKT',
    WHATSAPP_PHONE_ID: process.env.WHATSAPP_PHONE_ID ? 'ingesteld' : 'ONTBREEKT',
    WEBHOOK_VERIFY_TOKEN: process.env.WEBHOOK_VERIFY_TOKEN ? 'ingesteld' : 'ONTBREEKT',
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? 'ingesteld' : 'ONTBREEKT',
    KV_REST_API_URL: process.env.KV_REST_API_URL ? 'ingesteld' : 'ONTBREEKT',
    KV_REST_API_TOKEN: process.env.KV_REST_API_TOKEN ? 'ingesteld' : 'ONTBREEKT',
    NEXT_PUBLIC_WHATSAPP_NUMBER: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || 'ONTBREEKT',
  };

  const allSet = Object.values(config).every(v => v !== 'ONTBREEKT');

  return NextResponse.json({
    status: allSet ? 'ready' : 'incomplete',
    config,
    webhook_url: '/api/whatsapp',
    verify_token: process.env.WEBHOOK_VERIFY_TOKEN || 'NIET INGESTELD',
  });
}
