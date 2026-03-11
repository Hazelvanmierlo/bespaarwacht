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
} from "../utils";

/**
 * ASR Inboedelverzekering "Ik kies zelf" — live scraper.
 *
 * Navigates the Angular funnel at asr.nl, fills in the quote form,
 * and extracts the monthly premium from the results page.
 */
export async function scrapeAsrInboedel(
  input: LiveScraperInput,
): Promise<LiveScraperResult> {
  const start = Date.now();
  const logger = createLogger("ASR-inboedel");
  let browser: Browser | null = null;

  try {
    browser = await launchBrowser();
    const page = await createPage(browser);
    logger.log("Browser gestart");

    // ── Navigate directly to the funnel (skip landing page CTA) ─────────
    await page.goto(
      "https://www.asr.nl/verzekeringen/inboedelverzekering/afsluiten",
      { waitUntil: "domcontentloaded", timeout: 20_000 },
    );
    logger.log("Pagina geladen", "afsluiten-funnel");

    await acceptCookies(page);
    logger.log("Cookies geaccepteerd");

    // Wait for the form to be ready (Angular web-component hydration)
    const formReady = await waitForStep(page, {
      text: "Gezinssamenstelling",
      timeout: 10_000,
    });
    if (!formReady) {
      logger.fail("Formulier", "Gezinssamenstelling niet gevonden");
      await closeBrowser(browser);
      return {
        status: "error",
        error: "Formulier niet geladen (Gezinssamenstelling niet gevonden)",
        duration_ms: Date.now() - start,
        stepLog: logger.getSteps(),
      };
    }
    logger.log("Formulier geladen");

    // ── 1. Gezinssamenstelling ───────────────────────────────────────────
    const gezinMap: Record<string, string> = {
      alleenstaand: "Alleenstaande zonder kinderen",
      "alleenstaand-kinderen": "Alleenstaande met kinderen",
      gezin: "Echtpaar/samenwonend zonder kinderen",
      "gezin-kinderen": "Echtpaar/samenwonend met kinderen",
    };
    const gezinLabel = gezinMap[input.gezin] ?? "Alleenstaande zonder kinderen";

    const gezinCombo = page.getByRole("combobox", {
      name: "Gezinssamenstelling",
    });
    await gezinCombo.click();
    await page.getByRole("option", { name: gezinLabel }).click();
    logger.log("Gezinssamenstelling", gezinLabel);

    // ── 2. Geboortedatum ─────────────────────────────────────────────────
    const geboortedatumInput = page.getByRole("textbox", {
      name: "Geboortedatum",
    });
    await geboortedatumInput.click();
    await geboortedatumInput.pressSequentially(input.geboortedatum, {
      delay: 30,
    });
    logger.log("Geboortedatum", input.geboortedatum);

    // ── 3. Postcode ──────────────────────────────────────────────────────
    const postcodeInput = page.getByRole("textbox", { name: "Postcode" });
    await postcodeInput.click();
    await postcodeInput.pressSequentially(input.postcode, { delay: 30 });
    logger.log("Postcode", input.postcode);

    // ── 4. Huisnummer (spinbutton, not textbox) ──────────────────────────
    const huisnummerInput = page.getByRole("spinbutton", {
      name: "Huisnummer",
    });
    await huisnummerInput.click();
    await huisnummerInput.pressSequentially(input.huisnummer, { delay: 30 });
    logger.log("Huisnummer", input.huisnummer);

    // ── 5. Koop- of huurwoning ───────────────────────────────────────────
    if (input.eigenaar) {
      await page.getByRole("radio", { name: "Koopwoning" }).click();
      logger.log("Woningtype", "Koopwoning");
    } else {
      await page.getByRole("radio", { name: "Huurwoning" }).click();
      logger.log("Woningtype", "Huurwoning");
    }

    // Wait for address resolution (the "Adres" heading appears)
    const adresResolved = await waitForStep(page, {
      text: "Adres",
      timeout: 8_000,
    });
    if (adresResolved) {
      logger.log("Adres opgehaald");
    } else {
      logger.fail("Adres", "Adres niet opgehaald binnen timeout");
    }

    // ── 6. Particulier gebruik → Ja ──────────────────────────────────────
    // The radio group "Gebruik je de woning particulier?" has Ja/Nee.
    // We need to target the specific radio group, not the one in oppervlakte section.
    try {
      const particulierGroup = page.getByRole("radiogroup", {
        name: /particulier/i,
      });
      await particulierGroup.getByRole("radio", { name: "Ja" }).click();
      logger.log("Particulier gebruik", "Ja");
    } catch {
      logger.fail("Particulier gebruik", "Radio niet gevonden");
    }

    // ── 7. Soort muren → Steen ───────────────────────────────────────────
    try {
      await page.getByRole("radio", { name: "Steen" }).click();
      logger.log("Soort muren", "Steen");
    } catch {
      logger.fail("Soort muren", "Radio niet gevonden");
    }

    // ── 8. Soort dak → Schuin dak met pannen of mastiek ──────────────────
    try {
      const dakCombo = page.getByRole("combobox", { name: "Soort dak" });
      await dakCombo.click();
      await page
        .getByRole("option", { name: "Schuin dak met pannen of mastiek" })
        .click();
      logger.log("Soort dak", "Schuin dak met pannen of mastiek");
    } catch {
      logger.fail("Soort dak", "Combobox niet gevonden");
    }

    // ── 9. Submit → Bekijk je premie ─────────────────────────────────────
    const submitBtn = page.getByRole("button", {
      name: /Verder naar.*Bekijk je premie/i,
    });
    await submitBtn.click();
    logger.log("Submit", "Verder naar: Bekijk je premie");

    // Wait for the results page with premium info
    const premieVisible = await waitForStep(page, {
      text: "p/mnd",
      timeout: 10_000,
    });
    if (!premieVisible) {
      // Fallback: wait for receipt section
      await waitForStep(page, {
        text: "Je betaalt per maand",
        timeout: 5_000,
      });
    }
    logger.log("Resultatenpagina geladen");

    // ── 10. Extract premium ──────────────────────────────────────────────
    const premie = await extractPrice(page, {
      sectionLabel: "Je betaalt per maand",
      minPrice: 2,
      maxPrice: 100,
    });

    // Also try to extract eigen risico from the receipt
    let eigenRisico = "€ 500"; // default on ASR
    try {
      const receiptText = await page
        .locator('article[aria-label="Receipt details"]')
        .innerText();
      const erMatch = receiptText.match(/Eigen risico[\s\S]*?(€\s*\d+)/);
      if (erMatch) eigenRisico = erMatch[1].replace(/\s/g, " ");
    } catch {
      // keep default
    }

    await closeBrowser(browser);

    if (premie) {
      logger.log("Premie gevonden", `€ ${premie.toFixed(2)} p/m`);
      return {
        status: "success",
        premie,
        dekking: "Inboedel Basis",
        eigenRisico,
        duration_ms: Date.now() - start,
        stepLog: logger.getSteps(),
      };
    }

    logger.fail("Premie", "Niet gevonden op pagina");
    return {
      status: "error",
      error: "Premie niet gevonden op pagina.",
      duration_ms: Date.now() - start,
      stepLog: logger.getSteps(),
    };
  } catch (err) {
    const msg = (err as Error).message;
    logger.fail("Onverwachte fout", msg);
    await closeBrowser(browser);
    return {
      status: "error",
      error: msg,
      duration_ms: Date.now() - start,
      stepLog: logger.getSteps(),
    };
  }
}
