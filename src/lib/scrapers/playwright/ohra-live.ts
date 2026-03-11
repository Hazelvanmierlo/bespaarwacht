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

export async function scrapeOhra(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  const logger = createLogger("OHRA-inboedel");
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);
    logger.log("Browser gestart");

    // ── Navigate to calculator ──
    await page.goto("https://www.ohra.nl/inboedelverzekering/berekenen", {
      waitUntil: "networkidle",
      timeout: 20000,
    });
    logger.log("Pagina geladen");

    await waitForStep(page, { selector: "#root_geboortedatum", timeout: 10000 });
    await acceptCookies(page);
    logger.log("Cookies geaccepteerd");

    // ── Geboortedatum ──
    await page.fill("#root_geboortedatum", input.geboortedatum);
    await page.waitForTimeout(300);
    logger.log("Geboortedatum ingevuld", input.geboortedatum);

    // ── Gezinssamenstelling (radio by label text) ──
    const isGezin =
      input.gezin?.toLowerCase().includes("gezin") ||
      input.gezin?.toLowerCase().includes("samen");
    const gezinLabel = isGezin
      ? "Mijzelf, partner en kind(eren)"
      : "Mijzelf";
    try {
      // Use getByRole for reliable radio selection by accessible name
      await page.getByRole("radio", { name: gezinLabel, exact: true }).click();
    } catch {
      // Fallback: try clicking the label text directly
      await page.getByText(gezinLabel, { exact: true }).first().click();
    }
    await page.waitForTimeout(300);
    logger.log("Gezinssamenstelling", gezinLabel);

    // ── Eigenaar/Huurder (radio by label text) ──
    const eigenaarLabel = input.eigenaar ? "Eigenaar" : "Huurder";
    try {
      await page.getByRole("radio", { name: eigenaarLabel, exact: true }).click();
    } catch {
      await page.getByText(eigenaarLabel, { exact: true }).first().click();
    }
    await page.waitForTimeout(300);
    logger.log("Eigenaar/Huurder", eigenaarLabel);

    // ── Postcode + Huisnummer ──
    await page.fill("#root_postcode", input.postcode);
    await page.fill("#root_huisnummer", input.huisnummer);
    // Trigger blur to start address lookup
    await page.locator("#root_huisnummer").evaluate((el) => el.dispatchEvent(new Event("blur", { bubbles: true })));
    await page.waitForTimeout(1500);
    logger.log("Adres ingevuld", `${input.postcode} ${input.huisnummer}`);

    // ── Toevoeging (Adres) — select first real option if dropdown appears ──
    try {
      const toevoegingSelect = page.locator('select[name="root_toevoeging"]');
      if (await toevoegingSelect.isVisible({ timeout: 3000 })) {
        // Wait for address API to populate options
        await page.waitForTimeout(2000);
        const optionCount = await toevoegingSelect.evaluate(
          (sel: HTMLSelectElement) => sel.options.length
        );
        if (optionCount > 1) {
          // Select first real option (skip "Maak een keuze")
          await toevoegingSelect.selectOption({ index: 1 });
          logger.log("Toevoeging geselecteerd", `${optionCount} opties`);
        } else {
          logger.log("Toevoeging zichtbaar maar geen opties", "API mogelijk niet beschikbaar");
        }
        await page.waitForTimeout(300);
      }
    } catch {
      logger.log("Geen toevoeging dropdown");
    }

    // ── Bestemming: "Eigen bewoning" (by label) ──
    try {
      const bestemmingSelect = page.getByLabel("Bestemming van je woning");
      if (await bestemmingSelect.isVisible({ timeout: 2000 })) {
        await bestemmingSelect.selectOption("Eigen bewoning");
        await page.waitForTimeout(300);
        logger.log("Bestemming", "Eigen bewoning");
      }
    } catch {
      // Might not be visible for certain address types
      logger.log("Bestemming overgeslagen");
    }

    // ── Dakbedekking: "Pannen" (by label) ──
    try {
      const dakSelect = page.getByLabel("Waar is je dak van gemaakt?");
      if (await dakSelect.isVisible({ timeout: 2000 })) {
        await dakSelect.selectOption("Pannen");
        await page.waitForTimeout(300);
        logger.log("Dakbedekking", "Pannen");
      }
    } catch {
      logger.log("Dakbedekking overgeslagen");
    }

    // ── Bouwaard (muren): "Steen" (by label) ──
    try {
      const bouwSelect = page.getByLabel("Waar zijn je muren van gemaakt?");
      if (await bouwSelect.isVisible({ timeout: 2000 })) {
        await bouwSelect.selectOption("Steen");
        await page.waitForTimeout(300);
        logger.log("Bouwaard", "Steen");
      }
    } catch {
      logger.log("Bouwaard overgeslagen");
    }

    // ── Handle toevoeging again if it appeared after selecting bestemming ──
    try {
      const toevoegingSelect = page.locator('select[name="root_toevoeging"]');
      if (await toevoegingSelect.isVisible({ timeout: 1000 })) {
        const optionCount = await toevoegingSelect.evaluate(
          (sel: HTMLSelectElement) => sel.options.length
        );
        if (optionCount > 1) {
          await toevoegingSelect.selectOption({ index: 1 });
          logger.log("Toevoeging (2e poging)", `${optionCount} opties`);
        }
      }
    } catch { /* ignore */ }

    // ── Click "Bereken je premie" ──
    const submitButton = page.getByRole("button", { name: "Bereken je premie" });
    await submitButton.click();
    logger.log("Bereken je premie geklikt");

    // ── Wait for results page ──
    const hasResults = await waitForStep(page, {
      text: "per maand",
      timeout: 15000,
    });
    if (!hasResults) {
      // Fallback: wait a fixed time for slow connections
      await page.waitForTimeout(5000);
    }
    logger.log("Resultaatpagina", hasResults ? "gevonden" : "timeout — probeer toch");

    // ── Extract premium from results ──
    // Try "Basis" section first for lowest inboedel premium
    let premie = await extractPrice(page, {
      sectionLabel: "Basis",
      minPrice: 2,
      maxPrice: 80,
    });

    if (!premie) {
      // Fallback: any price on the page
      premie = await extractPrice(page, { minPrice: 2, maxPrice: 80 });
    }

    await closeBrowser(browser);

    if (premie) {
      logger.log("Premie gevonden", `${premie} per maand`);
      return {
        status: "success",
        premie,
        dekking: "Inboedel Basis",
        eigenRisico: "€ 0",
        duration_ms: Date.now() - start,
        stepLog: logger.getSteps(),
      };
    }

    logger.fail("Premie extractie", "Geen premie gevonden op pagina");
    return {
      status: "error",
      error: "Premie niet gevonden op pagina.",
      duration_ms: Date.now() - start,
      stepLog: logger.getSteps(),
    };
  } catch (err) {
    logger.fail("Scraper", (err as Error).message);
    await closeBrowser(browser);
    return {
      status: "error",
      error: (err as Error).message,
      duration_ms: Date.now() - start,
      stepLog: logger.getSteps(),
    };
  }
}
