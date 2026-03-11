# Fix Live Inboedel Scrapers — Design Spec

## Goal

Fix all 6 inboedel live scrapers to return accurate premiums from insurer websites, while improving shared utilities for resilience against future website changes.

**Success criteria:**
- Each scraper navigates the insurer's actual form flow and extracts a real premium
- All user input parameters are used — no hardcoded defaults
- Step-by-step logging makes failures diagnosable
- Graceful fallback to calculated premiums is preserved

## Scope

**In scope:** 6 inboedel live scrapers + shared utilities
- Centraal Beheer, FBTO, InShared, ASR, OHRA, Interpolis (best-effort — see open questions)

**Out of scope:** Opstal, aansprakelijkheid, reis scrapers (future work, same patterns apply)

## Shared Utilities Improvements (`playwright/utils.ts`)

### Step Logger

A `createLogger(scraperName)` function that returns a `log(step, detail)` function. Each scraper calls it at every step to produce traces:

```
[CB-inboedel] Step 1: Navigate to URL ✓
[CB-inboedel] Step 2: Bypass login ✓
[CB-inboedel] Step 3: Fill postcode "1181EC" ✓
[CB-inboedel] Step 4: Fill huisnummer — FAILED: selector not found
```

The logger collects all steps and returns them as a string array. These are stored in the `scraper_runs.step_log` column (see schema migration below).

### Enhanced Field Filling — `findAndFill(page, fieldDescriptor, value, options?)`

Enhances the existing `fillField()` function. Keeps the existing multi-selector signature for cases where CSS selectors differ from label text, but adds Playwright locator methods as the primary strategy:

1. `page.getByLabel(descriptor)` — most reliable, works across redesigns
2. `page.getByPlaceholder(descriptor)` — common fallback
3. `page.getByRole('textbox', { name: descriptor })` — role-based
4. CSS selector fallback (existing `attrSelectors` parameter) — last resort

Returns `{ success: boolean, method: string }` instead of silently continuing. Supports `useKeyboard: true` option for SPA date fields that need `pressSequentially()`.

### Smart Waiting — `waitForStep(page, options?)`

Replaces arbitrary `waitForTimeout(2000)` calls. Strategy depends on page type:
- **Server-rendered pages** (CB, OHRA): `page.waitForLoadState('domcontentloaded')` + element wait
- **SPAs** (FBTO, InShared): wait for a specific target element to appear via `page.waitForSelector()`
- Never use `networkidle` as primary strategy — unreliable for SPAs with analytics/tracking requests

Each scraper specifies what to wait for at each step (an element selector or text).

### Consolidated Price Extraction — `extractPrice(page, options)`

Options: `{ sectionLabel?: string, minPrice?: number, maxPrice?: number }`

1. If `sectionLabel` provided, narrow search to that DOM section
2. Find all `€X,XX` or `€ X,XX` patterns in the section
3. Parse with `parseDutchPrice()`
4. Validate against min/max range (default 2-200 for inboedel)
5. Return first valid match or null

### Global Timeout

Each scraper runs within a 60-second wall-clock timeout. If exceeded, the browser is force-closed and the scraper returns an error result. This is enforced in `live-wrapper.ts` using `Promise.race` with a timeout promise.

## Input Parameter Mapping

### `LiveScraperInput` expansion

The current `LiveScraperInput` interface is missing fields that insurer websites ask for. Expand it to include:

```typescript
interface LiveScraperInput {
  postcode: string;
  huisnummer: string;
  toevoeging?: string;
  geboortedatum: string;        // required — no default
  gezin: string;                 // "alleenstaand" | "partner" | "gezin"
  eigenaar?: boolean;            // true = eigenaar, false = huurder
  woningtype?: string;           // "appartement" | "tussenwoning" | "hoekwoning" | etc.
}
```

The `live-wrapper.ts` mapper needs to pass these fields through from `InboedelInput` to `LiveScraperInput`.

### Handling optional fields

- `geboortedatum`: **required**. If not provided, skip live scraping and fall back to calculated. This avoids using fake dates that produce inaccurate premiums.
- `eigenaar`: default `false` (huurder) — most common for inboedel-only queries
- `woningtype`: use site defaults when not provided (don't fill the field, let the site use its default)

## Per-Scraper Fixes

### Priority Order

1. **Centraal Beheer** — most complex multi-step flow, high traffic insurer
2. **FBTO** — Angular SPA requiring special input handling
3. **InShared** — most complete existing flow, needs selector updates
4. **ASR** — simpler form, fewer steps
5. **OHRA** — simpler form, index-based selectors need fixing
6. **Interpolis** — best-effort (see open questions)

### Fix Pattern (applied to each scraper)

1. **Verify current flow** — navigate the actual website with Playwright to document current steps, selectors, and required fields
2. **Map all input parameters** — use actual `LiveScraperInput` fields:
   - `input.postcode`, `input.huisnummer` — always from user
   - `input.geboortedatum` — always from user (required)
   - `input.gezin` — from user input (mapped to site-specific values per scraper)
   - `input.eigenaar` — from user where the site asks for it
3. **Update form navigation** — replace fragile patterns:
   - FBTO: explicit named steps instead of 12-iteration generic loop
   - CB: label/role-based selectors instead of `#jaNee-0`
   - InShared: proper Playwright interactions instead of `dispatchEvent("change")`
   - OHRA: label-based radio selection instead of index-based
4. **Use shared `extractPrice()`** — with site-specific section labels
5. **Add step logging** — every step uses the logger

## Error Handling & Fallback

- **Preserve graceful fallback** — if live scraping fails, return calculated premium (existing `live-wrapper.ts` behavior)
- **Structured error reporting** — step logger output stored in `scraper_runs.step_log`
- **Source tagging** — already exists in `ScraperResult.source` and `live-wrapper.ts` — no changes needed
- **No retry logic** — fail fast and fall back; retries rarely help with selector issues
- **60-second timeout** — force-close browser if exceeded

## Schema Migration

Add a `step_log` column to `scraper_runs` for storing diagnostic traces:

```sql
ALTER TABLE scraper_runs ADD COLUMN step_log text[];
```

This stores the logger output as a text array, viewable in the admin scrapers dashboard.

## Verification

Each scraper is verified by:
- Running against 2-3 real Dutch addresses
- Comparing returned premium against what the website actually shows
- Confirming all steps complete via logger output
- Testing different input combinations (single vs family, eigenaar vs huurder)

No automated test suite — these are integration tests against live third-party websites. Step logging provides ongoing monitoring via the admin dashboard.

## Open Questions

1. **Interpolis redirect** — the current scraper may redirect to Rabobank. Needs investigation during implementation. If the redirect makes scraping infeasible, exclude Interpolis and document why.
2. **Browser concurrency** — if all 6 scrapers run in parallel, each launches its own browser. Need to verify local Chromium can handle 6 concurrent instances, or run sequentially.

## Files Changed

- `src/lib/scrapers/playwright/utils.ts` — new utilities (logger, findAndFill, waitForStep, extractPrice)
- `src/lib/scrapers/playwright/inboedel/asr-live.ts` — fix flow + selectors
- `src/lib/scrapers/playwright/inboedel/fbto-live.ts` — fix flow + selectors
- `src/lib/scrapers/playwright/inboedel/interpolis-live.ts` — fix flow + selectors (best-effort)
- `src/lib/scrapers/playwright/centraal-beheer-live.ts` — fix inboedel flow
- `src/lib/scrapers/playwright/inshared-live.ts` — fix flow + selectors
- `src/lib/scrapers/playwright/ohra-live.ts` — fix flow + selectors
- `src/lib/scrapers/playwright/live-wrapper.ts` — pass expanded input fields, add 60s timeout
- `src/lib/scrapers/base.ts` — include step log in scraper result
- `supabase/migration-step-log.sql` — add `step_log` column to `scraper_runs`
