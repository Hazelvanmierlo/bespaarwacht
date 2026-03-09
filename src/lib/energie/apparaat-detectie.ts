import type { EnergieData } from "./pdf-parser";

export type ConfidenceLevel = "zeker" | "waarschijnlijk" | "onwaarschijnlijk" | "onbekend";

export interface ApparaatDetectie {
  zonnepanelen: ConfidenceLevel;
  elektrischeAuto: ConfidenceLevel;
  warmtepomp: ConfidenceLevel;
  stadsverwarming: ConfidenceLevel;
}

export interface ApparaatImpact {
  label: string;
  icon: string;
  advies: string;
}

export const apparaatImpacts: Record<keyof ApparaatDetectie, ApparaatImpact> = {
  zonnepanelen: {
    label: "Zonnepanelen",
    icon: "☀️",
    advies: "Zoek een leverancier met hoge terugleververgoeding en/of dynamisch tarief.",
  },
  elektrischeAuto: {
    label: "Elektrische auto",
    icon: "🚗",
    advies: "Kies een leverancier met laag daltarief of dynamisch contract voor goedkoop laden.",
  },
  warmtepomp: {
    label: "Warmtepomp",
    icon: "🌡️",
    advies: "All-electric tarief kan voordeliger zijn. Vergelijk op kWh-prijs, niet op gas.",
  },
  stadsverwarming: {
    label: "Stadsverwarming",
    icon: "🏢",
    advies: "Geen gas nodig. Vergelijk alleen op elektriciteitstarief.",
  },
};

export function detecteerApparaten(data: EnergieData): ApparaatDetectie {
  return {
    zonnepanelen: detectZonnepanelen(data),
    elektrischeAuto: detectElektrischeAuto(data),
    warmtepomp: detectWarmtepomp(data),
    stadsverwarming: detectStadsverwarming(data),
  };
}

function detectZonnepanelen(data: EnergieData): ConfidenceLevel {
  if (data.terugleveringKwh != null && data.terugleveringKwh > 100) return "zeker";
  if (data.terugleveringKwh != null && data.terugleveringKwh > 0) return "waarschijnlijk";
  return "onbekend";
}

function detectElektrischeAuto(data: EnergieData): ConfidenceLevel {
  const totaal = data.verbruikKwhTotaal ?? 0;
  if (totaal > 6000 && data.verbruikGasM3 != null && data.verbruikGasM3 < 800) return "waarschijnlijk";
  if (totaal > 8000) return "waarschijnlijk";
  if (totaal > 5000) return "onwaarschijnlijk";
  return "onbekend";
}

function detectWarmtepomp(data: EnergieData): ConfidenceLevel {
  const totaalKwh = data.verbruikKwhTotaal ?? 0;
  const gasM3 = data.verbruikGasM3;

  // Hoog elektriciteit + weinig/geen gas → waarschijnlijk warmtepomp
  if (gasM3 != null && gasM3 < 200 && totaalKwh > 5000) return "zeker";
  if (gasM3 != null && gasM3 < 500 && totaalKwh > 6000) return "waarschijnlijk";
  return "onbekend";
}

function detectStadsverwarming(data: EnergieData): ConfidenceLevel {
  // Null gas (geen gasaansluiting) → mogelijk stadsverwarming
  if (data.verbruikGasM3 === null && data.eanGas === null) return "waarschijnlijk";
  if (data.verbruikGasM3 === 0) return "waarschijnlijk";
  return "onwaarschijnlijk";
}
