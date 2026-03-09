import { EnergyData, DetectedProfile } from '../whatsapp/types';

export function detectProfile(data: EnergyData): DetectedProfile {
  const profile: DetectedProfile = {
    zonnepanelen: false,
    elektrischeAuto: false,
    warmtepomp: false,
    stadsverwarming: false,
    reasons: [],
  };

  // Zonnepanelen
  if (data.teruglevering_kwh && data.teruglevering_kwh > 0) {
    profile.zonnepanelen = true;
    profile.reasons.push(`☀️ Zonnepanelen: Ja (${data.teruglevering_kwh} kWh teruglevering)`);
  } else {
    profile.reasons.push('☀️ Zonnepanelen: Nee');
  }

  // Elektrische auto — dubbeltarief-aware
  const yoyIncrease = data.stroom_vorig_jaar_kwh
    ? data.stroom_kwh_jaar - data.stroom_vorig_jaar_kwh
    : 0;
  const dalRatio = data.stroom_dal_kwh && data.stroom_normaal_kwh
    ? data.stroom_dal_kwh / (data.stroom_dal_kwh + data.stroom_normaal_kwh)
    : null;

  if (yoyIncrease > 300 || (data.stroom_kwh_jaar > 8000 && dalRatio && dalRatio > 0.55)) {
    profile.elektrischeAuto = true;
    const reason = yoyIncrease > 300
      ? `+${yoyIncrease} kWh t.o.v. vorig jaar`
      : `hoog verbruik + ${Math.round((dalRatio || 0) * 100)}% dal`;
    profile.reasons.push(`🚗 Elektrische auto: Waarschijnlijk (${reason})`);
  } else {
    profile.reasons.push('🚗 Elektrische auto: Nee');
  }

  // Warmtepomp / Stadsverwarming
  if (!data.gas_m3_jaar || data.gas_m3_jaar === 0) {
    if (data.stroom_kwh_jaar > 5000) {
      profile.warmtepomp = true;
      profile.reasons.push('❄️ Warmtepomp: Ja (all-electric, hoog stroomverbruik)');
    } else {
      profile.stadsverwarming = true;
      profile.reasons.push('🏢 Stadsverwarming: Waarschijnlijk (geen gas, normaal stroom)');
    }
  } else if (data.gas_m3_jaar < 400 && data.stroom_kwh_jaar > 5000) {
    profile.warmtepomp = true;
    profile.reasons.push(`❄️ Warmtepomp: Waarschijnlijk (${data.gas_m3_jaar} m³ gas, ${data.stroom_kwh_jaar} kWh stroom)`);
  } else {
    profile.reasons.push(`❄️ Warmtepomp: Nee (${data.gas_m3_jaar} m³ gas = CV-ketel)`);
  }

  return profile;
}
