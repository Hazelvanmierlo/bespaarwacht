import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  parseDutchPrice,
  type LiveScraperInput,
  type LiveScraperResult,
} from "./utils";

export async function scrapeCentraalBeheer(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // ── Navigate to calculator ──
    await page.goto("https://www.centraalbeheer.nl/verzekeringen/inboedelverzekering", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    await acceptCookies(page);

    // ── Click "Bereken je premie" or similar CTA ──
    try {
      const ctaBtn = page.locator('a:has-text("Bereken"), button:has-text("Bereken")').first();
      if (await ctaBtn.isVisible({ timeout: 3000 })) {
        await ctaBtn.click();
        await page.waitForTimeout(3000);
      }
    } catch { /* continue, might already be on calculator page */ }

    // ── Fill in postcode ──
    const postcodeInput = page.locator('input[name*="postcode"], input[id*="postcode"], input[placeholder*="postcode"]').first();
    await postcodeInput.fill(input.postcode);
    await page.waitForTimeout(300);

    // ── Fill in huisnummer ──
    const huisnummerInput = page.locator('input[name*="huisnummer"], input[id*="huisnummer"], input[name*="houseNumber"], input[placeholder*="Nr"]').first();
    await huisnummerInput.fill(input.huisnummer);
    await huisnummerInput.press("Tab");
    await page.waitForTimeout(2000);

    // ── Geboortedatum ──
    try {
      const gebInput = page.locator('input[name*="geboortedatum"], input[id*="geboortedatum"], input[name*="birthdate"], input[placeholder*="DD-MM"]').first();
      if (await gebInput.isVisible({ timeout: 2000 })) {
        await gebInput.fill(input.geboortedatum ?? "15-06-1985");
        await gebInput.press("Tab");
        await page.waitForTimeout(500);
      }
    } catch { /* field might not be visible yet */ }

    // ── Woningtype / Eigenaar-Huurder ──
    try {
      // Look for eigenaar/huurder radio or select
      if (input.eigenaar !== false) {
        const eigenaarRadio = page.locator('input[value*="eigenaar"], input[value*="Eigenaar"], label:has-text("Eigenaar") input[type="radio"]').first();
        if (await eigenaarRadio.isVisible({ timeout: 2000 })) {
          await eigenaarRadio.click();
          await page.waitForTimeout(500);
        }
      } else {
        const huurderRadio = page.locator('input[value*="huurder"], input[value*="Huurder"], label:has-text("Huurder") input[type="radio"]').first();
        if (await huurderRadio.isVisible({ timeout: 2000 })) {
          await huurderRadio.click();
          await page.waitForTimeout(500);
        }
      }
    } catch { /* continue */ }

    // ── Click "Volgende" / "Bereken" to submit form ──
    try {
      const submitBtn = page.locator('button:has-text("Bereken"), button:has-text("Volgende"), button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 3000 })) {
        await submitBtn.click();
        await page.waitForTimeout(8000);
      }
    } catch { /* might auto-calculate */ }

    // ── Wait for results to load ──
    await page.waitForTimeout(3000);

    // ── Extract premie from page ──
    const allText = await page.locator("body").innerText();
    const premie = extractCBPremie(allText);

    await closeBrowser(browser);

    if (premie) {
      return {
        status: "success",
        premie,
        dekking: "Inboedel",
        eigenRisico: "€ 0",
        duration_ms: Date.now() - start,
      };
    }

    return { status: "error", error: "Premie niet gevonden op pagina.", duration_ms: Date.now() - start };
  } catch (err) {
    await closeBrowser(browser);
    return { status: "error", error: (err as Error).message, duration_ms: Date.now() - start };
  }
}

function extractCBPremie(text: string): number | undefined {
  // Try common Centraal Beheer patterns
  // "per maand € 12,50" or "€ 12,50 per maand"
  const patterns = [
    /(?:per maand|p\/m|\/mnd)\s*€?\s*(\d{1,3})\s*[,.]\s*(\d{2})/i,
    /€\s*(\d{1,3})\s*[,.]\s*(\d{2})\s*(?:per maand|p\/m|\/mnd)/i,
    /(?:Maandpremie|Uw premie)[^\n]*?€?\s*(\d{1,3})\s*[,.]\s*(\d{2})/i,
    /(\d{1,3})\s*[,.]\s*(\d{2})\s*(?:per maand|p\/m)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(`${match[1]}.${match[2]}`);
      if (price > 2 && price < 100) return price;
    }
  }

  // Fallback: look for any price-like value near "premie" or "maand"
  const premieSection = text.match(/[Pp]remie[\s\S]{0,200}/);
  if (premieSection) {
    return parseDutchPrice(premieSection[0]);
  }

  return undefined;
}
