// ── Backend detection ──
// Als WHATSAPP_TOKEN + WHATSAPP_PHONE_ID zijn ingesteld → Meta Cloud API (productie)
// Anders → Twilio (sandbox)
const USE_META = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);

// ── Twilio config ──
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const TWILIO_URL = TWILIO_SID
  ? `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`
  : '';
const twilioAuthHeader = TWILIO_SID
  ? 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64')
  : '';

// ── Meta Cloud API config ──
const META_TOKEN = process.env.WHATSAPP_TOKEN || '';
const META_PHONE_ID = process.env.WHATSAPP_PHONE_ID || '';
const GRAPH_API = 'https://graph.facebook.com/v21.0';

// ═══════════════════════════════════════════
// Twilio functions
// ═══════════════════════════════════════════

async function twilioSendText(to: string, text: string) {
  const params = [
    `From=${encodeURIComponent(TWILIO_FROM)}`,
    `To=${encodeURIComponent(`whatsapp:+${to}`)}`,
    `Body=${encodeURIComponent(text)}`,
  ].join('&');

  const res = await fetch(TWILIO_URL, {
    method: 'POST',
    headers: {
      'Authorization': twilioAuthHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params,
  });
  return res.json();
}

async function twilioSendButtons(to: string, bodyText: string, buttons: string[]) {
  const numbered = buttons.map((btn, i) => `${i + 1}. ${btn}`).join('\n');
  return twilioSendText(to, `${bodyText}\n\n${numbered}`);
}

async function twilioDownloadMedia(mediaUrl: string): Promise<Buffer> {
  const res = await fetch(mediaUrl, {
    headers: { 'Authorization': twilioAuthHeader },
  });
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ═══════════════════════════════════════════
// Meta Cloud API functions
// ═══════════════════════════════════════════

async function metaSendText(to: string, text: string) {
  const res = await fetch(`${GRAPH_API}/${META_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: text },
    }),
  });
  return res.json();
}

async function metaSendButtons(to: string, bodyText: string, buttons: string[]) {
  // Meta interactive buttons: max 3 buttons, max 20 chars per title
  const interactiveButtons = buttons.slice(0, 3).map((btn, i) => ({
    type: 'reply' as const,
    reply: { id: `btn_${i + 1}`, title: btn.slice(0, 20) },
  }));

  const res = await fetch(`${GRAPH_API}/${META_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: bodyText },
        action: { buttons: interactiveButtons },
      },
    }),
  });
  return res.json();
}

async function metaDownloadMedia(mediaId: string): Promise<Buffer> {
  // Stap 1: Media URL ophalen via Graph API
  const metaRes = await fetch(`${GRAPH_API}/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${META_TOKEN}` },
  });
  const { url } = await metaRes.json();

  // Stap 2: Bestand downloaden
  const fileRes = await fetch(url, {
    headers: { 'Authorization': `Bearer ${META_TOKEN}` },
  });
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function metaMarkAsRead(messageId: string) {
  await fetch(`${GRAPH_API}/${META_PHONE_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${META_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}

// ═══════════════════════════════════════════
// Exported functions (auto-detect backend)
// ═══════════════════════════════════════════

export async function sendText(to: string, text: string) {
  return USE_META ? metaSendText(to, text) : twilioSendText(to, text);
}

export async function sendButtons(to: string, bodyText: string, buttons: string[]) {
  return USE_META ? metaSendButtons(to, bodyText, buttons) : twilioSendButtons(to, bodyText, buttons);
}

export async function downloadMedia(mediaUrlOrId: string): Promise<Buffer> {
  return USE_META ? metaDownloadMedia(mediaUrlOrId) : twilioDownloadMedia(mediaUrlOrId);
}

export async function markAsRead(messageId: string) {
  if (USE_META) await metaMarkAsRead(messageId);
  // Twilio ondersteunt geen leesbevestigingen
}
