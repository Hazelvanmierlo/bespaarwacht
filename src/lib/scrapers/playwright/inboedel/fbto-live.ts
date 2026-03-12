import type { Browser } from "playwright";
import {
  launchBrowser,
  createPage,
  acceptCookies,
  closeBrowser,
  createLogger,
  waitForStep,
  extractPrice,
  clickFirstVisible,
  type LiveScraperInput,
  type LiveScraperResult,
} from "../utils";

const URL =
  "https://www.fbto.nl/woonverzekering/premie-berekenen/start-inboedelverzekering";

export async function scrapeFbtoInboedel(
  input: LiveScraperInput,
): Promise<LiveScraperResult> {
  const start = Date.now();
  const logger = createLogger("FBTO-inboedel");
  let browser: Browser | null = null;

  try {
    // ── Launch browser ──
    browser = await launchBrowser();
    const page = await createPage(browser);
    logger.log("browser", "launched");

    // ── Step 1: Navigate to wizard ──
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(2000);
    await acceptCookies(page);
    logger.log("navigate", URL);

    // ── Step 2: "Ok, laten we beginnen!" ──
    const startClicked = await clickFirstVisible(
      page,
      'button:has-text("Ok, laten we beginnen")',
      { timeout: 5000, label: "Ok, laten we beginnen" },
    );
    if (startClicked) {
      await page.waitForTimeout(2000);
      logger.log("start-wizard", "clicked 'Ok, laten we beginnen'");
    } else {
      logger.fail("start-wizard", "button not found");
    }

    // ── Step 3: "Heb je al een woonverzekering bij FBTO?" → Nee ──
    await waitForStep(page, { text: "Heb je al een woonverzekering", timeout: 5000 });
    const neeVerzekeringClicked = await clickFirstVisible(
      page,
      'button:has-text("Nee")',
      { timeout: 5000, label: "Nee (al verzekering)" },
    );
    if (neeVerzekeringClicked) {
      await page.waitForTimeout(2000);
      logger.log("heb-je-al-verzekering", "clicked 'Nee'");
    } else {
      logger.fail("heb-je-al-verzekering", "'Nee' button not found");
    }

    // ── Step 4: Address — postcode + huisnummer ──
    await waitForStep(page, { text: "Wat is het adres", timeout: 5000 });

    const pcField = page
      .locator('input[name*="postcode"], textbox[name="Postcode"]')
      .first();
    if (!(await pcField.isVisible({ timeout: 3000 }))) {
      // Fallback: getByRole
      const pcRole = page.getByRole("textbox", { name: "Postcode" });
      await pcRole.click();
      await pcRole.pressSequentially(input.postcode, { delay: 60 });
    } else {
      await pcField.click();
      await pcField.pressSequentially(input.postcode, { delay: 60 });
    }
    await page.keyboard.press("Tab");
    await page.waitForTimeout(500);
    logger.log("postcode", input.postcode);

    const hnField = page
      .locator('input[name*="huisnummer"], textbox[name="Huisnummer"]')
      .first();
    if (!(await hnField.isVisible({ timeout: 2000 }))) {
      const hnRole = page.getByRole("textbox", { name: "Huisnummer" });
      await hnRole.click();
      await hnRole.pressSequentially(input.huisnummer, { delay: 60 });
    } else {
      await hnField.click();
      await hnField.pressSequentially(input.huisnummer, { delay: 60 });
    }
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1500);
    logger.log("huisnummer", input.huisnummer);

    // Click "Ga verder" to submit address
    await clickFirstVisible(page, 'button:has-text("Ga verder")', {
      timeout: 3000,
      label: "Ga verder (adres)",
    });
    await page.waitForTimeout(3000);
    logger.log("adres-submit", "clicked 'Ga verder'");

    // ── Step 5: Woningtype — accept auto-detected default ──
    const woningtypeVisible = await waitForStep(page, {
      text: "Wat voor woning",
      timeout: 5000,
    });
    if (woningtypeVisible) {
      // If a specific woningtype is requested, select it from dropdown
      if (input.woningtype) {
        try {
          const dropdown = page.locator("select, [role=combobox]").first();
          if (await dropdown.isVisible({ timeout: 2000 })) {
            await dropdown.selectOption({ label: input.woningtype });
            logger.log("woningtype", `selected '${input.woningtype}'`);
          }
        } catch {
          logger.log("woningtype", "kept auto-detected value");
        }
      } else {
        logger.log("woningtype", "kept auto-detected value");
      }
      await clickFirstVisible(page, 'button:has-text("Ga verder")', {
        timeout: 3000,
        label: "Ga verder (woningtype)",
      });
      await page.waitForTimeout(2000);
    } else {
      logger.log("woningtype", "step skipped (not visible)");
    }

    // ── Step 6: "Heeft je woning een rieten dak?" → Nee ──
    const rietenDakVisible = await waitForStep(page, {
      text: "rieten dak",
      timeout: 5000,
    });
    if (rietenDakVisible) {
      await clickFirstVisible(page, 'button:has-text("Nee")', {
        timeout: 3000,
        label: "Nee (rieten dak)",
      });
      await page.waitForTimeout(2000);
      logger.log("rieten-dak", "clicked 'Nee'");
    } else {
      logger.log("rieten-dak", "step skipped (not visible)");
    }

    // ── Step 7: "Gekocht of gehuurd?" ──
    const koopHuurVisible = await waitForStep(page, {
      text: "gekocht of gehuurd",
      timeout: 5000,
    });
    if (koopHuurVisible) {
      const koopHuurLabel = input.eigenaar ? "Gekocht" : "Gehuurd";
      await clickFirstVisible(
        page,
        `button:has-text("${koopHuurLabel}")`,
        { timeout: 3000, label: koopHuurLabel },
      );
      await page.waitForTimeout(2000);
      logger.log("gekocht-of-gehuurd", `clicked '${koopHuurLabel}'`);
    } else {
      logger.fail("gekocht-of-gehuurd", "step not found");
    }

    // ── Step 8a: "Heb je huurders in je huis?" → Nee (only when Gekocht) ──
    const huurders = await waitForStep(page, {
      text: "huurders",
      timeout: 4000,
    });
    if (huurders) {
      await clickFirstVisible(page, 'button:has-text("Nee")', {
        timeout: 3000,
        label: "Nee (huurders)",
      });
      await page.waitForTimeout(2000);
      logger.log("huurders", "clicked 'Nee'");
    } else {
      logger.log("huurders", "step skipped (not visible)");
    }

    // ── Step 8b: "Woon je op kamers?" → Nee (only when Gehuurd) ──
    const kamerbewoner = await waitForStep(page, {
      text: "Woon je op kamers",
      timeout: 4000,
    });
    if (kamerbewoner) {
      await clickFirstVisible(page, 'button:has-text("Nee")', {
        timeout: 3000,
        label: "Nee (kamerbewoner)",
      });
      await page.waitForTimeout(2000);
      logger.log("kamerbewoner", "clicked 'Nee'");
    } else {
      logger.log("kamerbewoner", "step skipped (not visible)");
    }

    // ── Step 9: Geboortedatum ──
    const gbVisible = await waitForStep(page, {
      text: "geboortedatum",
      timeout: 5000,
    });
    if (gbVisible) {
      const gbField = page
        .getByRole("textbox", { name: /geboortedatum/i })
        .first();
      if (await gbField.isVisible({ timeout: 3000 })) {
        await gbField.click();
        await gbField.pressSequentially(input.geboortedatum, { delay: 30 });
        await page.keyboard.press("Tab");
        await page.waitForTimeout(500);
        logger.log("geboortedatum", input.geboortedatum);
      } else {
        // Fallback: try input with placeholder DD-MM
        const gbFallback = page
          .locator('input[placeholder*="DD-MM"], input[name*="geboortedatum"], input[name="date-of-birth"]')
          .first();
        await gbFallback.click();
        await gbFallback.pressSequentially(input.geboortedatum, { delay: 30 });
        await page.keyboard.press("Tab");
        await page.waitForTimeout(500);
        logger.log("geboortedatum", `${input.geboortedatum} (fallback selector)`);
      }

      await clickFirstVisible(page, 'button:has-text("Ga verder")', {
        timeout: 3000,
        label: "Ga verder (geboortedatum)",
      });
      await page.waitForTimeout(2000);
    } else {
      logger.fail("geboortedatum", "step not found");
    }

    // ── Step 10: Aantal personen ──
    const personenVisible = await waitForStep(page, {
      text: "Hoeveel personen",
      timeout: 5000,
    });
    if (personenVisible) {
      // Map gezin input to FBTO button label
      const personenLabel =
        input.gezin === "alleenstaand" ? "1 persoon" : "2 personen";
      await clickFirstVisible(
        page,
        `button:has-text("${personenLabel}")`,
        { timeout: 3000, label: personenLabel },
      );
      await page.waitForTimeout(3000);
      logger.log("aantal-personen", `clicked '${personenLabel}'`);
    } else {
      logger.fail("aantal-personen", "step not found");
    }

    // ── Step 11: Extract premium from results page ──
    await waitForStep(page, {
      text: "inboedelverzekering",
      timeout: 10000,
    });
    await page.waitForTimeout(2000);

    const premie = await extractPrice(page, {
      sectionLabel: "inboedelverzekering",
    });

    await closeBrowser(browser);

    if (premie) {
      logger.log("premie", `€ ${premie.toFixed(2)} per maand`);
      return {
        status: "success",
        premie,
        dekking: "Inboedel",
        eigenRisico: "€ 0",
        duration_ms: Date.now() - start,
        stepLog: logger.getSteps(),
      };
    }

    logger.fail("premie", "niet gevonden op pagina");
    return {
      status: "error",
      error: "Premie niet gevonden op pagina.",
      duration_ms: Date.now() - start,
      stepLog: logger.getSteps(),
    };
  } catch (err) {
    await closeBrowser(browser);
    logger.fail("crash", (err as Error).message);
    return {
      status: "error",
      error: (err as Error).message,
      duration_ms: Date.now() - start,
      stepLog: logger.getSteps(),
    };
  }
}
