import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  type LiveScraperInput,
  type LiveScraperResult,
} from "./utils";

export async function scrapeInShared(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

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
    await page.fill("#postalCode", input.postcode);
    await page.fill("#houseNumber", input.huisnummer);
    await page.press("#houseNumber", "Tab");
    await page.waitForTimeout(2500);

    // Huisnummer toevoeging
    try {
      const hasAddition = await page.locator("#houseNumberAddition option").count();
      if (hasAddition > 1) {
        await page.selectOption("#houseNumberAddition", { index: 1 });
        await page.waitForTimeout(500);
      }
    } catch { /* no addition dropdown */ }

    // Rieten dak: Nee
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
    const gezinCode = mapGezinToInShared(input.gezin);
    await page.selectOption("#family_composition_code", gezinCode);
    await page.waitForTimeout(300);

    // Eigenaar/huurder
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

    await closeBrowser(browser);

    if (premies.inboedel || premies.totaal) {
      return {
        status: "success",
        premie: premies.inboedel ?? premies.totaal,
        dekking: "Inboedel Standaard",
        eigenRisico: "€ 0",
        duration_ms: Date.now() - start,
      };
    }

    return { status: "error", error: "Premie niet gevonden.", duration_ms: Date.now() - start };
  } catch (err) {
    await closeBrowser(browser);
    return { status: "error", error: (err as Error).message, duration_ms: Date.now() - start };
  }
}

function mapGezinToInShared(gezin?: string): string {
  if (!gezin) return "2MET";
  const lower = gezin.toLowerCase();
  if (lower.includes("alleen") || lower === "alleenstaand") return "1ZON";
  return "2MET";
}

interface ExtractedPremies {
  inboedel?: number;
  totaal?: number;
}

function extractPremies(text: string): ExtractedPremies {
  const result: ExtractedPremies = {};

  function parsePrice(match: RegExpMatchArray | null): number | undefined {
    if (!match) return undefined;
    return parseFloat(`${match[1]}.${match[2]}`);
  }

  // Maandbedrag totaal
  const totaalMatch = text.match(/[Mm]aandbedrag\s+(\d{1,3})\s*[,.]\s*(\d{2})/);
  result.totaal = parsePrice(totaalMatch);

  // Inboedel premie
  const inboedelMatch = text.match(/Inboedel[\s\S]{0,300}?Per maand\s+(\d{1,3})\s*[,.]\s*(\d{2})/);
  result.inboedel = parsePrice(inboedelMatch);

  // Fallback: "Per maand" prijzen
  if (!result.inboedel) {
    const perMaandAll = [...text.matchAll(/Per maand\s+(\d{1,3})\s*[,.]\s*(\d{2})/g)];
    if (perMaandAll.length >= 1) result.inboedel = parsePrice(perMaandAll[0]);
  }

  // Fallback: losse prijzen
  if (!result.inboedel && !result.totaal) {
    const allPrices = [...text.matchAll(/(?:^|\s)(\d{1,3})\s*[,.]\s*(\d{2})(?:\s|$)/gm)]
      .map((m) => parseFloat(`${m[1]}.${m[2]}`))
      .filter((p) => p > 2 && p < 100);
    const unique = [...new Set(allPrices)];
    if (unique.length >= 1) result.inboedel = unique[0];
  }

  return result;
}
