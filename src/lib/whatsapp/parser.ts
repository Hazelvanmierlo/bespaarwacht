import Anthropic from '@anthropic-ai/sdk';
import { EnergyData } from './types';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PARSE_PROMPT = `Lees dit Nederlandse energierapport/factuur uit.
Geef ALLEEN een JSON object terug, geen markdown backticks, geen uitleg:
{
  "leverancier": "naam van de energieleverancier",
  "stroom_normaal_kwh": number (normaal/piektarief verbruik kWh),
  "stroom_dal_kwh": number of null (daltarief verbruik, null als enkeltarief),
  "stroom_kwh_jaar": number (totaal jaarverbruik),
  "gas_m3_jaar": number of null,
  "kosten_maand": number (totale maandkosten),
  "kosten_jaar": number (geschat jaarbedrag),
  "tarief_stroom_normaal": number (tarief per kWh normaal/piek),
  "tarief_stroom_dal": number of null (tarief per kWh dal),
  "tarief_gas_m3": number of null,
  "teruglevering_kwh": number of null (terug geleverd aan net),
  "stroom_vorig_jaar_kwh": number of null (verbruik vorig jaar),
  "ean_stroom": "string" of null,
  "ean_gas": "string" of null,
  "contract_type": "vast" of "variabel" of "dynamisch",
  "adres": "string" of null,
  "naam": "string" of null (naam contracthouder),
  "meter_type": "enkel" of "dubbel" (dubbel als er apart dal/piek staat),
  "contract_einddatum": "YYYY-MM-DD" of null (einddatum huidig contract, bijv. "2026-12-31")
}

Belangrijk:
- Als er APART dal en normaal/piek verbruik staat → meter_type = "dubbel"
- Als er alleen totaal verbruik staat → meter_type = "enkel", stroom_dal_kwh = null
- Bij dubbeltarief: stroom_kwh_jaar = stroom_normaal_kwh + stroom_dal_kwh
- Als het GEEN energierapport is: { "error": "geen_energierapport" }
- Als het een Meterbeheer statusrapport is: { "error": "meterbeheer_status" }
- Als je een veld niet kunt vinden, gebruik null.`;

export async function parseEnergyReport(pdfBuffer: Buffer): Promise<EnergyData | { error: string }> {
  const base64 = pdfBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        { type: 'text', text: PARSE_PROMPT },
      ],
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { error: 'parse_failed' };
  }
}

export async function parseBankCard(imageBuffer: Buffer, mimeType: string): Promise<{ iban: string } | { error: string }> {
  const base64 = imageBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
        { type: 'text', text: `Lees het IBAN nummer van deze bankpas/betaalpas foto.
Geef ALLEEN een JSON object terug, geen markdown backticks, geen uitleg:
{ "iban": "NL00BANK0000000000" }

Als er geen IBAN zichtbaar is: { "error": "geen_iban" }` },
      ],
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { error: 'parse_failed' };
  }
}

export async function parseEnergyImage(imageBuffer: Buffer, mimeType: string): Promise<EnergyData | { error: string }> {
  const base64 = imageBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'image', source: { type: 'base64', media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: base64 } },
        { type: 'text', text: PARSE_PROMPT },
      ],
    }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '';
  try {
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch {
    return { error: 'parse_failed' };
  }
}
