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

export async function scrapeCentraalBeheerReis(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    await page.goto("https://www.centraalbeheer.nl/verzekeringen/reisverzekering", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    await acceptCookies(page);

    // Click "Bereken" CTA (JS click bypasses overlapping elements)
    const ctaClicked = await clickFirstVisible(page,
      'a:has-text("Bereken direct je premie"), a:has-text("Bereken je premie"), a:has-text("Bereken uw premie"), a:has-text("Premie berekenen"), button:has-text("Bereken je premie"), button:has-text("Bereken uw premie")',
      { timeout: 3000, label: "CTA bereken" }
    );
    if (ctaClicked) await page.waitForTimeout(3000);

    // Bypass login if present
    try {
      const neeLabel = page.locator('label:has-text("Nee, doorgaan zonder inloggen")').first();
      if (await neeLabel.isVisible({ timeout: 2000 })) {
        await neeLabel.click();
        await page.waitForTimeout(500);
        const volgendeBtn = page.locator('a:has-text("Volgende"), button:has-text("Volgende")').first();
        if (await volgendeBtn.isVisible({ timeout: 2000 })) {
          await volgendeBtn.evaluate((node) => (node as HTMLElement).click());
          await page.waitForTimeout(3000);
        }
      }
    } catch { /* may not have login step */ }

    // Geboortedatum (useKeyboard for SPA validation)
    try {
      await fillField(page,
        'input[name*="geboortedatum"], input[id*="geboortedatum"], input[placeholder*="DD-MM"], input[name="date-of-birth"]',
        ["Geboortedatum"],
        input.geboortedatum ?? "15-06-1985",
        { useKeyboard: true }
      );
      await page.waitForTimeout(500);
    } catch { /* optional */ }

    // Gezin
    try {
      const gezin = input.gezin?.toLowerCase() ?? "";
      const isGezin = gezin.includes("gezin") || gezin.includes("samen");
      const gezinRadio = isGezin
        ? page.locator('label:has-text("Gezin"), label:has-text("Samenwonend"), input[value*="gezin"]').first()
        : page.locator('label:has-text("Alleenstaand"), input[value*="alleen"]').first();
      if (await gezinRadio.isVisible({ timeout: 2000 })) {
        await gezinRadio.click();
        await page.waitForTimeout(500);
      }
    } catch { /* continue */ }

    // Reisgebied (Europa / Wereld) — try to find and select
    try {
      const wereldRadio = page.locator('label:has-text("Wereld"), label:has-text("Wereldwijd"), input[value*="wereld"]').first();
      const europaRadio = page.locator('label:has-text("Europa"), input[value*="europa"]').first();
      // Default to Europa
      const target = europaRadio;
      if (await target.isVisible({ timeout: 2000 })) {
        await target.click();
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
    const premie = extractReisPremie(allText);

    await closeBrowser(browser);

    if (premie) {
      return { status: "success", premie, dekking: "Doorlopend", eigenRisico: "€ 0", duration_ms: Date.now() - start };
    }
    return { status: "error", error: "Premie niet gevonden op pagina.", duration_ms: Date.now() - start };
  } catch (err) {
    await closeBrowser(browser);
    return { status: "error", error: (err as Error).message, duration_ms: Date.now() - start };
  }
}

function extractReisPremie(text: string): number | undefined {
  const patterns = [
    /(?:per maand|p\/m|\/mnd)\s*€?\s*(\d{1,2})\s*[,.]\s*(\d{2})/i,
    /€\s*(\d{1,2})\s*[,.]\s*(\d{2})\s*(?:per maand|p\/m|\/mnd)/i,
    /(?:Maandpremie|Uw premie)[^\n]*?€?\s*(\d{1,2})\s*[,.]\s*(\d{2})/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(`${match[1]}.${match[2]}`);
      if (price > 1 && price < 50) return price;
    }
  }
  const section = text.match(/[Pp]remie[\s\S]{0,200}/);
  if (section) return parseDutchPrice(section[0]);
  return undefined;
}
