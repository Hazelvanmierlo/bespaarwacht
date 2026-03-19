import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/conversation';
import { markAsRead } from '@/lib/whatsapp/client';
import crypto from 'crypto';

// ── Twilio signature validatie ──
function validateTwilioSignature(req: NextRequest, body: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get('x-twilio-signature');
  if (!authToken || !signature) return false;

  const url = req.url;
  const params = new URLSearchParams(body);
  const sortedKeys = [...params.keys()].sort();
  let dataString = url;
  for (const key of sortedKeys) {
    dataString += key + params.get(key);
  }

  const computed = crypto
    .createHmac('sha1', authToken)
    .update(dataString)
    .digest('base64');

  return computed === signature;
}

// ── GET: Health check + Meta webhook verificatie ──
export async function GET(req: NextRequest) {
  // Meta webhook verificatie
  const mode = req.nextUrl.searchParams.get('hub.mode');
  const token = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
  if (mode === 'subscribe' && verifyToken && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ status: 'ok', service: 'DeVerzekeringsAgent WhatsApp' });
}

// ── POST: Inkomende berichten (Twilio of Meta) ──
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      return handleMetaWebhook(req);
    } else {
      return handleTwilioWebhook(req);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}

// ── Twilio webhook handler ──
async function handleTwilioWebhook(req: NextRequest) {
  const body = await req.text();

  const hasTwilioAuth = !!process.env.TWILIO_AUTH_TOKEN;
  if (hasTwilioAuth) {
    const isValid = validateTwilioSignature(req, body);
    if (!isValid) {
      console.error('[whatsapp] Twilio signature validation failed — rejecting request');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }
  }

  const params = new URLSearchParams(body);
  const fromRaw = params.get('From') || '';         // whatsapp:+31626800726
  const messageBody = params.get('Body') || '';
  const numMedia = parseInt(params.get('NumMedia') || '0', 10);

  const from = fromRaw.replace('whatsapp:+', '');
  if (!from) return NextResponse.json({ status: 'no sender' });

  let messageType = 'text';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message: any = {
    text: { body: messageBody },
  };

  if (numMedia > 0) {
    const mediaUrl = params.get('MediaUrl0') || '';
    const mediaContentType = params.get('MediaContentType0') || '';

    if (mediaContentType === 'application/pdf') {
      messageType = 'document';
      message.document = { url: mediaUrl, mime_type: mediaContentType };
    } else if (mediaContentType.startsWith('image/')) {
      messageType = 'image';
      message.image = { url: mediaUrl, mime_type: mediaContentType };
    }
  }

  await handleIncomingMessage(from, message, messageType);
  return NextResponse.json({ status: 'ok' });
}

// ── Meta Cloud API webhook handler ──
async function handleMetaWebhook(req: NextRequest) {
  const body = await req.json();

  // Meta stuurt diverse events; we verwerken alleen berichten
  if (body.object !== 'whatsapp_business_account') {
    return NextResponse.json({ status: 'ignored' });
  }

  const entry = body.entry?.[0];
  const changes = entry?.changes?.[0];
  const value = changes?.value;

  if (!value?.messages?.length) {
    // Status update of ander niet-bericht event
    return NextResponse.json({ status: 'ok' });
  }

  const msg = value.messages[0];
  const from = msg.from; // bv. "31612345678"
  const msgId = msg.id;

  // Markeer als gelezen (blauwe vinkjes)
  markAsRead(msgId).catch(() => {});

  let messageType = 'text';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const message: any = {
    text: { body: '' },
  };

  switch (msg.type) {
    case 'text':
      message.text.body = msg.text.body;
      break;

    case 'interactive':
      // Button reply → zet title in text.body zodat conversation handler het herkent
      if (msg.interactive?.type === 'button_reply') {
        message.text.body = msg.interactive.button_reply.title;
      } else if (msg.interactive?.type === 'list_reply') {
        message.text.body = msg.interactive.list_reply.title;
      }
      break;

    case 'document':
      messageType = 'document';
      message.document = {
        url: msg.document.id, // Media ID (downloadMedia in client.ts handelt dit af)
        mime_type: msg.document.mime_type,
      };
      break;

    case 'image':
      messageType = 'image';
      message.image = {
        url: msg.image.id, // Media ID
        mime_type: msg.image.mime_type || 'image/jpeg',
      };
      break;

    default:
      message.text.body = '';
      break;
  }

  await handleIncomingMessage(from, message, messageType);
  return NextResponse.json({ status: 'ok' });
}
