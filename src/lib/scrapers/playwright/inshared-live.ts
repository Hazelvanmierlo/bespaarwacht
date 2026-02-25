import { chromium, type Browser, type Page } from "playwright";

export interface InSharedInput {
  postcode: string;
  huisnummer: string;
  geboortedatum?: string;
  gezin?: "1ZON" | "1MET" | "2ZON" | "2MET";
  eigenaar?: boolean;
}

export interface InSharedResult {
  status: "success" | "error";
  premieStandaard?: number;   // Inboedel basis premie
  premieCompleet?: number;    // Inboedel + Compleet uitbreiding
  premieOpstal?: number;      // Opstal premie
  premieTotaal?: number;      // Maandbedrag totaal
  error?: string;
  duration_ms: number;
}

export async function scrapeInShared(input: InSharedInput): Promise<InSharedResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({ headless: true });
    const page = await (
      await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        locale: "nl-NL",
        viewport: { width: 1280, height: 1200 },
      })
    ).newPage();

    // ── Landing page → Calculator ──
    await page.goto("https://www.inshared.nl/woonverzekering/inboedelverzekering", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(2500);
    await acceptCookies(page);

    await page.fill("#postal-code", input.postcode);
    await page.fill("#house-number", input.huisnummer);
    await page.waitForTimeout(300);
    await page.locator('button[title="Bereken uw premie"]').click();
    await page.waitForTimeout(4000);

    // ── Calculator formulier ──
    // Postcode + huisnummer
    await page.fill("#postalCode", input.postcode);
    await page.fill("#houseNumber", input.huisnummer);
    await page.press("#houseNumber", "Tab");
    await page.waitForTimeout(2500);

    // Huisnummer toevoeging: selecteer "-" (geen toevoeging) als die er is
    try {
      const hasAddition = await page.locator("#houseNumberAddition option").count();
      if (hasAddition > 1) {
        await page.selectOption("#houseNumberAddition", { index: 1 });
        await page.waitForTimeout(500);
      }
    } catch {}

    // Rieten dak: Nee — via JavaScript
    await page.evaluate(() => {
      const radio = document.getElementById("straw_roofing_indication-N") as HTMLInputElement;
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); radio.click(); }
    });
    await page.waitForTimeout(500);

    // Beveiliging: Geen
    await page.selectOption("#security_type_code", "GEEN");
    await page.waitForTimeout(300);

    // Geboortedatum
    const gebInput = page.locator("#cyno-date-input-0");
    await gebInput.click();
    await gebInput.fill(input.geboortedatum ?? "15-06-1985");
    await gebInput.press("Tab");
    await page.waitForTimeout(500);

    // Gezinssamenstelling
    await page.selectOption("#family_composition_code", input.gezin ?? "2MET");
    await page.waitForTimeout(300);

    // Eigenaar — via JavaScript
    const ownerId = input.eigenaar !== false ? "tenant_owner_code-E" : "tenant_owner_code-H";
    await page.evaluate((id) => {
      const radio = document.getElementById(id) as HTMLInputElement;
      if (radio) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); radio.click(); }
    }, ownerId);
    await page.waitForTimeout(500);

    // Klik "Ga verder"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const gaVerder = btns.find((b) => b.textContent?.includes("Ga verder"));
      if (gaVerder) gaVerder.click();
    });
    await page.waitForTimeout(10000);

    // ── Premie uitlezen ──
    const allText = await page.locator("body").innerText();
    const premies = extractPremies(allText);

    await browser.close();

    if (premies.inboedel || premies.totaal) {
      return {
        status: "success",
        premieStandaard: premies.inboedel,
        premieCompleet: premies.inboedelCompleet,
        premieOpstal: premies.opstal,
        premieTotaal: premies.totaal,
        duration_ms: Date.now() - start,
      };
    }

    return { status: "error", error: "Premie niet gevonden.", duration_ms: Date.now() - start };
  } catch (err) {
    if (browser) await browser.close();
    return { status: "error", error: (err as Error).message, duration_ms: Date.now() - start };
  }
}

async function acceptCookies(page: Page) {
  try {
    const btn = page.locator('button[title="Akkoord"], button[data-element="all-button"]').first();
    if (await btn.isVisible({ timeout: 3000 })) {
      await btn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}
}

interface ExtractedPremies {
  inboedel?: number;
  opstal?: number;
  compleet?: number;         // Compleet uitbreiding (add-on prijs)
  inboedelCompleet?: number; // Inboedel + Compleet
  totaal?: number;           // Maandbedrag totaal
}

function extractPremies(text: string): ExtractedPremies {
  const result: ExtractedPremies = {};

  // Helper: parse prijs uit multiline text (InShared splits "7\n,90")
  function parsePrice(match: RegExpMatchArray | null): number | undefined {
    if (!match) return undefined;
    return parseFloat(`${match[1]}.${match[2]}`);
  }

  // Maandbedrag totaal: "Maandbedrag \n30\n,25" of "Maandbedrag 30,25"
  const totaalMatch = text.match(/[Mm]aandbedrag\s+(\d{1,3})\s*[,.]\s*(\d{2})/);
  result.totaal = parsePrice(totaalMatch);

  // Inboedel: zoek "Inboedel" gevolgd door "Per maand" met prijs
  const inboedelMatch = text.match(/Inboedel[\s\S]{0,300}?Per maand\s+(\d{1,3})\s*[,.]\s*(\d{2})/);
  result.inboedel = parsePrice(inboedelMatch);

  // Opstal: zoek "Opstal" gevolgd door "Per maand" met prijs
  const opstalMatch = text.match(/Opstal[\s\S]{0,300}?Per maand\s+(\d{1,3})\s*[,.]\s*(\d{2})/);
  result.opstal = parsePrice(opstalMatch);

  // Compleet uitbreiding: zoek "Compleet" gevolgd door prijs (zonder "Per maand")
  const compleetMatch = text.match(/Compleet[\s\S]{0,100}?(\d{1,3})\s*[,.]\s*(\d{2})/);
  result.compleet = parsePrice(compleetMatch);

  // Bereken inboedel + compleet
  if (result.inboedel && result.compleet) {
    result.inboedelCompleet = Math.round((result.inboedel + result.compleet) * 100) / 100;
  }

  // Fallback: zoek alle "Per maand" prijzen
  if (!result.inboedel) {
    const perMaandAll = [...text.matchAll(/Per maand\s+(\d{1,3})\s*[,.]\s*(\d{2})/g)];
    if (perMaandAll.length >= 1) result.inboedel = parsePrice(perMaandAll[0]);
    if (perMaandAll.length >= 2) result.opstal = parsePrice(perMaandAll[1]);
  }

  // Fallback: zoek alle losse prijzen (format: "7\n,90" of "22,35")
  if (!result.inboedel && !result.totaal) {
    const allPrices = [...text.matchAll(/(?:^|\s)(\d{1,3})\s*[,.]\s*(\d{2})(?:\s|$)/gm)]
      .map((m) => parseFloat(`${m[1]}.${m[2]}`))
      .filter((p) => p > 2 && p < 100);
    const unique = [...new Set(allPrices)];
    if (unique.length >= 1) result.inboedel = unique[0];
    if (unique.length >= 2) result.opstal = unique[1];
  }

  return result;
}
