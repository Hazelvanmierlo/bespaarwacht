import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  parseDutchPrice,
  clickFirstVisible,
  fillField,
  type LiveScraperInput,
  type LiveScraperResult,
} from "../utils";

export async function scrapeInterpolisOpstal(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // Interpolis redirects to Rabobank for premium calculation
    await page.goto("https://www.interpolis.nl/verzekeren/woonhuisverzekering", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    await acceptCookies(page);

    // Click "Bereken" CTA
    const ctaClicked = await clickFirstVisible(page,
      'a:has-text("Bereken direct je premie"), a:has-text("Bereken je premie"), a:has-text("Bereken uw premie"), a:has-text("Premie berekenen"), button:has-text("Bereken je premie"), button:has-text("Bereken uw premie")',
      { timeout: 3000, label: "CTA bereken" }
    );
    if (ctaClicked) await page.waitForTimeout(3000);

    // Postcode
    await fillField(page,
      'input[name*="postcode"], input[id*="postcode"], input[placeholder*="postcode"]',
      ["Postcode"],
      input.postcode
    );
    await page.waitForTimeout(300);

    // Huisnummer
    await fillField(page,
      'input[name*="huisnummer"], input[id*="huisnummer"], input[name*="houseNumber"], input[placeholder*="Nr"]',
      ["Huisnummer"],
      input.huisnummer
    );
    await page.waitForTimeout(2000);

    // Geboortedatum
    try {
      await fillField(page,
        'input[name*="geboortedatum"], input[id*="geboortedatum"], input[placeholder*="DD-MM"]',
        ["Geboortedatum"],
        input.geboortedatum ?? "15-06-1985"
      );
      await page.waitForTimeout(500);
    } catch { /* optional */ }

    // Submit
    const submitClicked = await clickFirstVisible(page,
      'button:has-text("Bereken"), button:has-text("Volgende"), button[type="submit"]',
      { timeout: 3000, label: "Submit bereken" }
    );
    if (submitClicked) await page.waitForTimeout(8000);

    await page.waitForTimeout(3000);

    const allText = await page.locator("body").innerText();
    const premie = extractPremie(allText);

    await closeBrowser(browser);

    if (premie) {
      return { status: "success", premie, dekking: "Opstal", eigenRisico: "€ 0", duration_ms: Date.now() - start };
    }
    return { status: "error", error: "Premie niet gevonden op pagina.", duration_ms: Date.now() - start };
  } catch (err) {
    await closeBrowser(browser);
    return { status: "error", error: (err as Error).message, duration_ms: Date.now() - start };
  }
}

function extractPremie(text: string): number | undefined {
  const patterns = [
    /(?:per maand|p\/m|\/mnd)\s*€?\s*(\d{1,3})\s*[,.]\s*(\d{2})/i,
    /€\s*(\d{1,3})\s*[,.]\s*(\d{2})\s*(?:per maand|p\/m|\/mnd)/i,
    /(?:Maandpremie|Uw premie)[^\n]*?€?\s*(\d{1,3})\s*[,.]\s*(\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(`${match[1]}.${match[2]}`);
      if (price > 2 && price < 150) return price;
    }
  }
  const section = text.match(/[Pp]remie[\s\S]{0,200}/);
  if (section) return parseDutchPrice(section[0]);
  return undefined;
}
