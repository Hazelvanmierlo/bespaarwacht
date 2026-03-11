# Fix Live Inboedel Scrapers — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 6 inboedel live scrapers to return accurate premiums, with improved shared utilities for logging, field filling, waiting, and price extraction.

**Architecture:** Enhance shared utilities in `playwright/utils.ts` first, then fix each scraper one at a time against the live website. Each scraper uses the new logger, findAndFill, waitForStep, and extractPrice utilities. The live-wrapper gets a 60-second timeout and expanded input mapping.

**Tech Stack:** Playwright, TypeScript, Supabase (migration), Next.js API routes

**Spec:** `docs/superpowers/specs/2026-03-11-fix-live-scrapers-design.md`

---

## Chunk 1: Shared Utilities & Infrastructure

### Task 1: Add step logger to `utils.ts`

**Files:**
- Modify: `src/lib/scrapers/playwright/utils.ts`

- [ ] **Step 1: Add `createLogger` function**

Add to `src/lib/scrapers/playwright/utils.ts`:

```typescript
export interface StepLogger {
  log: (step: string, detail?: string) => void;
  fail: (step: string, error: string) => void;
  getSteps: () => string[];
}

export function createLogger(scraperName: string): StepLogger {
  const steps: string[] = [];
  return {
    log(step: string, detail?: string) {
      const msg = `[${scraperName}] ${step}${detail ? ` — ${detail}` : ""} ✓`;
      steps.push(msg);
      console.log(msg);
    },
    fail(step: string, error: string) {
      const msg = `[${scraperName}] ${step} — FAILED: ${error}`;
      steps.push(msg);
      console.warn(msg);
    },
    getSteps: () => steps,
  };
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add src/lib/scrapers/playwright/utils.ts
git commit -m "feat(scrapers): add step logger utility for diagnostics"
```

---

### Task 2: Add `waitForStep` to `utils.ts`

**Files:**
- Modify: `src/lib/scrapers/playwright/utils.ts`

- [ ] **Step 1: Add `waitForStep` function**

Add to `src/lib/scrapers/playwright/utils.ts`:

```typescript
/**
 * Wait for a page transition or element to appear.
 * Replaces arbitrary waitForTimeout() calls.
 */
export async function waitForStep(
  page: Page,
  options?: { selector?: string; text?: string; timeout?: number }
): Promise<boolean> {
  const timeout = options?.timeout ?? 5000;
  try {
    if (options?.selector) {
      await page.waitForSelector(options.selector, { state: "visible", timeout });
      return true;
    }
    if (options?.text) {
      await page.getByText(options.text).first().waitFor({ state: "visible", timeout });
      return true;
    }
    // Default: wait for DOM to settle
    await page.waitForLoadState("domcontentloaded", { timeout });
    return true;
  } catch {
    return false;
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add src/lib/scrapers/playwright/utils.ts
git commit -m "feat(scrapers): add waitForStep utility"
```

---

### Task 3: Enhance `fillField` to return success/method info

**Files:**
- Modify: `src/lib/scrapers/playwright/utils.ts`

- [ ] **Step 1: Update `fillField` return type and add `getByRole` strategy**

The existing `fillField()` already tries attribute selectors → labels → placeholders. Enhance it by:
1. Adding `page.getByRole('textbox', { name })` as a fallback after placeholder
2. Changing return type to `{ success: boolean, method: string }` instead of plain `boolean`

```typescript
export interface FillResult {
  success: boolean;
  method: string;
}

export async function fillField(
  page: Page,
  attrSelectors: string,
  labelTexts: string[],
  value: string,
  options?: { timeout?: number; useKeyboard?: boolean }
): Promise<FillResult> {
  const timeout = options?.timeout ?? 3000;
  const useKeyboard = options?.useKeyboard ?? false;

  async function doFill(el: any) {
    if (useKeyboard) {
      await el.click();
      await el.pressSequentially(value, { delay: 30 });
    } else {
      await el.fill(value);
    }
  }

  // Try attribute-based selectors first (fastest)
  try {
    const attrInput = page.locator(attrSelectors).first();
    if (await attrInput.isVisible({ timeout })) {
      await doFill(attrInput);
      return { success: true, method: "attribute" };
    }
  } catch { /* try label fallback */ }

  // Try label-based lookup
  for (const label of labelTexts) {
    try {
      const labelInput = page.getByLabel(label, { exact: false });
      if (await labelInput.isVisible({ timeout: 1500 })) {
        await doFill(labelInput);
        return { success: true, method: "label" };
      }
    } catch { /* try next */ }
  }

  // Try placeholder-based lookup
  for (const label of labelTexts) {
    try {
      const placeholderInput = page.getByPlaceholder(label, { exact: false });
      if (await placeholderInput.isVisible({ timeout: 1500 })) {
        await doFill(placeholderInput);
        return { success: true, method: "placeholder" };
      }
    } catch { /* try next */ }
  }

  // Try role-based lookup
  for (const label of labelTexts) {
    try {
      const roleInput = page.getByRole("textbox", { name: label });
      if (await roleInput.isVisible({ timeout: 1500 })) {
        await doFill(roleInput);
        return { success: true, method: "role" };
      }
    } catch { /* try next */ }
  }

  return { success: false, method: "none" };
}
```

- [ ] **Step 2: Update existing callers**

Existing scrapers use `fillField` with a `boolean` return — they check `if (await fillField(...))`. Since `FillResult` is truthy, most callers won't break. But update any callers that do `=== true` to use `.success` instead.

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/playwright/utils.ts
git commit -m "feat(scrapers): enhance fillField with role-based fallback and structured return"
```

---

### Task 5: Add `extractPrice` to `utils.ts`

**Files:**
- Modify: `src/lib/scrapers/playwright/utils.ts`

- [ ] **Step 1: Add `extractPrice` function**

Add to `src/lib/scrapers/playwright/utils.ts`:

```typescript
/**
 * Extract a monthly premium price from page text.
 * Searches within a section if sectionLabel is provided.
 */
export async function extractPrice(
  page: Page,
  options?: { sectionLabel?: string; minPrice?: number; maxPrice?: number }
): Promise<number | null> {
  const min = options?.minPrice ?? 2;
  const max = options?.maxPrice ?? 200;

  const allText = await page.locator("body").innerText();
  let searchText = allText;

  // Narrow to section if label provided
  if (options?.sectionLabel) {
    const idx = searchText.toLowerCase().indexOf(options.sectionLabel.toLowerCase());
    if (idx !== -1) {
      searchText = searchText.substring(idx, idx + 500);
    }
  }

  // Try "€ X,XX per maand" patterns first (most specific)
  const patterns = [
    /€\s*(\d{1,3})\s*[,.]\s*(\d{2})\s*(?:\r?\n|\s)*(?:per maand|p\/m|\/mnd)/gi,
    /(?:per maand|p\/m|\/mnd)\s*€?\s*(\d{1,3})\s*[,.]\s*(\d{2})/gi,
    /(?:Maandpremie|Uw premie|Maandbedrag)[^\n]*?€?\s*(\d{1,3})\s*[,.]\s*(\d{2})/gi,
  ];

  for (const pattern of patterns) {
    const matches = [...searchText.matchAll(pattern)];
    for (const match of matches) {
      const price = parseFloat(`${match[1]}.${match[2]}`);
      if (price >= min && price <= max) return price;
    }
  }

  // Fallback: any €X,XX in the section
  const fallback = [...searchText.matchAll(/€\s*(\d{1,3})\s*[,.]\s*(\d{2})/g)];
  for (const match of fallback) {
    const price = parseFloat(`${match[1]}.${match[2]}`);
    if (price >= min && price <= max) return price;
  }

  return null;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add src/lib/scrapers/playwright/utils.ts
git commit -m "feat(scrapers): add extractPrice utility"
```

---

### Task 6: Expand `LiveScraperInput` and add `stepLog` to `LiveScraperResult`

**Files:**
- Modify: `src/lib/scrapers/playwright/utils.ts`

- [ ] **Step 1: Update `LiveScraperInput` interface**

In `src/lib/scrapers/playwright/utils.ts`, replace the existing `LiveScraperInput`:

```typescript
/** Standard input interface for all live scrapers */
export interface LiveScraperInput {
  postcode: string;
  huisnummer: string;
  geboortedatum: string;          // required — no hardcoded defaults
  gezin: string;                   // "alleenstaand" | "gezin" (matches InboedelInput)
  eigenaar?: boolean;              // true = eigenaar, false = huurder (default: false)
  woningtype?: string;             // "appartement" | "tussenwoning" | etc.
}
```

- [ ] **Step 2: Add `stepLog` to `LiveScraperResult`**

Update `LiveScraperResult`:

```typescript
/** Standard result interface for all live scrapers */
export interface LiveScraperResult {
  status: "success" | "error";
  premie?: number;
  dekking?: string;
  eigenRisico?: string;
  error?: string;
  duration_ms: number;
  stepLog?: string[];
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit --pretty`

This will likely show errors in scrapers that use `geboortedatum ?? "15-06-1985"` since it's now required. That's expected — we'll fix each scraper in subsequent tasks.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/playwright/utils.ts
git commit -m "feat(scrapers): expand LiveScraperInput with required geboortedatum, add stepLog to result"
```

---

### Task 7: Update `live-wrapper.ts` — timeout, input mapping, geboortedatum guard

**Files:**
- Modify: `src/lib/scrapers/playwright/live-wrapper.ts`

- [ ] **Step 1: Add 60s timeout and geboortedatum guard to `LiveInboedelScraper.run()`**

In `src/lib/scrapers/playwright/live-wrapper.ts`, update the `LiveInboedelScraper.run()` method. Replace the existing `if (i.huisnummer)` block:

```typescript
  async run(input: ScraperInput): Promise<ScraperResult> {
    const start = Date.now();
    const i = input as InboedelInput;

    // Guard: skip live scraping if required fields are missing
    if (i.huisnummer && i.geboortedatum) {
      try {
        const liveInput: LiveScraperInput = {
          postcode: i.postcode,
          huisnummer: i.huisnummer,
          geboortedatum: i.geboortedatum,
          gezin: i.gezin ?? "alleenstaand",
          eigenaar: i.eigenaar ?? false,
          woningtype: i.woningtype,
        };

        // 60-second wall-clock timeout
        const result = await Promise.race([
          this.liveScraper(liveInput),
          new Promise<LiveScraperResult>((_, reject) =>
            setTimeout(() => reject(new Error("Live scraper timeout (60s)")), 60000)
          ),
        ]);

        if (result.status === "success" && result.premie && result.premie > 0) {
          return {
            slug: this.slug, status: "success",
            premie: result.premie,
            dekking: result.dekking ?? getDekkingLabel(i.dekking),
            eigenRisico: result.eigenRisico ?? this.defaultEigenRisico,
            duration_ms: Date.now() - start, source: "live",
            stepLog: result.stepLog,
          };
        }
        console.warn(`[scraper:${this.slug}] Live returned status="${result.status}" premie=${result.premie ?? "none"}, falling back to calculated`);
      } catch (err) {
        console.warn(`[scraper:${this.slug}] Live scrape failed, falling back to calculated:`, (err as Error).message);
      }
    }

    const premie = calculateInboedelPremium(this.basePremie, i);
    return {
      slug: this.slug, status: "success", premie,
      dekking: getDekkingLabel(i.dekking), eigenRisico: this.defaultEigenRisico,
      duration_ms: Date.now() - start, source: "calculated",
    };
  }
```

- [ ] **Step 2: Add `stepLog` to `ScraperResult` in `base.ts`**

In `src/lib/scrapers/base.ts`, add `stepLog` to `ScraperResult`:

```typescript
export interface ScraperResult {
  slug: string;
  status: "success" | "error" | "timeout";
  premie?: number;
  dekking?: string;
  eigenRisico?: string;
  duration_ms: number;
  error?: string;
  source?: "live" | "calculated";
  stepLog?: string[];
}
```

- [ ] **Step 3: Add `LiveScraperInput` import to `live-wrapper.ts`**

Make sure the import includes the updated type:

```typescript
import type { LiveScraperInput, LiveScraperResult } from "./utils";
```

(already imported — just verify the types match after the interface change)

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 5: Commit**

```bash
git add src/lib/scrapers/playwright/live-wrapper.ts src/lib/scrapers/base.ts
git commit -m "feat(scrapers): add 60s timeout, geboortedatum guard, stepLog passthrough"
```

---

### Task 8: Add `step_log` column to `scraper_runs`

**Files:**
- Create: `supabase/migration-step-log.sql`

- [ ] **Step 1: Write migration**

```sql
-- Add step_log column for scraper diagnostic traces
ALTER TABLE scraper_runs ADD COLUMN IF NOT EXISTS step_log text[];
```

- [ ] **Step 2: Run migration on Supabase**

Run via Supabase dashboard SQL editor or CLI.

- [ ] **Step 3: Commit**

```bash
git add supabase/migration-step-log.sql
git commit -m "feat(db): add step_log column to scraper_runs for diagnostics"
```

---

### Task 9: Persist `stepLog` to `scraper_runs` table

**Files:**
- Modify: `src/app/api/scrape/route.ts`
- Modify: `src/app/api/scrape/live/route.ts`
- Modify: `src/app/api/cron/scrape/route.ts`

The `step_log` column exists (Task 8) and `ScraperResult.stepLog` is populated (Task 7), but no API route actually writes it to the database yet.

- [ ] **Step 1: Update all `scraper_runs` insert calls to include `step_log`**

In each of the 3 API routes, find the `supabase.from("scraper_runs").insert({...})` call and add `step_log: result.stepLog ?? null` to the insert object.

Example (for `src/app/api/scrape/route.ts`):
```typescript
await supabase.from("scraper_runs").insert({
  verzekeraar_id: verzekeraar.id,
  status: result.status,
  premie_gevonden: result.premie ?? null,
  duration_ms: result.duration_ms,
  error_message: result.error ?? null,
  step_log: result.stepLog ?? null,  // ← add this line
});
```

Apply the same change to `src/app/api/scrape/live/route.ts` and `src/app/api/cron/scrape/route.ts`.

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/scrape/route.ts src/app/api/scrape/live/route.ts src/app/api/cron/scrape/route.ts
git commit -m "feat(scrapers): persist stepLog to scraper_runs.step_log"
```

---

### Task 10: Wire InShared and OHRA into live scraper registry

**Files:**
- Modify: `src/lib/scrapers/inboedel/index.ts`

Currently InShared and OHRA have live scraper files but aren't registered when `ENABLE_LIVE_SCRAPERS=true`. They need to be added alongside the existing 4.

- [ ] **Step 1: Add InShared and OHRA to `buildScrapers()`**

In `src/lib/scrapers/inboedel/index.ts`, update the `buildScrapers()` function to include all 6 scrapers. Add imports and instances:

```typescript
import { BaseScraper } from "../base";
import { AsrScraper } from "./asr";
import { CentraalBeheerScraper } from "./centraal-beheer";
import { FbtoScraper } from "./fbto";
import { InterpolisScraper } from "./interpolis";
import { InSharedScraper } from "./inshared";
import { OhraScraper } from "./ohra";

const LIVE_SCRAPERS_ENABLED = process.env.ENABLE_LIVE_SCRAPERS === "true";

const calculatedScrapers: BaseScraper[] = [
  new AsrScraper(),
  new CentraalBeheerScraper(),
  new FbtoScraper(),
  new InterpolisScraper(),
  new InSharedScraper(),
  new OhraScraper(),
];

function buildScrapers(): BaseScraper[] {
  if (!LIVE_SCRAPERS_ENABLED) return calculatedScrapers;

  try {
    const { LiveInboedelScraper } = require("../playwright/live-wrapper");
    const { scrapeAsrInboedel } = require("../playwright/inboedel/asr-live");
    const { scrapeCentraalBeheer } = require("../playwright/centraal-beheer-live");
    const { scrapeFbtoInboedel } = require("../playwright/inboedel/fbto-live");
    const { scrapeInterpolisInboedel } = require("../playwright/inboedel/interpolis-live");
    const { scrapeInShared } = require("../playwright/inshared-live");
    const { scrapeOhra } = require("../playwright/ohra-live");

    return [
      new LiveInboedelScraper("asr", "a.s.r.", 8.42, "€ 0", scrapeAsrInboedel),
      new LiveInboedelScraper("centraal-beheer", "Centraal Beheer", 11.85, "€ 0", scrapeCentraalBeheer),
      new LiveInboedelScraper("fbto", "FBTO", 12.10, "€ 0", scrapeFbtoInboedel),
      new LiveInboedelScraper("interpolis", "Interpolis", 13.40, "€ 0", scrapeInterpolisInboedel),
      new LiveInboedelScraper("inshared", "InShared", 9.50, "€ 0", scrapeInShared),
      new LiveInboedelScraper("ohra", "OHRA", 10.20, "€ 0", scrapeOhra),
    ];
  } catch (err) {
    console.warn("[DVA] Playwright niet beschikbaar, fallback naar berekende premies:", (err as Error).message);
    return calculatedScrapers;
  }
}

export const inboedelScrapers: BaseScraper[] = buildScrapers();
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit --pretty`

- [ ] **Step 3: Commit**

```bash
git add src/lib/scrapers/inboedel/index.ts
git commit -m "feat(scrapers): wire InShared and OHRA into live scraper registry"
```

---

## Chunk 2: Fix Individual Scrapers

For each scraper, the approach is:
1. Navigate the live website using Playwright to verify the current form flow
2. Update the scraper code to match the actual flow
3. Add step logging throughout
4. Use the shared `extractPrice` utility
5. Remove hardcoded defaults
6. Test against a real address

**Test addresses to use:**
- `1181EC` huisnummer `10` (Amsterdam, tussenwoning)
- `3011GH` huisnummer `1` (Rotterdam)
- `5611AE` huisnummer `1` (Eindhoven)

### Task 11: Fix Centraal Beheer live scraper

**Files:**
- Modify: `src/lib/scrapers/playwright/centraal-beheer-live.ts`

- [ ] **Step 1: Navigate CB website manually to verify current flow**

Use Playwright to navigate `https://www.centraalbeheer.nl/verzekeringen/woonverzekering/premie-berekenen` and document:
- What the login bypass looks like now
- What address fields exist and their selectors
- What the eigenaar/huurder step looks like
- What the geboortedatum/gezin step looks like
- How many "Nee" steps exist
- Where the premium appears on the results page

Take an accessibility snapshot at each step to identify reliable selectors.

- [ ] **Step 2: Rewrite the scraper with logger, proper selectors, and input mapping**

Rewrite `src/lib/scrapers/playwright/centraal-beheer-live.ts` based on the actual website flow discovered in step 1. Key changes:
- Add `createLogger("CB-inboedel")` and log every step
- Use `input.geboortedatum` (required, no default)
- Map `input.gezin` to CB's gezinssamenstelling dropdown values
- Map `input.eigenaar` to the eigenaar/huurder radio
- Use `waitForStep()` instead of `waitForTimeout()`
- Use `extractPrice(page, { sectionLabel: "Inboedelverzekering" })` at the end
- Return `stepLog: logger.getSteps()` in the result

- [ ] **Step 3: Test against real address**

Run: `ENABLE_LIVE_SCRAPERS=true npx tsx --env-file=.env.local -e "
const { scrapeCentraalBeheer } = require('./src/lib/scrapers/playwright/centraal-beheer-live');
scrapeCentraalBeheer({ postcode: '1181EC', huisnummer: '10', geboortedatum: '15-06-1990', gezin: 'alleenstaand', eigenaar: false }).then(r => console.log(JSON.stringify(r, null, 2)));
"`

Expected: `status: "success"` with a premie between 2-200.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/playwright/centraal-beheer-live.ts
git commit -m "fix(scrapers): rewrite CB inboedel with proper selectors, logging, input mapping"
```

---

### Task 12: Fix FBTO live scraper

**Files:**
- Modify: `src/lib/scrapers/playwright/inboedel/fbto-live.ts`

- [ ] **Step 1: Navigate FBTO website to verify current wizard flow**

Use Playwright to navigate `https://www.fbto.nl/woonverzekering/premie-berekenen/start-inboedelverzekering` and document:
- The exact wizard steps (replace the generic 12-step loop with named steps)
- Field names for postcode, huisnummer, geboortedatum
- Button labels at each step
- Where the premium appears

- [ ] **Step 2: Rewrite the scraper with explicit named steps**

Key changes:
- Add `createLogger("FBTO-inboedel")` and log every step
- Replace the 12-step generic loop with explicit named steps
- Use `pressSequentially()` for address fields (Angular SPA)
- Use `input.geboortedatum` (required, no default)
- Map `input.gezin` to FBTO's options ("1 persoon", "2 personen", etc.)
- Map `input.eigenaar` to "Gehuurd"/"Gekocht"
- Use `waitForStep()` with element selectors instead of `waitForTimeout()`
- Use `extractPrice(page, { sectionLabel: "inboedelverzekering" })` at the end
- Return `stepLog: logger.getSteps()` in the result

- [ ] **Step 3: Test against real address**

Run: `ENABLE_LIVE_SCRAPERS=true npx tsx --env-file=.env.local -e "
const { scrapeFbtoInboedel } = require('./src/lib/scrapers/playwright/inboedel/fbto-live');
scrapeFbtoInboedel({ postcode: '1181EC', huisnummer: '10', geboortedatum: '15-06-1990', gezin: 'alleenstaand', eigenaar: false }).then(r => console.log(JSON.stringify(r, null, 2)));
"`

Expected: `status: "success"` with a premie between 2-200.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/playwright/inboedel/fbto-live.ts
git commit -m "fix(scrapers): rewrite FBTO inboedel with explicit wizard steps, logging"
```

---

### Task 13: Fix InShared live scraper

**Files:**
- Modify: `src/lib/scrapers/playwright/inshared-live.ts`

- [ ] **Step 1: Navigate InShared website to verify current flow**

Use Playwright to navigate `https://www.inshared.nl/woonverzekering/inboedelverzekering` and document the current form flow and selectors.

- [ ] **Step 2: Update the scraper**

Key changes:
- Add `createLogger("InShared-inboedel")` and log every step
- Replace `dispatchEvent("change")` hacks with proper Playwright `.click()` on radio labels
- Use `input.geboortedatum` (required, no default)
- Use `input.eigenaar` properly (currently inverted logic: `eigenaar !== false` defaults to eigenaar, but spec says default should be huurder)
- Use `waitForStep()` instead of `waitForTimeout()`
- Use `extractPrice()` instead of the custom `extractPremies()` function
- Return `stepLog: logger.getSteps()`

- [ ] **Step 3: Test against real address**

Run: `ENABLE_LIVE_SCRAPERS=true npx tsx --env-file=.env.local -e "
const { scrapeInShared } = require('./src/lib/scrapers/playwright/inshared-live');
scrapeInShared({ postcode: '1181EC', huisnummer: '10', geboortedatum: '15-06-1990', gezin: 'alleenstaand', eigenaar: false }).then(r => console.log(JSON.stringify(r, null, 2)));
"`

Expected: `status: "success"` with a premie between 2-200.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/playwright/inshared-live.ts
git commit -m "fix(scrapers): rewrite InShared inboedel with proper interactions, logging"
```

---

### Task 14: Fix ASR live scraper

**Files:**
- Modify: `src/lib/scrapers/playwright/inboedel/asr-live.ts`

- [ ] **Step 1: Navigate ASR website to verify current flow**

Use Playwright to navigate `https://www.asr.nl/verzekeringen/inboedelverzekering` and document the form flow.

- [ ] **Step 2: Update the scraper**

Key changes:
- Add `createLogger("ASR-inboedel")` and log every step
- Use `input.geboortedatum` (required, no default)
- Map `input.eigenaar` to the eigenaar/huurder radio
- Use `waitForStep()` instead of `waitForTimeout()`
- Use `extractPrice()` instead of the custom `extractPremie()` function
- Return `stepLog: logger.getSteps()`

- [ ] **Step 3: Test against real address**

Run: `ENABLE_LIVE_SCRAPERS=true npx tsx --env-file=.env.local -e "
const { scrapeAsrInboedel } = require('./src/lib/scrapers/playwright/inboedel/asr-live');
scrapeAsrInboedel({ postcode: '1181EC', huisnummer: '10', geboortedatum: '15-06-1990', gezin: 'alleenstaand', eigenaar: false }).then(r => console.log(JSON.stringify(r, null, 2)));
"`

Expected: `status: "success"` with a premie between 2-200.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/playwright/inboedel/asr-live.ts
git commit -m "fix(scrapers): rewrite ASR inboedel with proper selectors, logging"
```

---

### Task 15: Fix OHRA live scraper

**Files:**
- Modify: `src/lib/scrapers/playwright/ohra-live.ts`

- [ ] **Step 1: Navigate OHRA website to verify current flow**

Use Playwright to navigate `https://www.ohra.nl/inboedelverzekering/berekenen` and document the form flow.

- [ ] **Step 2: Update the scraper**

Key changes:
- Add `createLogger("OHRA-inboedel")` and log every step
- Use `input.geboortedatum` (required, no default)
- Replace index-based radio selection (`label[for="root_gezinssamenstelling-0"]`) with label-text-based selection
- Map `input.gezin` to OHRA's options: "Mijzelf" (alleenstaand), "Mijzelf, partner en kind(eren)" (gezin)
- Map `input.eigenaar` to eigenaar/huurder radio by label text
- Use `waitForStep()` instead of `waitForTimeout()`
- Use `extractPrice()` instead of the custom `extractOhraPremie()`
- Return `stepLog: logger.getSteps()`

- [ ] **Step 3: Test against real address**

Run: `ENABLE_LIVE_SCRAPERS=true npx tsx --env-file=.env.local -e "
const { scrapeOhra } = require('./src/lib/scrapers/playwright/ohra-live');
scrapeOhra({ postcode: '1181EC', huisnummer: '10', geboortedatum: '15-06-1990', gezin: 'alleenstaand', eigenaar: false }).then(r => console.log(JSON.stringify(r, null, 2)));
"`

Expected: `status: "success"` with a premie between 2-200.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/playwright/ohra-live.ts
git commit -m "fix(scrapers): rewrite OHRA inboedel with label-based selectors, logging"
```

---

### Task 16: Investigate and fix Interpolis live scraper (best-effort)

**Files:**
- Modify: `src/lib/scrapers/playwright/inboedel/interpolis-live.ts`

- [ ] **Step 1: Navigate Interpolis website to check for redirect**

Use Playwright to navigate `https://www.interpolis.nl/verzekeren/inboedelverzekering` and check:
- Does it redirect to Rabobank?
- If so, what does the Rabobank calculator look like?
- Is it feasible to scrape?

- [ ] **Step 2: Update or disable the scraper**

If Rabobank redirect is scrapable: rewrite with proper selectors, logging, and input mapping (same pattern as other scrapers).

If not feasible: remove Interpolis from the live scraper registry in `inboedel/index.ts` and add a comment explaining why. Keep the calculated scraper.

- [ ] **Step 3: Test (if scraper was updated)**

Run against a real address and verify.

- [ ] **Step 4: Commit**

```bash
git add src/lib/scrapers/playwright/inboedel/interpolis-live.ts src/lib/scrapers/inboedel/index.ts
git commit -m "fix(scrapers): update Interpolis inboedel (or disable if redirect blocks scraping)"
```

---

## Chunk 3: Integration Test

### Task 17: Run all scrapers together and verify

- [ ] **Step 1: Run full scraper suite with live scrapers enabled**

Run: `ENABLE_LIVE_SCRAPERS=true npx tsx --env-file=.env.local -e "
const { getScrapers } = require('./src/lib/scrapers');
const scrapers = getScrapers('inboedel');
const input = { postcode: '1181EC', huisnummer: '10', woningtype: 'tussenwoning', oppervlakte: 80, gezin: 'alleenstaand', dekking: 'basis', geboortedatum: '15-06-1990', eigenaar: false };
Promise.all(scrapers.map(s => s.run(input).then(r => ({ slug: s.slug, ...r })))).then(results => {
  for (const r of results) console.log(r.slug, r.source, r.premie ? r.premie.toFixed(2) : 'FAIL', r.stepLog?.length ? r.stepLog.length + ' steps' : '');
});
"`

Expected: all 5-6 scrapers return `source: "live"` with valid premiums. Any that fall back to `"calculated"` need investigation.

- [ ] **Step 2: Test with different input (gezin, eigenaar)**

Run the same test with `gezin: "gezin"` and `eigenaar: true` to verify input mapping works.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat(scrapers): all inboedel live scrapers fixed and verified"
```
