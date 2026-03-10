import { kv } from '@vercel/kv';
import { sendText, sendButtons, downloadMedia } from './client';
import { parseEnergyReport, parseEnergyImage, parseBankCard } from './parser';
import { vergelijk } from './comparison';
import { detectProfile } from '../energy/detection';
import { validateIBAN, validateEmail } from '../utils/iban-validator';
import { saveLead } from './leads';
import { ConversationState, EnergyData } from './types';
import { getTrackingUrl, isMockMode } from '../daisycon/service';

const TTL = 86400; // 24 uur

async function getState(phone: string): Promise<ConversationState | null> {
  return kv.get<ConversationState>(`whatsapp:${phone}`);
}

async function setState(phone: string, state: ConversationState) {
  await kv.set(`whatsapp:${phone}`, state, { ex: TTL });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function handleIncomingMessage(from: string, message: any, messageType: string) {
  let conv = await getState(from);

  if (!conv) {
    conv = { state: 'WELCOME', data: {}, timestamp: Date.now() };
  }

  switch (conv.state) {
    case 'WELCOME':
      await sendText(from,
        "Hey! \u{1F44B} Ik ben BespaarWacht.\n\n" +
        "Stuur me je energierekening (PDF of foto) en ik vertel je binnen 10 seconden of je teveel betaalt.\n\n" +
        "\u{1F512} Je data wordt alleen gebruikt voor je advies en wordt niet opgeslagen.",
      );
      conv.state = 'AWAITING_PDF';
      break;

    case 'AWAITING_PDF':
      if (messageType === 'document' || messageType === 'image') {
        await sendText(from, "\u{1F4C4} Ontvangen! Even je rapport uitlezen...");

        try {
          const mediaUrl = messageType === 'document' ? message.document.url : message.image.url;
          const buffer = await downloadMedia(mediaUrl);

          let result;
          if (messageType === 'document') {
            result = await parseEnergyReport(buffer);
          } else {
            const mime = message.image.mime_type || 'image/jpeg';
            result = await parseEnergyImage(buffer, mime);
          }

          if ('error' in result) {
            const errorMessages: Record<string, string> = {
              'meterbeheer_status': "Dit is een Meterbeheer statusrapport, geen energierekening. Upload je maandelijkse afrekening van je energieleverancier.",
              'geen_energierapport': "Hmm, dit lijkt geen energierapport. Stuur je maandelijkse afrekening of factuur als PDF of foto.",
              'parse_failed': "Ik kon dit bestand niet uitlezen. Probeer een ander formaat (PDF werkt het beste).",
            };
            await sendText(from, errorMessages[result.error] || "Er ging iets mis. Probeer het opnieuw.");
            return;
          }

          conv.data = result as EnergyData;
          const d = conv.data as EnergyData;

          let verbruikTekst = `\u{1F4CA} Stroom: *${d.stroom_kwh_jaar?.toLocaleString('nl-NL')} kWh*/jaar`;
          if (d.meter_type === 'dubbel' && d.stroom_normaal_kwh && d.stroom_dal_kwh) {
            verbruikTekst += `\n   \u{21B3} Normaal: ${d.stroom_normaal_kwh.toLocaleString('nl-NL')} kWh \u{00B7} Dal: ${d.stroom_dal_kwh.toLocaleString('nl-NL')} kWh`;
          }

          const samenvatting =
            `\u{2705} *Gevonden in je rapport:*\n\n` +
            `\u{26A1} Leverancier: *${d.leverancier}*\n` +
            verbruikTekst + '\n' +
            (d.gas_m3_jaar ? `\u{1F525} Gas: *${d.gas_m3_jaar} m\u{00B3}*/jaar\n` : '') +
            `\u{1F4B0} Kosten: *\u{20AC}${d.kosten_maand}/maand* (\u{20AC}${d.kosten_jaar?.toLocaleString('nl-NL')}/jaar)\n` +
            `\u{1F4CF} Meter: *${d.meter_type === 'dubbel' ? 'Dubbeltarief' : 'Enkeltarief'}*\n\n` +
            `Klopt dit?`;

          await sendButtons(from, samenvatting, ['Ja, klopt \u{2713}', 'Nee, pas aan']);
          conv.state = 'CONFIRM_DATA';
        } catch (error) {
          console.error('Parse error:', error);
          await sendText(from, "Er ging iets mis bij het uitlezen. Probeer het opnieuw of stuur een ander bestand.");
        }
      } else {
        await sendText(from, "Stuur je energierekening als PDF of foto \u{1F4C4}\u{1F4F8}\n\nDit is je maandelijkse afrekening van bijv. Vattenfall, Eneco, Essent of een andere leverancier.");
      }
      break;

    case 'CONFIRM_DATA': {
      const buttonText = (message.text?.body || '').trim();
      const lower = buttonText.toLowerCase();

      if (lower === '1' || lower.includes('ja') || lower.includes('klopt')) {
        const d = conv.data as EnergyData;

        const profile = detectProfile(d);
        await sendText(from, `\u{1F3E0} *Jouw profiel:*\n\n${profile.reasons.join('\n')}`);

        const comparison = vergelijk(d);
        conv.comparison = comparison;

        await new Promise(r => setTimeout(r, 1000));

        const goedkoopste = comparison.top3[0];
        await sendText(from,
          `\u{1F534} *Je betaalt \u{20AC}${comparison.besparingPerMaand}/maand teveel.*\n\n` +
          `Dat is *\u{20AC}${comparison.besparingPerJaar}/jaar*.\n\n` +
          `Bij ${comparison.huidig.naam}: ~\u{20AC}${comparison.huidig.jaarkosten.toLocaleString('nl-NL')}/jaar\n` +
          `Bij *${goedkoopste.naam}* (${goedkoopste.contract_type}): ~\u{20AC}${goedkoopste.jaar1_kosten.toLocaleString('nl-NL')}/jaar`,
        );

        await new Promise(r => setTimeout(r, 800));

        const top3Text = comparison.top3.map((l, i) => {
          let line = `${i + 1}\uFE0F\u20E3 *${l.naam}* (${l.contract_type})`;
          line += `\n   Jaar 1: \u{20AC}${Math.round(l.jaar1_kosten / 12)}/mnd`;
          if (l.jaar1_kosten !== l.basis_jaarkosten) {
            line += ` \u{00B7} Daarna: \u{20AC}${Math.round(l.basis_jaarkosten / 12)}/mnd`;
          }
          line += ` \u{00B7} \u{2B50} ${l.rating}`;
          return line;
        }).join('\n');

        await sendText(from,
          `\u{1F4CA} *Top 3 voor jou (van ${comparison.resultaten.length} opties):*\n\n${top3Text}\n\n` +
          `_Nu: ~\u{20AC}${Math.round(comparison.huidig.jaarkosten / 12)}/mnd bij ${comparison.huidig.naam}_`,
        );

        await sendButtons(from, 'Wat wil je doen?', ['\u{1F504} Stap over', '\u{1F4CA} Meer details', '\u{1F4F8} Deel resultaat']);
        conv.state = 'CHOOSE_ACTION';
      } else {
        await sendText(from, "Stuur me wat er niet klopt, dan pas ik het aan. Of stuur een nieuw rapport.");
      }
      break;
    }

    case 'CHOOSE_ACTION': {
      const choice = (message.text?.body || '').trim();
      const choiceLower = choice.toLowerCase();

      if (choiceLower === '1' || choiceLower.includes('stap over') || choiceLower.includes('overstappen')) {
        const top = conv.comparison?.top3[0];
        conv.chosenProvider = top?.naam || 'de goedkoopste';
        const d = conv.data as EnergyData;

        await sendText(from,
          `\u{1F44D} Dit heb ik al uit je rapport:\n\n` +
          `\u{1F464} ${d.naam}\n` +
          `\u{1F4CD} ${d.adres}\n` +
          (d.ean_stroom ? `\u{26A1} EAN: ${d.ean_stroom}\n` : '') +
          (d.ean_gas ? `\u{1F525} EAN: ${d.ean_gas}\n` : '') +
          `\u{1F4CA} ${d.stroom_kwh_jaar.toLocaleString('nl-NL')} kWh` +
          (d.gas_m3_jaar ? ` + ${d.gas_m3_jaar} m\u{00B3}` : '') + '\n\n' +
          `Ik heb alleen nog nodig:\n` +
          `\u{1F4B3} Je *IBAN*\n` +
          `\u{1F4E7} Je *e-mailadres*\n\n` +
          `_Stuur ze allebei in \u{00E9}\u{00E9}n bericht._`,
        );
        conv.state = 'COLLECT_INFO';
      } else if (choiceLower === '2' || choiceLower.includes('meer details') || choiceLower.includes('details')) {
        const d = conv.data as EnergyData;
        const c = conv.comparison!;

        let advies = `\u{1F3AF} *Uitgebreid advies:*\n\n`;
        advies += `\u{1F4CA} *${d.stroom_kwh_jaar.toLocaleString('nl-NL')} kWh*/jaar \u{2014} bij dit verbruik scheelt 1 ct/kWh al \u{20AC}${Math.round(d.stroom_kwh_jaar * 0.01)}/jaar\n`;
        if (d.gas_m3_jaar && d.gas_m3_jaar > 800) {
          advies += `\u{1F525} Hoog gasverbruik (*${d.gas_m3_jaar} m\u{00B3}*) \u{2014} overweeg isolatie\n`;
        }
        if (d.meter_type === 'dubbel') {
          advies += `\u{1F4CF} Dubbeltarief \u{2014} check of dynamisch tarief nog goedkoper is (laden EV in daluren)\n`;
        }

        advies += `\n\u{1F4CB} *Top 5 opties:*\n`;
        c.resultaten.slice(0, 5).forEach((r, i) => {
          advies += `\n${i + 1}. *${r.naam}* (${r.contract_type})`;
          advies += `\n   Jaar 1: \u{20AC}${r.jaar1_kosten.toLocaleString('nl-NL')}`;
          if (r.jaar1_kosten !== r.basis_jaarkosten) {
            advies += ` \u{00B7} Doorlopend: \u{20AC}${r.basis_jaarkosten.toLocaleString('nl-NL')}`;
          }
          advies += ` \u{00B7} Besparing: \u{20AC}${r.besparing_jaar1}`;
        });

        await sendText(from, advies);
        await sendButtons(from, 'Wil je overstappen?', ['\u{1F504} Stap over', '\u{1F4F8} Deel resultaat', '\u{274C} Nee bedankt']);
      } else if (choiceLower === '3' || choiceLower.includes('deel')) {
        const naam = (conv.data as EnergyData).naam?.split(' ')[0] || 'ik';
        const besparing = conv.comparison?.besparingPerMaand || 0;
        await sendText(from,
          `\u{1F4F8} *Deel met vrienden:*\n\n` +
          `Stuur dit bericht:\n\n` +
          `_"Check bespaarwacht.nl \u{2014} ${naam} bespaart \u{20AC}${besparing}/mnd op energie \u{1F926}"_\n\n` +
          `Of vertel ze: stuur je energierekening naar dit nummer!`,
        );
      } else {
        await sendText(from, "Geen probleem! Je kunt altijd terugkomen. Stuur een nieuw rapport wanneer je wilt. \u{1F44B}");
        conv.state = 'WELCOME';
      }
      break;
    }

    case 'COLLECT_INFO': {
      const text = message.text?.body || '';
      if (!conv.personalInfo) conv.personalInfo = {};

      // Parse IBAN from bank card photo
      if (messageType === 'image' && !conv.personalInfo.iban) {
        await sendText(from, "\u{1F4B3} Bankpas ontvangen, even uitlezen...");
        try {
          const mediaUrl = message.image.url;
          const buffer = await downloadMedia(mediaUrl);
          const mime = message.image.mime_type || 'image/jpeg';
          const result = await parseBankCard(buffer, mime);

          if ('iban' in result && result.iban) {
            const ibanResult = validateIBAN(result.iban);
            if (ibanResult.valid) {
              conv.personalInfo.iban = ibanResult.iban;
              conv.personalInfo.ibanBank = ibanResult.bankName;
              await sendText(from, `\u{2705} IBAN gevonden: *${ibanResult.iban}* (${ibanResult.bankName})`);
            } else {
              await sendText(from, `\u{274C} IBAN op de foto is ongeldig. Typ je IBAN handmatig of stuur een duidelijkere foto.`);
              await setState(from, conv);
              return;
            }
          } else {
            await sendText(from, "Ik kon geen IBAN vinden op deze foto. Typ je IBAN handmatig of stuur een foto van je bankpas.");
            await setState(from, conv);
            return;
          }
        } catch (error) {
          console.error('Bank card parse error:', error);
          await sendText(from, "Er ging iets mis bij het uitlezen. Typ je IBAN handmatig.");
          await setState(from, conv);
          return;
        }
      }

      const ibanMatch = text.match(/[A-Z]{2}\d{2}\s?[A-Z]{4}\s?\d{4}\s?\d{4}\s?\d{2,4}/i);
      if (ibanMatch) {
        const ibanResult = validateIBAN(ibanMatch[0]);
        if (ibanResult.valid) {
          conv.personalInfo.iban = ibanResult.iban;
          conv.personalInfo.ibanBank = ibanResult.bankName;
        } else {
          await sendText(from, `\u{274C} ${ibanResult.error}\n\nProbeer het opnieuw.`);
          await setState(from, conv);
          return;
        }
      }

      const emailMatch = text.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
      if (emailMatch && validateEmail(emailMatch[0])) {
        conv.personalInfo.email = emailMatch[0].toLowerCase();
      }

      const missing = [];
      if (!conv.personalInfo.iban) missing.push('IBAN');
      if (!conv.personalInfo.email) missing.push('e-mailadres');

      if (missing.length > 0) {
        await sendText(from, `Ik mis nog: ${missing.join(' en ')}. Stuur ${missing.length === 1 ? 'het' : 'ze'} even door.`);
      } else {
        const d = conv.data as EnergyData;
        const provider = conv.chosenProvider!;
        const top = conv.comparison?.top3.find(t => t.naam === provider);
        const besparing = top?.besparing_jaar1 || conv.comparison?.besparingPerJaar || 0;

        await sendText(from,
          `\u{2705} IBAN geldig (*${conv.personalInfo.ibanBank}*)\n\n` +
          `Even checken:\n\n` +
          `\u{1F4CB} *Van:* ${conv.comparison?.huidig.naam} \u{2192} *Naar:* ${provider}\n` +
          `\u{1F464} ${d.naam}\n` +
          `\u{1F4CD} ${d.adres}\n` +
          `\u{1F4B3} ${conv.personalInfo.iban}\n` +
          `\u{1F4E7} ${conv.personalInfo.email}\n` +
          `\u{1F4B0} *Besparing: \u{20AC}${besparing}/jaar*\n\n` +
          `\u{2696}\uFE0F Je hebt 14 dagen bedenktijd.\n\n` +
          `Akkoord?`,
        );

        await sendButtons(from, 'Bevestig je overstap:', ['\u{2705} Ja, akkoord', '\u{274C} Nee, annuleer']);
        conv.state = 'CONFIRM_SWITCH';
      }
      break;
    }

    case 'CONFIRM_SWITCH': {
      const confirmChoice = (message.text?.body || '').trim();
      const confirmLower = confirmChoice.toLowerCase();

      if (confirmLower === '1' || confirmLower.includes('ja') || confirmLower.includes('akkoord')) {
        const provider = conv.chosenProvider!;
        const top = conv.comparison?.top3.find(t => t.naam === provider);
        const besparing = top?.besparing_jaar1 || 0;
        const bespBasis = top?.besparing_basis || 0;

        // Haal affiliate tracking URL op (met telefoonnummer als sub-ID)
        let affiliateUrl: string | null = null;
        try {
          affiliateUrl = await getTrackingUrl(provider, from);
        } catch (e) {
          console.error('[conversation] Affiliate URL ophalen mislukt:', e);
        }

        // Sla affiliate info op in conversation state
        conv.affiliateUrl = affiliateUrl || undefined;
        conv.affiliateBron = isMockMode() ? 'mock' : 'daisycon';

        let bevestigingTekst =
          `\u{1F389} *Overstap aangevraagd!*\n\n` +
          `\u{1F4CB} Van: ${conv.comparison?.huidig.naam} \u{2192} Naar: ${provider}\n` +
          `\u{1F4B0} Besparing jaar 1: *\u{20AC}${besparing}*\n` +
          (besparing !== bespBasis ? `\u{1F4B0} Doorlopend: *\u{20AC}${bespBasis}/jaar*\n` : '') +
          `\u{1F4C5} Ingangsdatum: ~6 weken\n` +
          `\u{23F0} Bedenktijd: 14 dagen\n` +
          `\u{1F4E7} Bevestiging naar: ${conv.personalInfo?.email}\n\n`;

        if (affiliateUrl) {
          bevestigingTekst += `Stap over via deze link: ${affiliateUrl}\n\n`;
        }

        bevestigingTekst +=
          `${provider} stuurt je binnen 5 werkdagen een bevestiging op ${conv.personalInfo?.email}. Zij zeggen ${conv.comparison?.huidig.naam} voor je op.\n\n` +
          `Je hoeft niets te doen! \u{1F389}`;

        await sendText(from, bevestigingTekst);

        // Save lead to database
        try {
          await saveLead(from, conv);
        } catch (e) {
          console.error('[conversation] Lead opslaan mislukt:', e);
        }

        await new Promise(r => setTimeout(r, 1500));
        await sendText(from,
          `Ken je iemand die ook teveel betaalt?\n\n` +
          `Vertel ze: stuur je energierekening naar dit nummer!`,
        );

        conv.state = 'SWITCH_DONE';
      } else {
        await sendText(from, "Geen probleem! De overstap is geannuleerd. Je kunt altijd terugkomen. \u{1F44B}");
        conv.state = 'AWAITING_PDF';
      }
      break;
    }

    case 'SWITCH_DONE':
      await sendText(from,
        "Je overstap is al in behandeling! \u{1F389}\n\nWil je iemand helpen besparen? Vertel ze: stuur je energierekening naar dit nummer!",
      );
      conv.state = 'AWAITING_PDF';
      break;
  }

  await setState(from, conv);
}
