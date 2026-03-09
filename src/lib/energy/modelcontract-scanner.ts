import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Scan een modelcontract PDF -> gestructureerde tariefdata.
 * Gebruik: handmatig of via cron (kwartaal) om tarieven bij te werken.
 * NOOIT automatisch overschrijven — altijd handmatige review.
 */
export async function scanModelcontract(pdfBuffer: Buffer) {
  const base64 = pdfBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: [
        { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
        {
          type: 'text', text: `Analyseer dit Nederlandse energieleverancier modelcontract.
Geef ALLEEN JSON terug, geen markdown:
{
  "leverancier": "naam",
  "contracten": [
    {
      "type": "Variabel" of "1jaar" of "3jaar" of "Dynamisch",
      "normaal_kwh": number (leveringstarief normaal/piek incl. belasting),
      "dal_kwh": number (leveringstarief dal, = normaal als enkeltarief),
      "gas_m3": number (leveringstarief gas per m3 incl. belasting),
      "vastrecht_stroom_maand": number (vaste leveringskosten stroom per maand),
      "vastrecht_gas_maand": number (vaste leveringskosten gas per maand),
      "looptijd_maanden": number of null,
      "ingangsdatum": "YYYY-MM-DD" of null
    }
  ],
  "opmerkingen": "string met relevante opmerkingen"
}
Als het geen modelcontract is: { "error": "geen_modelcontract" }`,
        },
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
