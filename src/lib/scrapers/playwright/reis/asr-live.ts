import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  parseDutchPrice,
  type LiveScraperInput,
  type LiveScraperResult,
} from "../utils";

export async function scrapeAsrReis(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    await page.goto("https://www.asr.nl/verzekeringen/reisverzekering", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    await acceptCookies(page);

    try {
      const ctaBtn = page.locator('a:has-text("Bereken"), button:has-text("Bereken")').first();
      if (await ctaBtn.isVisible({ timeout: 3000 })) {
        await ctaBtn.click();
        await page.waitForTimeout(3000);
      }
    } catch { /* already on calculator */ }

    // Geboortedatum
    try {
      const gebInput = page.locator('input[name*="geboortedatum"], input[id*="geboortedatum"], input[placeholder*="DD-MM"]').first();
      if (await gebInput.isVisible({ timeout: 2000 })) {
        await gebInput.fill(input.geboortedatum ?? "15-06-1985");
        await gebInput.press("Tab");
        await page.waitForTimeout(500);
      }
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

    // Submit
    try {
      const submitBtn = page.locator('button:has-text("Bereken"), button:has-text("Volgende"), button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 3000 })) {
        await submitBtn.click();
        await page.waitForTimeout(6000);
      }
    } catch { /* auto-calc */ }

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
