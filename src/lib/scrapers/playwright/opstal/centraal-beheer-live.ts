import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  parseDutchPrice,
  fillField,
  type LiveScraperInput,
  type LiveScraperResult,
} from "../utils";

export async function scrapeCentraalBeheerOpstal(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // Navigate to calculator (same wizard for inboedel & opstal)
    await page.goto("https://www.centraalbeheer.nl/verzekeringen/woonverzekering/premie-berekenen", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(3000);
    await acceptCookies(page);

    // ── Step 1: Login bypass ──
    try {
      const neeLabel = page.locator('label:has-text("Nee, doorgaan zonder inloggen")').first();
      if (await neeLabel.isVisible({ timeout: 3000 })) {
        await neeLabel.click();
        await page.waitForTimeout(500);
        await page.locator('a:has-text("Volgende")').first().evaluate((n) => (n as HTMLElement).click());
        await page.waitForTimeout(3000);
      }
    } catch { /* may not have login step */ }

    // ── Step 2: Address (woning-zoeken) ──
    await fillField(page,
      'input[name="postcode"], input[id*="postcode"]',
      ["Postcode"],
      input.postcode
    );
    await page.waitForTimeout(300);
    await fillField(page,
      'input[name="huisnummer"], input[id*="huisnummer"]',
      ["Huisnummer"],
      input.huisnummer
    );
    await page.waitForTimeout(500);

    // Click "Adresgegevens ophalen"
    try {
      const adresBtn = page.locator('button:has-text("Adresgegevens ophalen")').first();
      if (await adresBtn.isVisible({ timeout: 2000 })) {
        await adresBtn.click();
        await page.waitForTimeout(5000);
      }
    } catch { /* button may not exist */ }

    // Select address from dropdown if present
    try {
      const addrSelect = page.locator('select[name="addressSelect"]');
      if (await addrSelect.isVisible({ timeout: 2000 })) {
        await addrSelect.selectOption({ index: 0 });
        await page.waitForTimeout(500);
      }
    } catch { /* no dropdown needed */ }

    // Advance: woning-zoeken → eigenaar
    await page.locator('a:has-text("Volgende")').first().evaluate((n) => (n as HTMLElement).click());
    await page.waitForTimeout(3000);

    // ── Step 3: Eigenaar (default "Nee" = huurder) ──
    // For opstal we need "Ja" (eigenaar) since only owners have opstal
    try {
      await page.locator('#jaNee-0').click({ force: true }); // "Ja" = eigenaar
      await page.waitForTimeout(300);
    } catch { /* may not have this step */ }
    await page.locator('a:has-text("Volgende")').first().evaluate((n) => (n as HTMLElement).click());
    await page.waitForTimeout(3000);

    // ── Step 4: Bestaande verzekering → select "Nee" ──
    try {
      await page.locator('#existingPolis-1').click({ force: true });
      await page.waitForTimeout(300);
    } catch { /* may not have this step */ }
    await page.locator('a:has-text("Volgende")').first().evaluate((n) => (n as HTMLElement).click());
    await page.waitForTimeout(3000);

    // ── Step 5: Situatie — geboortedatum + gezinssamenstelling ──
    if (page.url().includes("situatie")) {
      await fillField(page,
        'input[name="geboortedatum"], input[id*="geboortedatum"]',
        ["Geboortedatum"],
        input.geboortedatum ?? "15-06-1985",
        { timeout: 2000, useKeyboard: true }
      );
      await page.waitForTimeout(300);

      try {
        const gezinSel = page.locator('select[name="gezinssamenstelling"]');
        if (await gezinSel.isVisible({ timeout: 1500 })) {
          await gezinSel.selectOption({ index: 1 });
          await page.waitForTimeout(300);
        }
      } catch { /* not present */ }

      await page.keyboard.press("Tab");
      await page.waitForTimeout(500);
      await page.locator('a:has-text("Volgende")').first().evaluate((n) => (n as HTMLElement).click());
      await page.waitForTimeout(3000);
    }

    // ── Steps 6+: Remaining yes/no pages → premium ──
    for (let step = 0; step < 5; step++) {
      const slug = page.url().split("/").pop() ?? "";
      if (slug === "basisgegevens" || slug === "samenvatting") break;

      try {
        const radios = page.locator('input[type="radio"]:visible');
        const rCount = await radios.count();
        if (rCount === 2) {
          await radios.nth(1).click({ force: true });
          await page.waitForTimeout(300);
        }
      } catch { /* no radios */ }

      let advanced = false;
      for (const sel of [
        'a:has-text("Volgende")',
        'a:has-text("Bekijk jouw premie")',
        'button:has-text("Volgende")',
      ]) {
        try {
          const btn = page.locator(sel).first();
          if (await btn.isVisible({ timeout: 1500 })) {
            await btn.evaluate((n) => (n as HTMLElement).click());
            advanced = true;
            await page.waitForTimeout(3000);
            break;
          }
        } catch { /* try next */ }
      }
      if (!advanced) break;
    }

    await page.waitForTimeout(2000);

    // ── Extract Opstal premium ──
    const allText = await page.locator("body").innerText();
    const premie = extractOpstalPremie(allText);

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

function extractOpstalPremie(text: string): number | undefined {
  // Find the Opstalverzekering section and get the first price
  const productIdx = text.indexOf("Opstalverzekering");
  if (productIdx !== -1) {
    const section = text.substring(productIdx, productIdx + 200);
    const priceMatch = section.match(/€\s*(\d{1,3})\s*[,.]\s*(\d{2})/);
    if (priceMatch) {
      const price = parseFloat(`${priceMatch[1]}.${priceMatch[2]}`);
      if (price > 0 && price < 200) return price;
    }
  }

  // Fallback patterns
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
