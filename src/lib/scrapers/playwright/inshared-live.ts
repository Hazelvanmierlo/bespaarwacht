import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  createLogger,
  waitForStep,
  extractPrice,
  type LiveScraperInput,
  type LiveScraperResult,
} from "./utils";

export async function scrapeInShared(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  const logger = createLogger("InShared-inboedel");
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);
    logger.log("Browser gestart");

    // ── Step 1: Landing page ──
    await page.goto("https://www.inshared.nl/woonverzekering/inboedelverzekering", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });
    await page.waitForTimeout(2000);
    logger.log("Landingspagina geladen");

    await acceptCookies(page);
    logger.log("Cookies geaccepteerd");

    // Fill postcode + huisnummer on landing page (use #id — there are duplicate placeholders)
    await page.fill("#postal-code", input.postcode);
    await page.fill("#house-number", input.huisnummer);
    await page.waitForTimeout(300);
    logger.log("Postcode + huisnummer ingevuld", `${input.postcode} ${input.huisnummer}`);

    // Click "Bereken uw premie"
    await page.locator('button[title="Bereken uw premie"]').click();
    await waitForStep(page, { selector: "#cyno-date-input-0", timeout: 10000 });
    logger.log("Calculator formulier geladen");

    // ── Step 2: Calculator formulier ──
    // Address is pre-filled from landing page. Wait for street to resolve.
    await page.waitForTimeout(1500);

    // Rieten dak: Nee — click the label text next to the radio
    await page.locator("label[for='straw_roofing_indication-N']").click();
    await page.waitForTimeout(300);
    logger.log("Rieten dak", "Nee");

    // Beveiliging: Geen
    await page.selectOption("#security_type_code", "GEEN");
    await page.waitForTimeout(300);
    logger.log("Beveiliging", "Geen");

    // Geboortedatum — use the custom date input
    const gebInput = page.locator("#cyno-date-input-0");
    await gebInput.click();
    await gebInput.fill(input.geboortedatum);
    await gebInput.press("Tab");
    await page.waitForTimeout(500);
    logger.log("Geboortedatum", input.geboortedatum);

    // Gezinssamenstelling
    const gezinCode = mapGezinToInShared(input.gezin);
    await page.selectOption("#family_composition_code", gezinCode);
    await page.waitForTimeout(300);
    logger.log("Gezinssamenstelling", `${input.gezin} -> ${gezinCode}`);

    // Eigenaar/huurder — click the label for the radio
    // Default: huurder (eigenaar=false)
    const isEigenaar = input.eigenaar === true;
    const ownerLabelFor = isEigenaar ? "tenant_owner_code-E" : "tenant_owner_code-H";
    await page.locator(`label[for='${ownerLabelFor}']`).click();
    await page.waitForTimeout(300);
    logger.log("Eigenaar/huurder", isEigenaar ? "Eigenaar" : "Huurder");

    // Click "Ga verder"
    await page.getByRole("button", { name: "Ga verder" }).click();
    logger.log("Ga verder geklikt");

    // ── Step 3: Wait for results page ──
    const resultsLoaded = await waitForStep(page, { text: "Per maand", timeout: 15000 });
    if (!resultsLoaded) {
      // Check for validation errors
      const errorText = await page.locator(".alert--validation, .wuc-form-error").first().textContent().catch(() => null);
      if (errorText) {
        logger.fail("Resultaten laden", `Validatiefout: ${errorText}`);
        await closeBrowser(browser);
        return { status: "error", error: `Validatiefout: ${errorText}`, duration_ms: Date.now() - start, stepLog: logger.getSteps() };
      }
      logger.fail("Resultaten laden", "Timeout — premie pagina niet geladen");
      await closeBrowser(browser);
      return { status: "error", error: "Timeout bij laden premie pagina", duration_ms: Date.now() - start, stepLog: logger.getSteps() };
    }
    logger.log("Resultaatpagina geladen");

    // ── Step 4: Extract premium ──
    // InShared splits prices across separate <span> elements ("6" + ",75")
    // so innerText may have newlines between them. Use textContent which
    // concatenates without whitespace, and also try the Maandbedrag button.
    await page.waitForTimeout(2000);
    let premie = await page.evaluate(() => {
      // Strategy 1: Find the Maandbedrag button/header (always shows total)
      const body = document.body.textContent || "";
      const mbMatch = body.match(/Maandbedrag\s*(\d{1,3})\s*[,.]\s*(\d{2})/);
      if (mbMatch) return parseFloat(`${mbMatch[1]}.${mbMatch[2]}`);

      // Strategy 2: Find "Per maand" near "Inboedel" using textContent
      const allDivs = document.querySelectorAll("div, section, fieldset");
      for (const el of allDivs) {
        const tc = el.textContent || "";
        if (tc.includes("Inboedel") && tc.includes("Per maand")) {
          const match = tc.match(/Per maand\s*(\d{1,3})\s*[,.]\s*(\d{2})/);
          if (match) {
            const price = parseFloat(`${match[1]}.${match[2]}`);
            if (price >= 2 && price <= 100) return price;
          }
        }
      }

      // Strategy 3: grab all digit,digit patterns from textContent
      const allPrices = [...body.matchAll(/(\d{1,3}),(\d{2})/g)]
        .map((m) => parseFloat(`${m[1]}.${m[2]}`))
        .filter((p) => p >= 2 && p <= 100);
      return allPrices.length > 0 ? allPrices[0] : null;
    });
    // Fallback to generic extractPrice
    if (!premie) {
      premie = await extractPrice(page, { minPrice: 2, maxPrice: 100 });
    }
    await closeBrowser(browser);

    if (premie) {
      logger.log("Premie gevonden", `${premie}`);
      return {
        status: "success",
        premie,
        dekking: "Inboedel Standaard",
        eigenRisico: "\u20AC 0",
        duration_ms: Date.now() - start,
        stepLog: logger.getSteps(),
      };
    }

    logger.fail("Premie extractie", "Geen premie gevonden op pagina");
    return { status: "error", error: "Premie niet gevonden.", duration_ms: Date.now() - start, stepLog: logger.getSteps() };
  } catch (err) {
    logger.fail("Onverwachte fout", (err as Error).message);
    await closeBrowser(browser);
    return { status: "error", error: (err as Error).message, duration_ms: Date.now() - start, stepLog: logger.getSteps() };
  }
}

function mapGezinToInShared(gezin?: string): string {
  if (!gezin) return "2MET";
  const lower = gezin.toLowerCase();
  if (lower.includes("alleen") || lower === "alleenstaand") return "1ZON";
  return "2MET";
}
