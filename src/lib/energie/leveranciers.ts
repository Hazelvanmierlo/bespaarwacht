import leveranciersJson from "@/data/leveranciers.json";

// ── Dutch energy tax constants 2026 (update annually from Belastingdienst) ──
export const ENERGIE_BELASTING = {
  stroom: 0.04910,       // €/kWh — energiebelasting schijf 1 (0–10.000 kWh)
  gas: 0.59790,          // €/m³  — energiebelasting
  ode_stroom: 0.01540,   // €/kWh — opslag duurzame energie
  ode_gas: 0.08580,      // €/m³  — opslag duurzame energie
  btw: 0.21,             // 21%
  vermindering_eb: 642.00, // €/jaar — vermindering energiebelasting (incl BTW)
};

// Leveranciers known to supply 100% green energy
const GROENE_LEVERANCIERS = new Set([
  "Greenchoice", "Vandebron", "Pure Energie", "Eneco", "Tibber",
  "Frank Energie", "Zonneplan", "Coolblue Energie", "ANWB Energie",
  "Powerpeers",
]);

export interface Leverancier {
  naam: string;
  type: "vast" | "variabel" | "dynamisch";
  groen: boolean;
  tariefElektraDal: number;   // €/kWh leveringstarief
  tariefElektraPiek: number;  // €/kWh leveringstarief
  tariefGas: number;          // €/m³ leveringstarief
  vastrecht: number;          // €/maand (stroom + gas, excl BTW)
  kortingEersteJaar: number;  // € totaal welkomstbonus
  terugleverVergoeding: number; // €/kWh
  rating: number;
  affiliateUrl: string | null;
}

export interface BerekeningResultaat {
  leverancier: Leverancier;
  kostenElektriciteit: number;   // leveringstarief × verbruik
  kostenGas: number | null;
  vastrecht: number;             // jaarlijks incl BTW
  korting: number;               // welkomstbonus
  terugleverOpbrengst: number;
  energiebelasting: number;      // EB + ODE totaal
  btw: number;                   // BTW over alles
  verminderingEB: number;        // jaarlijkse teruggave
  totaalJaar: number;            // jaar-1 (incl welkomstbonus)
  totaalDoorlopend: number;      // doorlopend (zonder welkomstbonus)
}

/**
 * Builds leverancier list from leveranciers.json.
 * Each contract variant becomes a separate entry (e.g., "Eneco — 1jaar").
 */
function buildLeveranciers(): Leverancier[] {
  const data = leveranciersJson.leveranciers as Record<
    string,
    {
      modelcontract_url: string;
      rating: number;
      contracten: { type: string; normaal: number; dal: number; gas: number; vastrecht_stroom: number; vastrecht_gas: number }[];
      affiliate: { welkomstbonus: number; url: string } | null;
    }
  >;

  const result: Leverancier[] = [];

  for (const [naam, lev] of Object.entries(data)) {
    for (const contract of lev.contracten) {
      const contractType = contract.type.toLowerCase();
      const type: Leverancier["type"] =
        contractType === "dynamisch" ? "dynamisch" :
        contractType === "variabel" ? "variabel" : "vast";

      const label = lev.contracten.length > 1 ? `${naam} — ${contract.type}` : naam;

      result.push({
        naam: label,
        type,
        groen: GROENE_LEVERANCIERS.has(naam),
        tariefElektraPiek: contract.normaal,
        tariefElektraDal: contract.dal,
        tariefGas: contract.gas,
        vastrecht: contract.vastrecht_stroom + contract.vastrecht_gas,
        kortingEersteJaar: lev.affiliate?.welkomstbonus ?? 0,
        terugleverVergoeding: 0.07, // standaard terugleververgoeding
        rating: lev.rating,
        affiliateUrl: lev.affiliate?.url ?? null,
      });
    }
  }

  return result.sort((a, b) => a.naam.localeCompare(b.naam));
}

export const leveranciers: Leverancier[] = buildLeveranciers();

/**
 * Berekent jaarkosten inclusief energiebelasting, ODE en BTW.
 * Geeft zowel jaar-1 (incl welkomstbonus) als doorlopende kosten.
 */
export function berekenJaarkosten(
  lev: Leverancier,
  kwhDal: number,
  kwhPiek: number,
  gasM3: number | null,
  terugleveringKwh: number | null,
): BerekeningResultaat {
  const eb = ENERGIE_BELASTING;
  const totalKwh = kwhDal + kwhPiek;

  // Leveringstarief kosten (excl belasting)
  const kostenElektriciteit = kwhDal * lev.tariefElektraDal + kwhPiek * lev.tariefElektraPiek;
  const kostenGas = gasM3 != null ? gasM3 * lev.tariefGas : null;

  // Energiebelasting + ODE
  const ebStroom = totalKwh * (eb.stroom + eb.ode_stroom);
  const ebGas = gasM3 != null ? gasM3 * (eb.gas + eb.ode_gas) : 0;
  const energiebelasting = ebStroom + ebGas;

  // Vastrecht (per maand → per jaar)
  const vastrechtJaar = lev.vastrecht * 12;

  // Teruglevering (vergoeding, niet belast als leveringstarief)
  const terugleverOpbrengst = terugleveringKwh != null ? terugleveringKwh * lev.terugleverVergoeding : 0;

  // Subtotaal voor BTW
  const subtotaal = kostenElektriciteit + (kostenGas ?? 0) + energiebelasting + vastrechtJaar - terugleverOpbrengst;
  const btw = subtotaal * eb.btw;

  // Totaal doorlopend (jaarlijks, zonder welkomstbonus)
  const totaalDoorlopend = Math.round(subtotaal + btw - eb.vermindering_eb);

  // Totaal jaar-1 (incl welkomstbonus)
  const totaalJaar = Math.round(totaalDoorlopend - lev.kortingEersteJaar);

  return {
    leverancier: lev,
    kostenElektriciteit: Math.round(kostenElektriciteit),
    kostenGas: kostenGas != null ? Math.round(kostenGas) : null,
    vastrecht: Math.round(vastrechtJaar * (1 + eb.btw)),
    korting: lev.kortingEersteJaar,
    terugleverOpbrengst: Math.round(terugleverOpbrengst),
    energiebelasting: Math.round(energiebelasting),
    btw: Math.round(btw),
    verminderingEB: eb.vermindering_eb,
    totaalJaar,
    totaalDoorlopend,
  };
}
