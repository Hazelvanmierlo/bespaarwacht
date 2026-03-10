import { getSupabaseAdmin } from '../supabase-server';
import { ConversationState, EnergyData } from './types';

export async function saveLead(phone: string, conv: ConversationState) {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    console.warn('[leads] Supabase niet geconfigureerd — lead niet opgeslagen');
    return null;
  }

  const d = conv.data as EnergyData;
  const provider = conv.chosenProvider;
  const top = conv.comparison?.top3.find(t => t.naam === provider);

  const { data, error } = await supabase
    .from('energie_leads')
    .insert({
      telefoon: phone,
      naam: d.naam || null,
      adres: d.adres || null,
      email: conv.personalInfo?.email || null,
      iban: conv.personalInfo?.iban || null,
      iban_bank: conv.personalInfo?.ibanBank || null,

      leverancier_huidig: conv.comparison?.huidig.naam || d.leverancier,
      leverancier_nieuw: provider,
      stroom_kwh_jaar: d.stroom_kwh_jaar || null,
      gas_m3_jaar: d.gas_m3_jaar || null,
      meter_type: d.meter_type || null,
      ean_stroom: d.ean_stroom || null,
      ean_gas: d.ean_gas || null,

      kosten_huidig_jaar: conv.comparison?.huidig.jaarkosten || d.kosten_jaar || null,
      kosten_nieuw_jaar: top?.jaar1_kosten || null,
      besparing_jaar1: top?.besparing_jaar1 || null,
      besparing_basis: top?.besparing_basis || null,
      contract_type: top?.contract_type || null,

      bron: 'whatsapp',
      status: 'aangevraagd',
      affiliate_url: conv.affiliateUrl || null,
      affiliate_bron: conv.affiliateBron || 'mock',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[leads] Fout bij opslaan:', error.message);
    return null;
  }

  console.log(`[leads] Lead opgeslagen: ${data.id} — ${phone} → ${provider}`);
  return data.id;
}
