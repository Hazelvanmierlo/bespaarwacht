import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  type LiveScraperInput,
  type LiveScraperResult,
} from "./utils";

export async function scrapeOhra(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // ── Navigate directly to calculator ──
    await page.goto("https://www.ohra.nl/inboedelverzekering/berekenen", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    await page.waitForTimeout(3000);
    await acceptCookies(page);

    // ── Geboortedatum ──
    await page.fill("#root_geboortedatum", input.geboortedatum ?? "15-06-1985");
    await page.waitForTimeout(300);

    // ── Gezinssamenstelling ──
    // 0=Mijzelf, 1=Mijzelf+partner, 2=Mijzelf+kind(eren), 3=Mijzelf+partner+kind(eren)
    const isGezin = input.gezin?.toLowerCase().includes("gezin") || input.gezin?.toLowerCase().includes("samen");
    const gezinIndex = isGezin ? "3" : "0";
    await page.locator(`label[for="root_gezinssamenstelling-${gezinIndex}"]`).click({ force: true });
    await page.waitForTimeout(300);

    // ── Eigenaar/Huurder ──
    // 0=Eigenaar, 1=Huurder
    const eigenaarIndex = input.eigenaar !== false ? "0" : "1";
    await page.locator(`label[for="root_eigenaarhuurder-${eigenaarIndex}"]`).click({ force: true });
    await page.waitForTimeout(300);

    // ── Postcode + Huisnummer ──
    await page.fill("#root_postcode", input.postcode);
    await page.fill("#root_huisnummer", input.huisnummer);
    await page.waitForTimeout(1000);

    // ── Address picker (toevoeging) — select first option if visible ──
    try {
      const toevoegingSelect = page.locator('select[name="root_toevoeging"]');
      if (await toevoegingSelect.isVisible({ timeout: 2000 })) {
        await toevoegingSelect.selectOption({ index: 0 });
        await page.waitForTimeout(300);
      }
    } catch { /* might not appear */ }

    // ── Bestemming: "Eigen bewoning" ──
    try {
      const bestemmingSelect = page.locator('select[name="root_bestemming"]');
      if (await bestemmingSelect.isVisible({ timeout: 2000 })) {
        await bestemmingSelect.selectOption("0"); // "Eigen bewoning"
        await page.waitForTimeout(300);
      }
    } catch { /* might not be visible */ }

    // ── Dakbedekking: "Pannen" ──
    try {
      const dakSelect = page.locator('select[name="root_dakbedekking"]');
      if (await dakSelect.isVisible({ timeout: 2000 })) {
        await dakSelect.selectOption("0"); // "Pannen"
        await page.waitForTimeout(300);
      }
    } catch { /* might not be visible */ }

    // ── Bouwaard (muren): "Steen" ──
    try {
      const bouwSelect = page.locator('select[name="root_bouwaard"]');
      if (await bouwSelect.isVisible({ timeout: 2000 })) {
        await bouwSelect.selectOption("0"); // "Steen"
        await page.waitForTimeout(300);
      }
    } catch { /* might not be visible */ }

    // ── Click "Bereken je premie" ──
    await page.locator('button:has-text("Bereken je premie")').click();
    await page.waitForTimeout(10000);

    // ── Extract premie from results page ──
    const allText = await page.locator("body").innerText();
    const result = extractOhraPremie(allText);

    await closeBrowser(browser);

    if (result) {
      return {
        status: "success",
        premie: result.premie,
        dekking: result.dekking,
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

function extractOhraPremie(text: string): { premie: number; dekking: string } | undefined {
  // OHRA results page shows:
  //   Basis         All Risk
  //   € 6,18        € 13,47
  //   per maand     per maand

  // Look for "Basis" section price first, then "All Risk"
  // Pattern: "Geen\n€ X,XX\nper maand\nKies\n€ Y,YY\nper maand\nKies"
  // The "Geen" row is followed by Basis price then All Risk price

  const prices: { premie: number; dekking: string }[] = [];

  // Match all "€ X,XX\nper maand" patterns (excluding marketing like "800.000")
  const pricePattern = /€\s*(\d{1,3})[,.](\d{2})\s*(?:\r?\n|\s)*per maand/gi;
  let match;
  while ((match = pricePattern.exec(text)) !== null) {
    const price = parseFloat(`${match[1]}.${match[2]}`);
    // Monthly insurance premiums are typically between €2 and €80
    if (price >= 2 && price <= 80) {
      prices.push({ premie: price, dekking: "Inboedel" });
    }
  }

  if (prices.length === 0) return undefined;

  // The first valid price is typically Basis inboedel
  // Try to identify Basis vs All Risk from context
  const basisMatch = text.match(/Basis[\s\S]*?€\s*(\d{1,3})[,.](\d{2})\s*(?:\r?\n|\s)*per maand/i);
  if (basisMatch) {
    const basisPremie = parseFloat(`${basisMatch[1]}.${basisMatch[2]}`);
    if (basisPremie >= 2 && basisPremie <= 80) {
      return { premie: basisPremie, dekking: "Inboedel Basis" };
    }
  }

  // Fallback: return first valid price
  return prices[0];
}
