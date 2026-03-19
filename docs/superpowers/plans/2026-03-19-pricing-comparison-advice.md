# Pricing, Comparison & Switching Advice — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make insurance comparison accurate (correct pricing from uploads, apples-to-apples comparison on same coverage/deductible) and actionable (concrete switching advice with cancellation timeline).

**Architecture:** Three layers — (1) validation layer that normalizes parsed polis data, (2) comparison engine that enforces same-coverage matching, (3) advice UI that shows switching steps. Each layer is a separate file with clear boundaries.

**Tech Stack:** TypeScript, Next.js App Router, Anthropic Claude API, existing scraper framework.

**Spec:** `docs/superpowers/specs/2026-03-19-pricing-comparison-advice-design.md`

---

## File Structure

| File | Responsibility | Status |
|------|---------------|--------|
| `src/lib/polis-validation.ts` | Validate & normalize parsed polis data (period detection, sanity checks) | **New** |
| `src/lib/switching-advice.ts` | Calculate cancellation dates, generate switching steps | **New** |
| `src/lib/types.ts` | Add `premie_periode`, `_needsConfirmation` fields to PolisData | Modify |
| `src/app/api/parse-pdf/route.ts` | Add `premie_periode` to Claude prompt, call validation layer | Modify |
| `src/lib/polis-to-input.ts` | Pass `eigenRisico` through to scraper input | Modify |
| `src/lib/scrapers/base.ts` | Add optional `eigenRisico` to input types | Modify |
| `src/lib/scrapers/premium-model.ts` | Add eigen-risico factor to calculations | Modify |
| `src/lib/market-data.ts` | Add `eigenRisico` to fallback alternatives | Modify |
| `src/app/upload/page.tsx` | Confirmation banner for ambiguous premiums, improved manual wizard | Modify |
| `src/app/analyse/demo/page.tsx` | Coverage-matched results, switching advice block, upgrade tip | Modify |

---

## Task 1: Types — Add `premie_periode` and confirmation flags

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add new fields to PolisData**

In `src/lib/types.ts`, add these fields to the `PolisData` interface after `maandpremie`:

```typescript
premie_periode: "maand" | "jaar" | "kwartaal" | "onbekend";
_needsConfirmation?: boolean;
_confirmationQuestion?: string;
_needsManualInput?: boolean;
_reason?: string;
```

Note: `_needsManualInput` and `_reason` may already exist as ad-hoc properties (used with `as unknown as Record`). Formalizing them in the type prevents casting hacks.

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: May show errors where `_needsManualInput` was used via casting — these will be fixed in later tasks.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat(types): add premie_periode and confirmation flags to PolisData"
```

---

## Task 2: Polis validation layer

**Files:**
- Create: `src/lib/polis-validation.ts`

- [ ] **Step 1: Create the validation function**

Create `src/lib/polis-validation.ts`:

```typescript
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
      // The "maandpremie" is actually a quarterly amount
      const kwartaal = result.maandpremie;
      result.maandpremie = Math.round((kwartaal / 3) * 100) / 100;
      result.jaarpremie = Math.round(kwartaal * 4 * 100) / 100;
    }
  }

  if (result.premie_periode === "jaar") {
    if (result.maandpremie > 0 && result.jaarpremie === 0) {
      // Claude put the annual amount in maandpremie
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
  // Monthly premium > 500 is almost certainly an annual amount
  if (result.maandpremie > 500) {
    result.jaarpremie = result.maandpremie;
    result.maandpremie = Math.round((result.jaarpremie / 12) * 100) / 100;
    result._needsConfirmation = true;
    result._confirmationQuestion = `We lazen €${result.jaarpremie}. We denken dat dit een jaarbedrag is (€${result.maandpremie}/mnd). Klopt dit?`;
  }
  // Monthly premium > 100 is suspicious — ask user
  else if (result.maandpremie > 100 && result.premie_periode === "onbekend") {
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
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/polis-validation.ts
git commit -m "feat: add polis validation layer with period detection and sanity checks"
```

---

## Task 3: Update Claude prompt with `premie_periode`

**Files:**
- Modify: `src/app/api/parse-pdf/route.ts`

- [ ] **Step 1: Add `premie_periode` to the insurance schema in `PARSE_PROMPT`**

In the verzekering JSON schema section of `PARSE_PROMPT`, add after the `maandpremie` line:

```
  "premie_periode": "maand" | "jaar" | "kwartaal" | "onbekend" (hoe het bedrag in het document staat),
```

Add to the "Belangrijk bij verzekeringen" section:

```
- Geef bij premie_periode aan hoe het bedrag LETTERLIJK in het document staat (per maand, per jaar, per kwartaal)
- Als het document "jaarpremie" of "per jaar" zegt: premie_periode = "jaar"
- Als het document "maandpremie" of "per maand" zegt: premie_periode = "maand"
- Als het document "kwartaal" zegt: premie_periode = "kwartaal"
- Als het onduidelijk is: premie_periode = "onbekend"
- Als er een gecombineerde polis is (bv. inboedel + opstal samen), geef het TOTALE bedrag en zet type op het hoofdproduct
```

- [ ] **Step 2: Import and call validatePolisData after parsing**

Add import at top of file:

```typescript
import { validatePolisData } from "@/lib/polis-validation";
```

In the verzekering handling section, after `const { documentType: _, ...polisData } = parsed;`, add:

```typescript
// Set default premie_periode if Claude didn't provide it
if (!polisData.premie_periode) {
  polisData.premie_periode = "onbekend";
}
const validatedData = validatePolisData(polisData);
```

Then use `validatedData` instead of `polisData` in the `restorePii()` call and response.

- [ ] **Step 3: Do the same for the fallback prompt (PARSE_PROMPT_RAW) if it still exists**

Check if `PARSE_PROMPT_RAW` was removed. If yes, skip this step. The current route only has `PARSE_PROMPT` (anonymized flow).

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/parse-pdf/route.ts
git commit -m "feat: add premie_periode to Claude prompt and call validation layer"
```

---

## Task 4: Eigen risico in scraper inputs and premium model

**Files:**
- Modify: `src/lib/scrapers/base.ts`
- Modify: `src/lib/scrapers/premium-model.ts`
- Modify: `src/lib/polis-to-input.ts`

- [ ] **Step 1: Add `eigenRisico` to scraper input types**

In `src/lib/scrapers/base.ts`, add `eigenRisico?: number;` to `InboedelInput` and `OpstalInput` (after `dekking`).

- [ ] **Step 2: Add eigen-risico factor to premium model**

In `src/lib/scrapers/premium-model.ts`, add after the DEKKING_FACTORS:

```typescript
// Higher eigen risico = lower premium (discount factor)
const EIGEN_RISICO_FACTORS: Record<number, number> = {
  0: 1.00,
  50: 0.97,
  100: 0.94,
  150: 0.90,
  250: 0.85,
  500: 0.75,
};

function getEigenRisicoFactor(eigenRisico?: number): number {
  if (eigenRisico === undefined) return 1.00;
  // Find closest match
  const values = Object.keys(EIGEN_RISICO_FACTORS).map(Number);
  const closest = values.reduce((prev, curr) =>
    Math.abs(curr - eigenRisico) < Math.abs(prev - eigenRisico) ? curr : prev
  );
  return EIGEN_RISICO_FACTORS[closest] ?? 1.00;
}
```

Update `calculateInboedelPremium` and `calculateOpstalPremium` to include the factor:

```typescript
const er = getEigenRisicoFactor(input.eigenRisico);
return roundPremie(basePremie * postcode * woning * opp * gezin * dekking * er);
```

- [ ] **Step 3: Pass eigen risico through polis-to-input**

In `src/lib/polis-to-input.ts`, add a `parseEigenRisico` function:

```typescript
function parseEigenRisico(eigenRisico: string): number {
  const match = eigenRisico.match(/\d+/);
  return match ? parseInt(match[0], 10) : 0;
}
```

Add `eigenRisico: parseEigenRisico(polis.eigenRisico)` to both `polisToInboedelInput` and `polisToOpstalInput` return objects.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrapers/base.ts src/lib/scrapers/premium-model.ts src/lib/polis-to-input.ts
git commit -m "feat: add eigen-risico factor to premium calculations"
```

---

## Task 5: Update market-data fallback with eigen risico

**Files:**
- Modify: `src/lib/market-data.ts`

- [ ] **Step 1: Ensure all fallback alternatives have consistent `eigenRisico`**

In `src/lib/market-data.ts`, verify every `Alternative` in the arrays has a valid `eigenRisico` value (e.g., `"€ 0"`, `"€ 150"`). Add missing ones if needed.

The fallback data is used when the database is unavailable. It already has `eigenRisico` on most entries — verify they're all present and consistent format (`"€ X"`).

- [ ] **Step 2: Commit**

```bash
git add src/lib/market-data.ts
git commit -m "fix: ensure all fallback alternatives have eigenRisico values"
```

---

## Task 6: Premium confirmation UI on upload page

**Files:**
- Modify: `src/app/upload/page.tsx`

- [ ] **Step 1: Handle `_needsConfirmation` in the verzekering confirmation view**

In the verzekering confirmation view (after `if (parsedData)` around line 811), add a confirmation banner before the CTA when `parsedData._needsConfirmation` is true.

Add above the "CTA" section:

```tsx
{/* Premium confirmation banner */}
{parsedData._needsConfirmation && parsedData._confirmationQuestion && (
  <div className="bg-bw-orange-bg border border-[#FED7AA] rounded-xl px-4 py-4 mb-5 animate-fadeUp">
    <p className="text-[14px] font-semibold text-[#9A3412] mb-3">
      {parsedData._confirmationQuestion}
    </p>
    {parsedData._confirmationQuestion.includes("per maand of per jaar") ? (
      <div className="flex gap-2">
        <button
          onClick={() => {
            const { applyPeriodChoice } = require("@/lib/polis-validation");
            setParsedData(applyPeriodChoice(parsedData, "maand"));
          }}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white border border-bw-border cursor-pointer hover:bg-bw-bg transition-colors"
        >
          Per maand
        </button>
        <button
          onClick={() => {
            const { applyPeriodChoice } = require("@/lib/polis-validation");
            setParsedData(applyPeriodChoice(parsedData, "jaar"));
          }}
          className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white border border-bw-border cursor-pointer hover:bg-bw-bg transition-colors"
        >
          Per jaar
        </button>
      </div>
    ) : (
      <button
        onClick={() => setParsedData({ ...parsedData, _needsConfirmation: false })}
        className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white border border-bw-border cursor-pointer hover:bg-bw-bg transition-colors"
      >
        Ja, dit klopt
      </button>
    )}
  </div>
)}
```

Note: use a proper import instead of `require()` — add `import { applyPeriodChoice } from "@/lib/polis-validation"` at the top of the file.

- [ ] **Step 2: Disable the CTA button when confirmation is needed**

Add `disabled={parsedData._needsConfirmation}` to the "Vergelijk 12+ verzekeraars" button and add a disabled style:

```tsx
className={`... ${parsedData._needsConfirmation ? "opacity-50 cursor-not-allowed" : "hover:bg-bw-green-strong ..."}`}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/app/upload/page.tsx
git commit -m "feat(upload): add premium confirmation banner for ambiguous amounts"
```

---

## Task 7: Switching advice module

**Files:**
- Create: `src/lib/switching-advice.ts`

- [ ] **Step 1: Create the switching advice calculator**

Create `src/lib/switching-advice.ts`:

```typescript
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
  let isOpzegbaar = true;
  let waarschuwing: string | null = null;

  if (einddatum && opzegMaanden !== null) {
    // Calculate earliest cancellation date
    vroegsteOpzeg = new Date(einddatum);
    vroegsteOpzeg.setMonth(vroegsteOpzeg.getMonth() - opzegMaanden);

    const now = new Date();
    if (vroegsteOpzeg < now) {
      // Deadline passed — can cancel for next renewal
      const nextRenewal = new Date(einddatum);
      nextRenewal.setFullYear(nextRenewal.getFullYear() + 1);
      vroegsteOpzeg = new Date(nextRenewal);
      vroegsteOpzeg.setMonth(vroegsteOpzeg.getMonth() - opzegMaanden);
    }

    // Warning if deadline is within 30 days
    const daysUntilDeadline = Math.ceil(
      (vroegsteOpzeg.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntilDeadline <= 30 && daysUntilDeadline > 0) {
      waarschuwing = `Let op: je moet voor ${formatDate(vroegsteOpzeg)} opzeggen! Dat is over ${daysUntilDeadline} dagen.`;
    }
  } else {
    // No contract end date — assume monthly cancellable
    isOpzegbaar = true;
  }

  const stappen: SwitchStep[] = [
    {
      nummer: 1,
      titel: `Sluit je nieuwe polis af bij ${nieuweVerzekeraar}`,
      beschrijving: affiliateUrl
        ? `Bereken je premie en sluit direct af via onze link.`
        : `Ga naar de website van ${nieuweVerzekeraar} en bereken je premie.`,
    },
    {
      nummer: 2,
      titel: `Zeg je huidige polis op bij ${huidigeVerzekeraar}`,
      beschrijving: opzegMaanden !== null
        ? `Opzegtermijn: ${opzegMaanden} maand${opzegMaanden !== 1 ? "en" : ""} voor de einddatum.${vroegsteOpzeg ? ` Opzeggen voor: ${formatDate(vroegsteOpzeg)}.` : ""}`
        : `Check je polisvoorwaarden voor de opzegtermijn.`,
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
  return num; // assume months
}

function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  // Try various Dutch date formats
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  // Try DD-MM-YYYY
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
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/lib/switching-advice.ts
git commit -m "feat: add switching advice calculator with cancellation date logic"
```

---

## Task 8: Analyse page — coverage-matched results + switching advice

**Files:**
- Modify: `src/app/analyse/demo/page.tsx`

This is the largest task. The demo page needs three changes:

- [ ] **Step 1: Show coverage match confirmation on result cards**

In the alternative card rendering (the `.map()` over `filteredAndSorted`), add the user's dekking + eigenRisico to each card. After the premie display, add:

```tsx
<div className="text-[11px] text-bw-text-light mt-1">
  {polisData.dekking} · {polisData.eigenRisico || "€ 0"} eigen risico
</div>
```

This confirms to the user that the comparison uses matching coverage.

- [ ] **Step 2: Add "Tip van je agent" upgrade suggestion**

After the top-3 results, conditionally show an upgrade tip. Add a component after the results list:

```tsx
{/* Upgrade tip — only for Basis/Uitgebreid users */}
{(polisData.dekking.toLowerCase().includes("basis") ||
  (polisData.dekking.toLowerCase().includes("uitgebreid") && !polisData.dekking.toLowerCase().includes("extra"))) && (() => {
  // Find cheapest upgrade option
  const nextLevel = polisData.dekking.toLowerCase().includes("basis") ? "Uitgebreid" : "Extra Uitgebreid";
  const upgradeAlt = alternatives
    .filter(a => a.dekking === nextLevel)
    .sort((a, b) => a.premie - b.premie)[0];
  const currentCheapest = filteredAndSorted[0];
  if (!upgradeAlt || !currentCheapest) return null;
  const extraPerMonth = upgradeAlt.premie - currentCheapest.premie;
  if (extraPerMonth > 5 || extraPerMonth <= 0) return null;
  return (
    <div className="bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl p-4 mt-4">
      <div className="flex items-start gap-2">
        <span className="text-[16px]">💡</span>
        <div>
          <div className="text-[13px] font-bold text-bw-deep mb-0.5">Tip van je agent</div>
          <div className="text-[13px] text-bw-text-mid">
            Voor €{extraPerMonth.toFixed(2)}/mnd meer krijg je {nextLevel} dekking bij {upgradeAlt.naam}.
          </div>
        </div>
      </div>
    </div>
  );
})()}
```

- [ ] **Step 3: Add switching advice block**

Import the switching advice module and render it below the results. Add import:

```typescript
import { calculateSwitchingAdvice } from "@/lib/switching-advice";
```

After the results section, add:

```tsx
{/* Switching advice */}
{heeftBesparing && besteSaving && (() => {
  const advice = calculateSwitchingAdvice(
    polisData.opzegtermijn,
    polisData.verlengingsdatum,
    polisData.ingangsdatum,
    polisData.verzekeraar,
    besteSaving.naam,
    besteSaving.url,
  );
  return (
    <div className="bg-white rounded-xl border border-bw-border p-5 mt-6">
      <h3 className="text-[16px] font-bold text-bw-deep mb-4">
        Overstappen naar {besteSaving.naam}
      </h3>
      {advice.waarschuwing && (
        <div className="bg-bw-orange-bg border border-[#FED7AA] rounded-lg px-3 py-2 mb-4 text-[13px] text-[#9A3412] font-medium">
          ⚠ {advice.waarschuwing}
        </div>
      )}
      <div className="space-y-4">
        {advice.stappen.map((stap) => (
          <div key={stap.nummer} className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-bw-green text-white text-[12px] font-bold flex items-center justify-center shrink-0">
              {stap.nummer}
            </div>
            <div>
              <div className="text-[14px] font-semibold text-bw-deep">{stap.titel}</div>
              <div className="text-[13px] text-bw-text-mid">{stap.beschrijving}</div>
              {stap.nummer === 1 && besteSaving.url && (
                <a
                  href={besteSaving.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 mt-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-bw-green text-white hover:bg-bw-green-strong transition-colors no-underline"
                >
                  Bekijk bij {besteSaving.naam} →
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
})()}
```

- [ ] **Step 4: Add WhatsApp monitoring CTA at bottom**

After the switching advice block:

```tsx
<div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-4 mt-4 text-center">
  <div className="text-[14px] font-semibold text-bw-deep mb-1">Premie blijven bewaken?</div>
  <div className="text-[13px] text-bw-text-mid mb-3">
    We checken dagelijks of er een betere deal is en sturen je een WhatsApp.
  </div>
  <a
    href={`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '14155238886'}?text=${encodeURIComponent('Hoi, ik wil mijn premie laten bewaken')}`}
    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold bg-[#25D366] text-white hover:bg-[#20BD5A] transition-colors no-underline"
  >
    💬 Start WhatsApp-bewaking
  </a>
</div>
```

- [ ] **Step 5: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/app/analyse/demo/page.tsx
git commit -m "feat(analyse): coverage-matched results, switching advice, upgrade tip"
```

---

## Task 9: Edge case — unsupported product types

**Files:**
- Modify: `src/app/api/parse-pdf/route.ts`

- [ ] **Step 1: Detect unsupported product types**

In the verzekering handling section, after determining `productType`, add:

```typescript
const SUPPORTED_TYPES = ["inboedel", "opstal", "aansprakelijkheid", "reis"];
const unsupportedLabels: Record<string, string> = {
  auto: "Autoverzekering",
  zorg: "Zorgverzekering",
  rechtsbijstand: "Rechtsbijstandverzekering",
  uitvaart: "Uitvaartverzekering",
  leven: "Levensverzekering",
  onbekend: "Onbekend",
};

if (!SUPPORTED_TYPES.includes(productType)) {
  const label = unsupportedLabels[productType] || polisData.type || "Dit type verzekering";
  return NextResponse.json({
    type: "verzekering",
    polisData: validatedData,
    productType,
    unsupported: true,
    unsupportedMessage: `${label} vergelijken we helaas nog niet. We ondersteunen momenteel: inboedel, opstal, aansprakelijkheid en reisverzekeringen.`,
    anonymized: { text: "", piiCount: anonResult.piiCount, personalData: piiFields, method: "ollama" },
  });
}
```

- [ ] **Step 2: Handle `unsupported` response in upload page**

In `src/app/upload/page.tsx`, in the `handleFile` callback where `json.type === "verzekering"` is handled, add after setting `setParsedData`:

```typescript
if (json.unsupported) {
  setUploadError(json.unsupportedMessage);
  setIsUploading(false);
  return;
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/app/api/parse-pdf/route.ts src/app/upload/page.tsx
git commit -m "feat: detect and handle unsupported insurance product types"
```

---

## Task 10: Final integration test

- [ ] **Step 1: Manual test — upload a real insurance PDF**

Start dev server (`npm run dev`), navigate to `/upload`, upload an insurance PDF. Verify:
- Premium is correctly detected (month vs year)
- Confirmation banner appears for ambiguous amounts
- "Gegevens aanpassen" works for both insurance and energy

- [ ] **Step 2: Manual test — comparison page**

Click "Vergelijk 12+ verzekeraars". Verify:
- Results show matching coverage/eigen risico
- Switching advice block appears with correct steps
- Upgrade tip appears when applicable
- WhatsApp CTA is shown

- [ ] **Step 3: Manual test — edge cases**

Test with:
- A document with no premie (should show manual input wizard)
- An auto insurance document (should show "not supported" message)
- A high premium amount (should show confirmation question)

- [ ] **Step 4: Verify production build**

Run: `npm run build`
Expected: Build succeeds without errors.

- [ ] **Step 5: Final commit and push**

```bash
git push
```
