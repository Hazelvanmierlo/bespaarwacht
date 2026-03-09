export interface Leverancier {
  naam: string;
  type: "vast" | "variabel" | "dynamisch";
  groen: boolean;
  tariefElektraDal: number;   // €/kWh
  tariefElektraPiek: number;  // €/kWh
  tariefGas: number;          // €/m³
  vastrecht: number;          // €/maand
  kortingEersteJaar: number;  // € totaal
  terugleverVergoeding: number; // €/kWh
}

export const leveranciers: Leverancier[] = [
  {
    naam: "Budget Energie",
    type: "variabel",
    groen: false,
    tariefElektraDal: 0.08,
    tariefElektraPiek: 0.24,
    tariefGas: 1.15,
    vastrecht: 6.95,
    kortingEersteJaar: 250,
    terugleverVergoeding: 0.07,
  },
  {
    naam: "Eneco",
    type: "vast",
    groen: true,
    tariefElektraDal: 0.09,
    tariefElektraPiek: 0.27,
    tariefGas: 1.28,
    vastrecht: 7.49,
    kortingEersteJaar: 0,
    terugleverVergoeding: 0.07,
  },
  {
    naam: "Essent",
    type: "vast",
    groen: false,
    tariefElektraDal: 0.09,
    tariefElektraPiek: 0.26,
    tariefGas: 1.25,
    vastrecht: 7.25,
    kortingEersteJaar: 75,
    terugleverVergoeding: 0.065,
  },
  {
    naam: "Vattenfall",
    type: "vast",
    groen: true,
    tariefElektraDal: 0.085,
    tariefElektraPiek: 0.255,
    tariefGas: 1.22,
    vastrecht: 7.50,
    kortingEersteJaar: 0,
    terugleverVergoeding: 0.07,
  },
  {
    naam: "Greenchoice",
    type: "variabel",
    groen: true,
    tariefElektraDal: 0.08,
    tariefElektraPiek: 0.245,
    tariefGas: 1.20,
    vastrecht: 6.75,
    kortingEersteJaar: 100,
    terugleverVergoeding: 0.08,
  },
  {
    naam: "Coolblue Energie",
    type: "variabel",
    groen: true,
    tariefElektraDal: 0.075,
    tariefElektraPiek: 0.235,
    tariefGas: 1.18,
    vastrecht: 6.50,
    kortingEersteJaar: 150,
    terugleverVergoeding: 0.075,
  },
  {
    naam: "ENGIE",
    type: "vast",
    groen: false,
    tariefElektraDal: 0.088,
    tariefElektraPiek: 0.258,
    tariefGas: 1.24,
    vastrecht: 7.95,
    kortingEersteJaar: 50,
    terugleverVergoeding: 0.065,
  },
  {
    naam: "Vandebron",
    type: "variabel",
    groen: true,
    tariefElektraDal: 0.07,
    tariefElektraPiek: 0.22,
    tariefGas: 1.16,
    vastrecht: 7.00,
    kortingEersteJaar: 0,
    terugleverVergoeding: 0.09,
  },
  {
    naam: "Tibber",
    type: "dynamisch",
    groen: true,
    tariefElektraDal: 0.065,
    tariefElektraPiek: 0.21,
    tariefGas: 1.14,
    vastrecht: 4.49,
    kortingEersteJaar: 0,
    terugleverVergoeding: 0.085,
  },
  {
    naam: "Frank Energie",
    type: "dynamisch",
    groen: true,
    tariefElektraDal: 0.06,
    tariefElektraPiek: 0.20,
    tariefGas: 1.12,
    vastrecht: 4.95,
    kortingEersteJaar: 0,
    terugleverVergoeding: 0.09,
  },
  {
    naam: "NextEnergy",
    type: "variabel",
    groen: false,
    tariefElektraDal: 0.07,
    tariefElektraPiek: 0.23,
    tariefGas: 1.17,
    vastrecht: 5.95,
    kortingEersteJaar: 200,
    terugleverVergoeding: 0.07,
  },
];

export interface BerekeningResultaat {
  leverancier: Leverancier;
  kostenElektriciteit: number;
  kostenGas: number | null;
  vastrecht: number;
  korting: number;
  terugleverOpbrengst: number;
  totaalJaar: number;
}

export function berekenJaarkosten(
  lev: Leverancier,
  kwhDal: number,
  kwhPiek: number,
  gasM3: number | null,
  terugleveringKwh: number | null,
): BerekeningResultaat {
  const kostenElektriciteit =
    kwhDal * lev.tariefElektraDal + kwhPiek * lev.tariefElektraPiek;

  const kostenGas = gasM3 != null ? gasM3 * lev.tariefGas : null;
  const vastrecht = lev.vastrecht * 12;
  const korting = lev.kortingEersteJaar;
  const terugleverOpbrengst =
    terugleveringKwh != null ? terugleveringKwh * lev.terugleverVergoeding : 0;

  const totaalJaar =
    kostenElektriciteit +
    (kostenGas ?? 0) +
    vastrecht -
    korting -
    terugleverOpbrengst;

  return {
    leverancier: lev,
    kostenElektriciteit: Math.round(kostenElektriciteit),
    kostenGas: kostenGas != null ? Math.round(kostenGas) : null,
    vastrecht: Math.round(vastrecht),
    korting,
    terugleverOpbrengst: Math.round(terugleverOpbrengst),
    totaalJaar: Math.round(totaalJaar),
  };
}
