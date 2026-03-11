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

/**
 * Map gezin input to CB's Gezinssamenstelling dropdown values.
 *   "alleenstaand" → "1 persoon"
 *   "gezin"        → "2 personen"  (conservative default for multi-person household)
 */
function mapGezin(gezin: string): string {
  switch (gezin) {
    case "alleenstaand":
      return "1 persoon";
    case "gezin":
      return "2 personen";
    default:
      return "1 persoon";
  }
}

export async function scrapeCentraalBeheer(input: LiveScraperInput): Promise<LiveScraperResult> {
  const start = Date.now();
  const logger = createLogger("CB-inboedel");
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);

    // ── Navigate to calculator ──────────────────────────────────────────
    await page.goto(
      "https://www.centraalbeheer.nl/verzekeringen/woonverzekering/premie-berekenen",
      { waitUntil: "domcontentloaded", timeout: 20000 }
    );
    await page.waitForTimeout(2000);
    logger.log("navigate", "premie-berekenen loaded");

    // ── Accept cookies ──────────────────────────────────────────────────
    await acceptCookies(page);
    logger.log("cookies", "accepted");

    // ── Step 1: Login bypass (/inloggen) ────────────────────────────────
    try {
      const found = await waitForStep(page, { text: "Nee, doorgaan zonder inloggen", timeout: 5000 });
      if (found) {
        // Click the label wrapper (radio has custom overlay that intercepts pointer events)
        const neeLabel = page.locator('label[for="inloggen-1"], #inloggen-continue-label, [qa-id="inloggen-continue-label"]').first();
        if (await neeLabel.isVisible({ timeout: 2000 })) {
          await neeLabel.click();
        } else {
          // Fallback: click the text wrapper
          await page.getByText("Nee, doorgaan zonder inloggen").click();
        }
        await page.waitForTimeout(500);
        await page.getByRole("link", { name: "Volgende" }).click();
        await page.waitForTimeout(2000);
        logger.log("login-bypass", "selected 'Nee, doorgaan zonder inloggen'");
      }
    } catch {
      logger.log("login-bypass", "no login step found, skipping");
    }

    // ── Step 2: Address (/woning-zoeken) ────────────────────────────────
    await waitForStep(page, { text: "Jouw woning", timeout: 5000 });

    await page.getByRole("textbox", { name: "Postcode" }).fill(input.postcode);
    await page.waitForTimeout(200);
    await page.getByRole("textbox", { name: "Huisnummer" }).fill(input.huisnummer);
    await page.waitForTimeout(300);
    logger.log("address-fill", `${input.postcode} ${input.huisnummer}`);

    await page.getByRole("button", { name: "Adresgegevens ophalen" }).click();
    await page.waitForTimeout(4000);
    logger.log("address-lookup", "ophalen clicked");

    // Verify address was found (the address text or Type woning dropdown should appear)
    const addrFound = await waitForStep(page, { text: "Type woning", timeout: 5000 });
    if (!addrFound) {
      logger.fail("address-lookup", "no address results found");
      await closeBrowser(browser);
      return { status: "error", error: "Adres niet gevonden", duration_ms: Date.now() - start, stepLog: logger.getSteps() };
    }
    logger.log("address-found", "address resolved with Type woning");

    // Click Volgende to proceed
    await page.getByRole("link", { name: "Volgende" }).click();
    await page.waitForTimeout(2000);
    logger.log("woning-zoeken", "completed");

    // ── Step 3: Eigenaar (/eigenaar) ────────────────────────────────────
    await waitForStep(page, { text: "Ben je de eigenaar", timeout: 5000 });

    const isEigenaar = input.eigenaar === true;
    if (isEigenaar) {
      // "Ja" is typically the default (checked), but click to be sure
      const jaLabel = page.locator('#jaNee-0-label').first();
      if (await jaLabel.isVisible({ timeout: 2000 })) {
        await jaLabel.click();
      }
      logger.log("eigenaar", "Ja (eigenaar)");
    } else {
      // Select "Nee" (huurder)
      const neeLabel = page.locator('#jaNee-1-label').first();
      if (await neeLabel.isVisible({ timeout: 2000 })) {
        await neeLabel.click();
      }
      logger.log("eigenaar", "Nee (huurder)");
    }
    await page.waitForTimeout(500);

    await page.getByRole("link", { name: "Volgende" }).click();
    await page.waitForTimeout(2000);
    logger.log("eigenaar-step", "completed");

    // ── Step 4: Bestaande verzekering (/bestaande-verzekering) ──────────
    await waitForStep(page, { text: "Heb je al een Woonverzekering", timeout: 5000 });

    // Select "Nee"
    const existingNee = page.locator('#existingPolis-false-label, #existingPolis-1-label').first();
    if (await existingNee.isVisible({ timeout: 2000 })) {
      await existingNee.click();
    } else {
      // Fallback: click text
      await page.getByText("Nee", { exact: true }).last().click();
    }
    await page.waitForTimeout(500);
    logger.log("bestaande-verzekering", "Nee");

    await page.getByRole("link", { name: "Volgende" }).click();
    await page.waitForTimeout(2000);
    logger.log("bestaande-verzekering-step", "completed");

    // ── Step 5: Situatie (/situatie) — geboortedatum + gezin ────────────
    await waitForStep(page, { text: "Jouw gegevens", timeout: 5000 });

    // Geboortedatum — use pressSequentially for SPA input validation
    const geboortedatumInput = page.getByRole("textbox", { name: "Geboortedatum" });
    await geboortedatumInput.click();
    await geboortedatumInput.pressSequentially(input.geboortedatum, { delay: 30 });
    await page.waitForTimeout(300);
    logger.log("geboortedatum", input.geboortedatum);

    // Gezinssamenstelling dropdown
    const gezinValue = mapGezin(input.gezin);
    await page.getByLabel("Gezinssamenstelling").selectOption(gezinValue);
    await page.waitForTimeout(300);
    logger.log("gezinssamenstelling", gezinValue);

    await page.getByRole("link", { name: "Volgende" }).click();
    await page.waitForTimeout(2000);
    logger.log("situatie-step", "completed");

    // ── Step 6: Rieten dak (/rieten-dak) ────────────────────────────────
    const rietenDakFound = await waitForStep(page, { text: "rieten dak", timeout: 5000 });
    if (rietenDakFound) {
      // Select "Nee"
      const rietNee = page.locator('#jaNee-1-label').first();
      if (await rietNee.isVisible({ timeout: 2000 })) {
        await rietNee.click();
      }
      await page.waitForTimeout(500);
      logger.log("rieten-dak", "Nee");

      await page.getByRole("link", { name: "Volgende" }).click();
      await page.waitForTimeout(2000);
      logger.log("rieten-dak-step", "completed");
    } else {
      logger.log("rieten-dak", "step not shown, skipping");
    }

    // ── Step 7: Kamerbewoner (/kamerbewoner) ────────────────────────────
    const kamerFound = await waitForStep(page, { text: "Woon je op kamers", timeout: 5000 });
    if (kamerFound) {
      const kamerNee = page.locator('#jaNee-1-label').first();
      if (await kamerNee.isVisible({ timeout: 2000 })) {
        await kamerNee.click();
      }
      await page.waitForTimeout(500);
      logger.log("kamerbewoner", "Nee");

      await page.getByRole("link", { name: "Volgende" }).click();
      await page.waitForTimeout(2000);
      logger.log("kamerbewoner-step", "completed");
    } else {
      logger.log("kamerbewoner", "step not shown, skipping");
    }

    // ── Step 8: Collectiviteit (/collectiviteit) ────────────────────────
    const collectFound = await waitForStep(page, { text: "korting", timeout: 5000 });
    if (collectFound) {
      logger.log("collectiviteit", "page found, skipping discount field");
    }

    // Try "Bekijk jouw premie" first, then fall back to "Volgende"
    let advanced = false;
    for (const linkText of ["Bekijk jouw premie", "Volgende"]) {
      try {
        const link = page.locator(`a:has-text("${linkText}")`).first();
        if (await link.isVisible({ timeout: 3000 })) {
          await link.evaluate((n) => (n as HTMLElement).click());
          await page.waitForTimeout(3000);
          logger.log("collectiviteit-nav", `clicked '${linkText}'`);
          advanced = true;
          break;
        }
      } catch { /* try next */ }
    }
    if (!advanced) {
      logger.fail("collectiviteit-nav", "no navigation button found");
    }

    // ── Step 9: Extract premium (/basisgegevens) ────────────────────────
    await waitForStep(page, { text: "Jouw premie", timeout: 8000 });
    logger.log("results-page", `URL: ${page.url()}`);

    const premie = await extractPrice(page, { sectionLabel: "Inboedelverzekering" });
    logger.log("extract-price", premie ? `EUR ${premie}` : "not found");

    await closeBrowser(browser);

    if (premie) {
      return {
        status: "success",
        premie,
        dekking: "Inboedel",
        eigenRisico: "\u20AC 0",
        duration_ms: Date.now() - start,
        stepLog: logger.getSteps(),
      };
    }

    return {
      status: "error",
      error: "Premie niet gevonden op pagina.",
      duration_ms: Date.now() - start,
      stepLog: logger.getSteps(),
    };
  } catch (err) {
    logger.fail("fatal", (err as Error).message);
    await closeBrowser(browser);
    return {
      status: "error",
      error: (err as Error).message,
      duration_ms: Date.now() - start,
      stepLog: logger.getSteps(),
    };
  }
}
