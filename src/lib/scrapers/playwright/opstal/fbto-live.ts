import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  parseDutchPrice,
  clickFirstVisible,
  type LiveScraperInput,
  type LiveScraperResult,
} from "../utils";

export async function scrapeFbtoOpstal(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // ── Navigate to wizard ──
    await page.goto("https://www.fbto.nl/woonverzekering/premie-berekenen/start-opstalverzekering", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    await acceptCookies(page);

    // ── Wizard start: "Ok, laten we beginnen!" → "Nee" ──
    try {
      const startBtn = page.locator('button:has-text("Ok, laten we beginnen")').first();
      if (await startBtn.isVisible({ timeout: 3000 })) {
        await startBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }
    } catch { /* continue */ }
    try {
      const neeBtn = page.locator('button:has-text("Nee")').first();
      if (await neeBtn.isVisible({ timeout: 3000 })) {
        await neeBtn.click({ force: true });
        await page.waitForTimeout(2000);
      }
    } catch { /* continue */ }

    // ── Address: use pressSequentially + Tab to trigger Angular API ──
    const pcField = page.locator('input[name="verzekerd-adres-postcode"], input[name*="postcode"]').first();
    if (await pcField.isVisible({ timeout: 3000 })) {
      await pcField.click();
      await pcField.pressSequentially(input.postcode, { delay: 60 });
      await page.keyboard.press("Tab");
      await page.waitForTimeout(500);
    }

    const hnField = page.locator('input[name="verzekerd-adres-huisnummer"], input[name*="huisnummer"]').first();
    if (await hnField.isVisible({ timeout: 2000 })) {
      await hnField.click();
      await hnField.pressSequentially(input.huisnummer, { delay: 60 });
      await page.keyboard.press("Tab");
      await page.waitForTimeout(3000);
    }

    // Click "Ga verder" to submit address
    await clickFirstVisible(page,
      'button:has-text("Ga verder")',
      { timeout: 3000, label: "Ga verder (address)" }
    );
    await page.waitForTimeout(3000);

    // ── Navigate through wizard steps ──
    for (let step = 0; step < 12; step++) {
      const bodyText = await page.locator("body").innerText();

      // Check for premium
      const premie = extractFbtoOpstalPremie(bodyText);
      if (premie) {
        await closeBrowser(browser);
        return {
          status: "success",
          premie,
          dekking: "Opstal",
          eigenRisico: "€ 0",
          duration_ms: Date.now() - start,
        };
      }

      // Check for error
      if (bodyText.includes("niet online verzekeren") || bodyText.includes("Internal Server Error")) {
        break;
      }

      // Fill geboortedatum if on that page
      try {
        const gbField = page.locator('input[name="date-of-birth"], input[placeholder*="DD-MM"], input[name*="geboortedatum"]').first();
        if (await gbField.isVisible({ timeout: 500 })) {
          await gbField.click();
          await gbField.pressSequentially(input.geboortedatum ?? "15-06-1985", { delay: 30 });
          await page.keyboard.press("Tab");
          await page.waitForTimeout(500);
        }
      } catch { /* not on this page */ }

      // Click next: Ga verder, Nee, choice buttons
      let clicked = false;
      for (const sel of [
        'button:has-text("Ga verder")',
        'button:has-text("Nee")',
        'button:has-text("Gekocht")',        // For opstal, owner (gekocht)
        'button:has-text("1 persoon")',      // aantal-personen
        'button:has-text("Volgende")',
        'button:has-text("Bereken")',
      ]) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1500 })) {
            await btn.click({ force: true });
            clicked = true;
            await page.waitForTimeout(3000);
            break;
          }
        } catch { /* try next */ }
      }
      if (!clicked) break;
    }

    await page.waitForTimeout(2000);
    const allText = await page.locator("body").innerText();
    const premie = extractFbtoOpstalPremie(allText);

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

function extractFbtoOpstalPremie(text: string): number | undefined {
  // FBTO shows "Opstalverzekering" with price on premium page
  const section = text.match(/opstalverzekering[\s\S]{0,500}/i);
  if (section) {
    const prices = section[0].match(/€\s*(\d{1,3})\s*[,.]\s*(\d{2})/g);
    if (prices) {
      for (const p of prices) {
        const match = p.match(/€\s*(\d{1,3})\s*[,.]\s*(\d{2})/);
        if (match) {
          const price = parseFloat(`${match[1]}.${match[2]}`);
          if (price > 1 && price < 200) return price;
        }
      }
    }
  }

  // Fallback patterns
  const patterns = [
    /(?:per maand|p\/m|\/mnd)\s*€?\s*(\d{1,3})\s*[,.]\s*(\d{2})/i,
    /€\s*(\d{1,3})\s*[,.]\s*(\d{2})\s*(?:per maand|p\/m|\/mnd)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const price = parseFloat(`${match[1]}.${match[2]}`);
      if (price > 2 && price < 150) return price;
    }
  }
  const premieSection = text.match(/[Pp]remie[\s\S]{0,200}/);
  if (premieSection) return parseDutchPrice(premieSection[0]);
  return undefined;
}
