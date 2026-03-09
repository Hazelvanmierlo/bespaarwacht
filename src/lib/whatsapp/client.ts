const API_URL = `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
const MEDIA_URL = `https://graph.facebook.com/v19.0`;

async function sendRequest(body: Record<string, unknown>) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
  });
  return res.json();
}

export async function sendText(to: string, text: string) {
  return sendRequest({ to, type: 'text', text: { body: text } });
}

export async function sendButtons(to: string, bodyText: string, buttons: string[]) {
  return sendRequest({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((text, i) => ({
          type: 'reply',
          reply: { id: `btn_${i}`, title: text.slice(0, 20) },
        })),
      },
    },
  });
}

export async function downloadMedia(mediaId: string): Promise<Buffer> {
  const metaRes = await fetch(`${MEDIA_URL}/${mediaId}`, {
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  const metaData = await metaRes.json();

  const fileRes = await fetch(metaData.url, {
    headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  const arrayBuffer = await fileRes.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function markAsRead(messageId: string) {
  return sendRequest({
    status: 'read',
    message_id: messageId,
  });
}
