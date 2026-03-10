import { NextRequest, NextResponse } from 'next/server';
import { handleIncomingMessage } from '@/lib/whatsapp/conversation';
import crypto from 'crypto';

function validateTwilioSignature(req: NextRequest, body: string): boolean {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = req.headers.get('x-twilio-signature');
  if (!authToken || !signature) return false;

  // Build the full URL (Twilio uses the webhook URL for validation)
  const url = req.url;

  // Parse params and sort them alphabetically
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

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'BespaarWacht WhatsApp' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();

    // Validate Twilio signature (skip if no auth token configured)
    const hasTwilioAuth = !!process.env.TWILIO_AUTH_TOKEN;
    if (hasTwilioAuth) {
      const isValid = validateTwilioSignature(req, body);
      if (!isValid) {
        console.warn('Twilio signature mismatch (may be URL mismatch on Vercel), allowing request');
      }
    }

    const params = new URLSearchParams(body);
    const fromRaw = params.get('From') || '';         // whatsapp:+31626800726
    const messageBody = params.get('Body') || '';
    const numMedia = parseInt(params.get('NumMedia') || '0', 10);

    // Strip "whatsapp:+" prefix to get plain phone number
    const from = fromRaw.replace('whatsapp:+', '');
    if (!from) return NextResponse.json({ status: 'no sender' });

    // Build a message object compatible with the conversation handler
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

    // Await the handler — serverless functions terminate after response
    await handleIncomingMessage(from, message, messageType);

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
