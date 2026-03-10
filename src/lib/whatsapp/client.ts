const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID!;
const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN!;
const TWILIO_FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';
const MESSAGES_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`;

const authHeader = 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_AUTH}`).toString('base64');

export async function sendText(to: string, text: string) {
  const body = new URLSearchParams({
    From: TWILIO_FROM,
    To: `whatsapp:+${to}`,
    Body: text,
  });

  const res = await fetch(MESSAGES_URL, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: body.toString(),
  });
  return res.json();
}

export async function sendButtons(to: string, bodyText: string, buttons: string[]) {
  const numbered = buttons
    .map((btn, i) => `${i + 1}. ${btn}`)
    .join('\n');
  return sendText(to, `${bodyText}\n\n${numbered}`);
}

export async function downloadMedia(mediaUrl: string): Promise<Buffer> {
  const res = await fetch(mediaUrl, {
    headers: { 'Authorization': authHeader },
  });
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function markAsRead(_messageId: string) {
  // No-op: Twilio does not support read receipts
}
