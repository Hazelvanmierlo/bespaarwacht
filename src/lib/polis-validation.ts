import type { PolisData } from "./types";

/**
 * Validates and normalizes parsed polis data.
 * Detects period mismatches, corrects obvious errors,
 * and flags ambiguous values for user confirmation.
 */
export function validatePolisData(data: PolisData): PolisData {
  const result = { ...data };

  // 1. Normalize based on premie_periode
  if (result.premie_periode === "kwartaal") {
    if (result.maandpremie > 0 && result.jaarpremie === 0) {
      const kwartaal = result.maandpremie;
      result.maandpremie = Math.round((kwartaal / 3) * 100) / 100;
      result.jaarpremie = Math.round(kwartaal * 4 * 100) / 100;
    }
  }

  if (result.premie_periode === "jaar") {
    if (result.maandpremie > 0 && result.jaarpremie === 0) {
      result.jaarpremie = result.maandpremie;
      result.maandpremie = Math.round((result.jaarpremie / 12) * 100) / 100;
    }
  }

  // 2. Fill in missing counterpart
  if (result.maandpremie > 0 && result.jaarpremie === 0) {
    result.jaarpremie = Math.round(result.maandpremie * 12 * 100) / 100;
  }
  if (result.jaarpremie > 0 && result.maandpremie === 0) {
    result.maandpremie = Math.round((result.jaarpremie / 12) * 100) / 100;
  }

  // 3. Sanity checks
  if (result.maandpremie > 500) {
    result.jaarpremie = result.maandpremie;
    result.maandpremie = Math.round((result.jaarpremie / 12) * 100) / 100;
    result._needsConfirmation = true;
    result._confirmationQuestion = `We lazen €${result.jaarpremie}. We denken dat dit een jaarbedrag is (€${result.maandpremie}/mnd). Klopt dit?`;
  } else if (result.maandpremie > 100 && result.premie_periode === "onbekend") {
    result._needsConfirmation = true;
    result._confirmationQuestion = `We lazen €${result.maandpremie}. Is dit per maand of per jaar?`;
  }

  // 4. No premium found at all
  if (result.maandpremie < 1 && result.jaarpremie < 1) {
    result._needsManualInput = true;
    result._reason = "We konden geen premie vinden in je document. Vul je maandpremie in zodat we kunnen vergelijken.";
  }

  // 5. Old policy warning (>2 years)
  if (result.ingangsdatum) {
    try {
      const start = new Date(result.ingangsdatum);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      if (start < twoYearsAgo && !result._needsConfirmation) {
        result._needsConfirmation = true;
        result._confirmationQuestion = `Deze polis is van ${start.getFullYear()}. Je huidige premie kan anders zijn. Klopt €${result.maandpremie}/mnd nog?`;
      }
    } catch { /* invalid date, ignore */ }
  }

  return result;
}

/**
 * Apply user's confirmation choice (maand vs jaar).
 */
export function applyPeriodChoice(
  data: PolisData,
  choice: "maand" | "jaar"
): PolisData {
  const result = { ...data };
  if (choice === "jaar") {
    result.jaarpremie = result.maandpremie;
    result.maandpremie = Math.round((result.jaarpremie / 12) * 100) / 100;
  } else {
    result.jaarpremie = Math.round(result.maandpremie * 12 * 100) / 100;
  }
  result._needsConfirmation = false;
  result._confirmationQuestion = undefined;
  result.premie_periode = choice;
  return result;
}
