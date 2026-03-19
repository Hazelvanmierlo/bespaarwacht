export interface SwitchingAdvice {
  canSwitch: boolean;
  vroegsteOpzegdatum: string | null;
  opzegtermijnMaanden: number | null;
  isOpzegbaar: boolean;
  waarschuwing: string | null;
  stappen: SwitchStep[];
}

export interface SwitchStep {
  nummer: number;
  titel: string;
  beschrijving: string;
  datum?: string;
}

/**
 * Calculate switching advice based on policy data.
 */
export function calculateSwitchingAdvice(
  opzegtermijn: string,
  verlengingsdatum: string,
  ingangsdatum: string,
  huidigeVerzekeraar: string,
  nieuweVerzekeraar: string,
  affiliateUrl?: string,
): SwitchingAdvice {
  const opzegMaanden = parseOpzegtermijn(opzegtermijn);
  const einddatum = parseDate(verlengingsdatum) || parseDate(ingangsdatum);

  let vroegsteOpzeg: Date | null = null;
  const isOpzegbaar = true;
  let waarschuwing: string | null = null;

  if (einddatum && opzegMaanden !== null) {
    vroegsteOpzeg = new Date(einddatum);
    vroegsteOpzeg.setMonth(vroegsteOpzeg.getMonth() - opzegMaanden);

    const now = new Date();
    if (vroegsteOpzeg < now) {
      const nextRenewal = new Date(einddatum);
      nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
      vroegsteOpzeg = new Date(nextRenewal);
      vroegsteOpzeg.setMonth(vroegsteOpzeg.getMonth() - opzegMaanden);
    }

    const daysUntilDeadline = Math.ceil(
      (vroegsteOpzeg.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDeadline <= 30 && daysUntilDeadline > 0) {
      waarschuwing = `Let op: je moet voor ${formatDate(vroegsteOpzeg)} opzeggen! Dat is over ${daysUntilDeadline} dagen.`;
    }
  }

  const stappen: SwitchStep[] = [
    {
      nummer: 1,
      titel: `Sluit je nieuwe polis af bij ${nieuweVerzekeraar}`,
      beschrijving: affiliateUrl
        ? "Bereken je premie en sluit direct af via onze link."
        : `Ga naar de website van ${nieuweVerzekeraar} en bereken je premie.`,
    },
    {
      nummer: 2,
      titel: `Zeg je huidige polis op bij ${huidigeVerzekeraar}`,
      beschrijving: opzegMaanden !== null
        ? `Opzegtermijn: ${opzegMaanden} maand${opzegMaanden !== 1 ? "en" : ""} voor de einddatum.${vroegsteOpzeg ? ` Opzeggen voor: ${formatDate(vroegsteOpzeg)}.` : ""}`
        : "Check je polisvoorwaarden voor de opzegtermijn.",
    },
    {
      nummer: 3,
      titel: "Controleer dat er geen gat ontstaat",
      beschrijving: "Zorg dat je nieuwe polis ingaat op de dag dat je oude polis eindigt. Zo ben je altijd verzekerd.",
    },
  ];

  return {
    canSwitch: true,
    vroegsteOpzegdatum: vroegsteOpzeg ? formatDate(vroegsteOpzeg) : null,
    opzegtermijnMaanden: opzegMaanden,
    isOpzegbaar,
    waarschuwing,
    stappen,
  };
}

function parseOpzegtermijn(termijn: string): number | null {
  if (!termijn) return null;
  const match = termijn.match(/(\d+)/);
  if (!match) return null;
  const num = parseInt(match[1], 10);
  if (termijn.toLowerCase().includes("dag")) return Math.ceil(num / 30);
  return num;
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const match = dateStr.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (match) return new Date(+match[3], +match[2] - 1, +match[1]);
  return null;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
