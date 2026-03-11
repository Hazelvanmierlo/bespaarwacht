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

export async function scrapeAsrAvp(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    await page.goto("https://www.asr.nl/verzekeringen/aansprakelijkheidsverzekering", {
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

    // Geboortedatum
    try {
      await fillField(page,
        'input[name*="geboortedatum"], input[id*="geboortedatum"], input[placeholder*="DD-MM"]',
        ["Geboortedatum"],
        input.geboortedatum ?? "15-06-1985"
      );
      await page.waitForTimeout(500);
    } catch { /* optional */ }

    // Gezin
    try {
      const isGezin = input.gezin?.toLowerCase().includes("gezin") || input.gezin?.toLowerCase().includes("samen");
      const gezinRadio = isGezin
        ? page.locator('label:has-text("Gezin"), label:has-text("Samenwonend"), input[value*="gezin"]').first()
        : page.locator('label:has-text("Alleenstaand"), input[value*="alleen"]').first();
      if (await gezinRadio.isVisible({ timeout: 2000 })) {
        await gezinRadio.click();
        await page.waitForTimeout(500);
      }
    } catch { /* continue */ }

    // Submit
    const submitClicked = await clickFirstVisible(page,
      'button:has-text("Bereken"), button:has-text("Volgende"), button[type="submit"]',
      { timeout: 3000, label: "Submit bereken" }
    );
    if (submitClicked) await page.waitForTimeout(6000);

    await page.waitForTimeout(3000);

    const allText = await page.locator("body").innerText();
    const premie = extractAvpPremie(allText);

    await closeBrowser(browser);

    if (premie) {
      return { status: "success", premie, dekking: "Aansprakelijkheid Particulier", eigenRisico: "€ 0", duration_ms: Date.now() - start };
    }
    return { status: "error", error: "Premie niet gevonden op pagina.", duration_ms: Date.now() - start };
  } catch (err) {
    await closeBrowser(browser);
    return { status: "error", error: (err as Error).message, duration_ms: Date.now() - start };
  }
}

function extractAvpPremie(text: string): number | undefined {
  const patterns = [
    /(?:per maand|p\/m|\/mnd)\s*€?\s*(\d{1,2})\s*[,.]\s*(\d{2})/i,
    /€\s*(\d{1,2})\s*[,.]\s*(\d{2})\s*(?:per maand|p\/m|\/mnd)/i,
    /(?:Maandpremie|Uw premie)[^\n]*?€?\s*(\d{1,2})\s*[,.]\s*(\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(`${match[1]}.${match[2]}`);
      if (price > 1 && price < 20) return price;
    }
  }
  const section = text.match(/[Pp]remie[\s\S]{0,200}/);
  if (section) return parseDutchPrice(section[0]);
  return undefined;
}
