import type { Browser, Page } from "playwright";

/** Standard input interface for all live scrapers */
export interface LiveScraperInput {
  postcode: string;
  huisnummer: string;
  geboortedatum: string;          // required — no hardcoded defaults
  gezin: string;                   // "alleenstaand" | "gezin"
  eigenaar?: boolean;              // true = eigenaar, false = huurder (default: false)
  woningtype?: string;
}

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

/**
 * Launch a browser — either local Chromium or remote via WebSocket.
 *
 * Environment variables:
 * - BROWSER_WS_ENDPOINT: WebSocket URL for remote browser (e.g. Browserless.io, Browserbase)
 *   Example: "wss://chrome.browserless.io?token=YOUR_TOKEN"
 * - If not set, launches a local headless Chromium (requires Playwright installed)
 */
export async function launchBrowser(): Promise<Browser> {
  const wsEndpoint = process.env.BROWSER_WS_ENDPOINT;

  if (wsEndpoint) {
    // Remote browser via WebSocket (works on Vercel)
    const { chromium } = await import("playwright");
    return chromium.connectOverCDP(wsEndpoint);
  }

  // Local browser (requires Playwright + Chromium installed)
  const { chromium } = await import("playwright");
  return chromium.launch({ headless: true });
}

/** Create a new page with Dutch locale and standard viewport */
export async function createPage(browser: Browser): Promise<Page> {
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    locale: "nl-NL",
    viewport: { width: 1280, height: 1200 },
  });
  return context.newPage();
}

/** Accept common Dutch cookie banners */
export async function acceptCookies(page: Page): Promise<void> {
  try {
    const selectors = [
      '#onetrust-accept-btn-handler',
      '#onetrust-reject-all-handler',
      'button[title="Akkoord"]',
      'button:has-text("Alles accepteren")',
      'button:has-text("Alle cookies accepteren")',
      'button:has-text("Accepteer alle cookies")',
      'button:has-text("Alles afwijzen")',
      'button:has-text("Akkoord")',
      'button[data-element="all-button"]',
      '.cookie-accept-all',
    ];
    for (const selector of selectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 1500 })) {
          await btn.click();
          await page.waitForTimeout(1000);
          return;
        }
      } catch {
        // Try next selector
      }
    }
  } catch {
    // No cookie banner found, continue
  }
}

/**
 * Click the first VISIBLE element matching a locator.
 *
 * Unlike `.first()` which returns the first in DOM order (potentially an
 * invisible nav link), this iterates all matches and clicks the first
 * one that is actually visible on screen.
 */
export async function clickFirstVisible(
  page: Page,
  selector: string,
  options?: { timeout?: number; label?: string }
): Promise<boolean> {
  const timeout = options?.timeout ?? 3000;
  const label = options?.label ?? selector.substring(0, 60);

  try {
    const locator = page.locator(selector);
    const count = await locator.count();

    if (count === 0) {
      scrapeWarn("clickFirstVisible", `no elements for "${label}"`);
      return false;
    }

    for (let i = 0; i < count; i++) {
      const el = locator.nth(i);
      try {
        if (await el.isVisible({ timeout: Math.min(timeout, 1500) })) {
          // <a> tags: JS click follows href (bypasses overlay elements)
          // <button> tags: Playwright force-click (triggers SPA event handlers)
          const tagName = await el.evaluate((node) => node.tagName.toLowerCase());
          if (tagName === "a") {
            await el.evaluate((node) => (node as HTMLElement).click());
          } else {
            await el.click({ force: true });
          }
          return true;
        }
      } catch {
        // Element not visible or stale, try next
      }
    }

    scrapeWarn("clickFirstVisible", `${count} elements but none visible for "${label}"`);
    return false;
  } catch (err) {
    scrapeWarn("clickFirstVisible", `failed for "${label}": ${(err as Error).message}`);
    return false;
  }
}

/** Tagged warning for scraper diagnostics */
export function scrapeWarn(name: string, message: string): void {
  console.warn(`[scraper:${name}] ${message}`);
}

export interface FillResult {
  success: boolean;
  method: string;
}

/**
 * Find and fill an input field by trying attribute selectors first, then label text.
 * Returns a FillResult indicating success and which method was used.
 */
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
      // pressSequentially triggers proper keyboard events for React/Angular SPAs
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

  // Try label-based lookup (works when inputs have no name/placeholder)
  for (const label of labelTexts) {
    try {
      const labelInput = page.getByLabel(label, { exact: false });
      if (await labelInput.isVisible({ timeout: 1500 })) {
        await doFill(labelInput);
        return { success: true, method: "label" };
      }
    } catch { /* try next */ }
  }

  // Try placeholder-based lookup (case-insensitive, works for CB etc.)
  for (const label of labelTexts) {
    try {
      const placeholderInput = page.getByPlaceholder(label, { exact: false });
      if (await placeholderInput.isVisible({ timeout: 1500 })) {
        await doFill(placeholderInput);
        return { success: true, method: "placeholder" };
      }
    } catch { /* try next */ }
  }

  // Try role-based lookup (getByRole textbox with name)
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

/** Parse Dutch price string "12,50" or "12.50" to number 12.50 */
export function parseDutchPrice(text: string): number | undefined {
  const match = text.match(/(\d{1,3})\s*[,.]\s*(\d{2})/);
  if (!match) return undefined;
  return parseFloat(`${match[1]}.${match[2]}`);
}

/** Safely close browser, ignoring errors */
export async function closeBrowser(browser: Browser | null): Promise<void> {
  try {
    if (browser) await browser.close();
  } catch {
    // Ignore close errors
  }
}

// ---------------------------------------------------------------------------
// Step logger — structured logging for scraper diagnostics
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// waitForStep — wait for a selector, text, or load state
// ---------------------------------------------------------------------------

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
    await page.waitForLoadState("domcontentloaded", { timeout });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// extractPrice — find a monthly premium price from page text
// ---------------------------------------------------------------------------

export async function extractPrice(
  page: Page,
  options?: { sectionLabel?: string; minPrice?: number; maxPrice?: number }
): Promise<number | null> {
  const min = options?.minPrice ?? 2;
  const max = options?.maxPrice ?? 200;
  const allText = await page.locator("body").innerText();
  let searchText = allText;
  if (options?.sectionLabel) {
    const idx = searchText.toLowerCase().indexOf(options.sectionLabel.toLowerCase());
    if (idx !== -1) searchText = searchText.substring(idx, idx + 500);
  }
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
  const fallback = [...searchText.matchAll(/€\s*(\d{1,3})\s*[,.]\s*(\d{2})/g)];
  for (const match of fallback) {
    const price = parseFloat(`${match[1]}.${match[2]}`);
    if (price >= min && price <= max) return price;
  }
  return null;
}
