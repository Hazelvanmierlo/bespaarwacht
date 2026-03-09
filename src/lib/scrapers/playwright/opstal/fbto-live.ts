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

export async function scrapeFbtoOpstal(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    await page.goto("https://www.fbto.nl/woonverzekering/opstalverzekering", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    await acceptCookies(page);

    // Click "Bereken" CTA
    try {
      const ctaBtn = page.locator('a:has-text("Bereken"), button:has-text("Bereken")').first();
      if (await ctaBtn.isVisible({ timeout: 3000 })) {
        await ctaBtn.click();
        await page.waitForTimeout(3000);
      }
    } catch { /* may already be on calculator */ }

    // Postcode
    const postcodeInput = page.locator('input[name*="postcode"], input[id*="postcode"], input[placeholder*="postcode"]').first();
    await postcodeInput.fill(input.postcode);
    await page.waitForTimeout(300);

    // Huisnummer
    const huisnummerInput = page.locator('input[name*="huisnummer"], input[id*="huisnummer"], input[name*="houseNumber"], input[placeholder*="Nr"]').first();
    await huisnummerInput.fill(input.huisnummer);
    await huisnummerInput.press("Tab");
    await page.waitForTimeout(2000);

    // Geboortedatum
    try {
      const gebInput = page.locator('input[name*="geboortedatum"], input[id*="geboortedatum"], input[placeholder*="DD-MM"]').first();
      if (await gebInput.isVisible({ timeout: 2000 })) {
        await gebInput.fill(input.geboortedatum ?? "15-06-1985");
        await gebInput.press("Tab");
        await page.waitForTimeout(500);
      }
    } catch { /* optional */ }

    // Submit
    try {
      const submitBtn = page.locator('button:has-text("Bereken"), button:has-text("Volgende"), button[type="submit"]').first();
      if (await submitBtn.isVisible({ timeout: 3000 })) {
        await submitBtn.click();
        await page.waitForTimeout(8000);
      }
    } catch { /* auto-calc */ }

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
