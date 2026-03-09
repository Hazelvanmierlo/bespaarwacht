import type { EnergieData } from "./pdf-parser";
import type { ApparaatDetectie } from "./apparaat-detectie";

export interface Tip {
  icon: string;
  titel: string;
  beschrijving: string;
  besparing: string | null;
  prioriteit: 1 | 2 | 3; // 1 = hoogst
}

export function genereerTips(
  data: EnergieData,
  apparaten: ApparaatDetectie,
): Tip[] {
  const tips: Tip[] = [];

  const totaalKwh = data.verbruikKwhTotaal ?? 0;
  const dalKwh = data.verbruikKwhDal ?? 0;
  const piekKwh = data.verbruikKwhPiek ?? 0;
  const gasM3 = data.verbruikGasM3;
  const dalRatio = totaalKwh > 0 ? dalKwh / totaalKwh : 0;

  /* ── Dal/piek optimalisatie ── */
  if (dalRatio < 0.5 && totaalKwh > 1000) {
    tips.push({
      icon: "🌙",
      titel: "Verschuif verbruik naar daltarief",
      beschrijving:
        "Je verbruikt relatief veel op piektarief. Wasmachine, droger en vaatwasser in de avond/nacht draaien scheelt al snel.",
      besparing: `€${Math.round(piekKwh * 0.05)}-${Math.round(piekKwh * 0.10)}/jaar`,
      prioriteit: 2,
    });
  }

  /* ── Hoog verbruik ── */
  if (totaalKwh > 5000) {
    tips.push({
      icon: "⚡",
      titel: "Hoog elektriciteitsverbruik",
      beschrijving:
        "Je verbruik is bovengemiddeld. Overweeg energiezuinige apparaten (A+++) en LED-verlichting.",
      besparing: "€100-300/jaar",
      prioriteit: 2,
    });
  }

  /* ── Zonnepanelen advies ── */
  if (apparaten.zonnepanelen === "zeker" || apparaten.zonnepanelen === "waarschijnlijk") {
    tips.push({
      icon: "☀️",
      titel: "Maximaliseer zonnepaneel-opbrengst",
      beschrijving:
        "Met zonnepanelen profiteer je het meest van een dynamisch contract of leverancier met hoge terugleververgoeding.",
      besparing: "€50-200/jaar",
      prioriteit: 1,
    });
  } else if (totaalKwh > 3000 && (data.terugleveringKwh === null || data.terugleveringKwh === 0)) {
    tips.push({
      icon: "☀️",
      titel: "Overweeg zonnepanelen",
      beschrijving:
        "Bij jouw verbruik zijn zonnepanelen binnen 5-7 jaar terugverdiend. Vraag een offerte aan.",
      besparing: "€300-600/jaar",
      prioriteit: 3,
    });
  }

  /* ── Elektrische auto ── */
  if (apparaten.elektrischeAuto === "zeker" || apparaten.elektrischeAuto === "waarschijnlijk") {
    tips.push({
      icon: "🚗",
      titel: "Slim laden bespaart flink",
      beschrijving:
        "Laad je auto zoveel mogelijk op daltarief of met een dynamisch contract wanneer stroom het goedkoopst is.",
      besparing: "€200-500/jaar",
      prioriteit: 1,
    });
  }

  /* ── Warmtepomp / All-electric ── */
  if (apparaten.warmtepomp === "zeker" || apparaten.warmtepomp === "waarschijnlijk") {
    tips.push({
      icon: "🌡️",
      titel: "All-electric tarief voordeliger",
      beschrijving:
        "Met een warmtepomp is een leverancier met laag kWh-tarief belangrijker dan een laag gastarief.",
      besparing: null,
      prioriteit: 1,
    });
  }

  /* ── Hoog gasverbruik ── */
  if (gasM3 != null && gasM3 > 1800) {
    tips.push({
      icon: "🔥",
      titel: "Hoog gasverbruik — isoleer je woning",
      beschrijving:
        "Je gasverbruik is bovengemiddeld. Spouwmuurisolatie, dakisolatie of HR++ glas besparen veel.",
      besparing: `€${Math.round(gasM3 * 0.15)}-${Math.round(gasM3 * 0.30)}/jaar`,
      prioriteit: 1,
    });
  }

  /* ── Stadsverwarming ── */
  if (apparaten.stadsverwarming === "waarschijnlijk" || apparaten.stadsverwarming === "zeker") {
    tips.push({
      icon: "🏢",
      titel: "Geen gas nodig",
      beschrijving:
        "Je hebt waarschijnlijk stadsverwarming. Kies een leverancier die alleen stroom levert voor het scherpste tarief.",
      besparing: null,
      prioriteit: 2,
    });
  }

  /* ── Dynamisch tarief suggestie ── */
  if (data.contractType === "Vast" && (apparaten.zonnepanelen === "zeker" || apparaten.elektrischeAuto === "waarschijnlijk")) {
    tips.push({
      icon: "📊",
      titel: "Overweeg dynamisch tarief",
      beschrijving:
        "Met zonnepanelen en/of een EV profiteer je extra van dynamische uurprijzen (Tibber, Frank Energie).",
      besparing: "€100-400/jaar",
      prioriteit: 2,
    });
  }

  /* ── Netbeheerkosten ── */
  if (data.netbeheerkosten != null && data.netbeheerkosten > 600) {
    tips.push({
      icon: "🔌",
      titel: "Check je netaansluiting",
      beschrijving:
        "Je netbeheerkosten zijn hoog. Mogelijk heb je een zwaardere aansluiting dan nodig. Verlagen kan €100+ schelen.",
      besparing: "€100-200/jaar",
      prioriteit: 3,
    });
  }

  /* ── Vastrecht ── */
  if (data.vastrecht != null && data.vastrecht > 90) {
    tips.push({
      icon: "💰",
      titel: "Hoog vastrecht",
      beschrijving:
        "Je betaalt relatief veel vastrecht. Sommige leveranciers rekenen €20-30/jaar minder.",
      besparing: "€20-30/jaar",
      prioriteit: 3,
    });
  }

  return tips.sort((a, b) => a.prioriteit - b.prioriteit);
}
