import type { Browser, Page } from "playwright";

/** Standard input interface for all live scrapers */
export interface LiveScraperInput {
  postcode: string;
  huisnummer: string;
  geboortedatum?: string;
  gezin?: string;
  eigenaar?: boolean;
}

/** Standard result interface for all live scrapers */
export interface LiveScraperResult {
  status: "success" | "error";
  premie?: number;
  dekking?: string;
  eigenRisico?: string;
  error?: string;
  duration_ms: number;
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
      'button[title="Akkoord"]',
      'button[data-element="all-button"]',
      'button:has-text("Alles accepteren")',
      'button:has-text("Alle cookies accepteren")',
      'button:has-text("Accepteer alle cookies")',
      'button:has-text("Akkoord")',
      '#onetrust-accept-btn-handler',
      '.cookie-accept-all',
    ];
    for (const selector of selectors) {
      try {
        const btn = page.locator(selector).first();
        if (await btn.isVisible({ timeout: 2000 })) {
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
