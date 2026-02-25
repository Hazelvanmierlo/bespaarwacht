import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    locale: "nl-NL",
  });

  await page.goto("https://www.inshared.nl/woonverzekering/inboedelverzekering", {
    waitUntil: "domcontentloaded",
    timeout: 15000,
  });
  await page.waitForTimeout(3000);

  // Cookie weg
  try {
    const btn = page.locator('button[title="Akkoord"], button[data-element="all-button"]').first();
    if (await btn.isVisible({ timeout: 3000 })) { await btn.click(); await page.waitForTimeout(1500); }
  } catch {}

  // Vul postcode + huisnummer
  await page.fill("#postal-code", "1186VH");
  await page.fill("#house-number", "107");
  await page.waitForTimeout(500);

  // Dump alle zichtbare buttons met tekst
  const buttons = await page.locator("button").all();
  console.log("Zichtbare buttons:");
  for (const b of buttons) {
    if (!(await b.isVisible())) continue;
    const text = (await b.innerText()).trim().slice(0, 60);
    const title = await b.getAttribute("title") ?? "";
    console.log(`  button title="${title}" text="${text}"`);
  }

  // Klik "Bereken uw premie"
  console.log("\n→ Klik 'Bereken uw premie'...");
  await page.locator('button[title="Bereken uw premie"]').click();
  await page.waitForTimeout(5000);
  console.log(`→ URL na klik: ${page.url()}`);

  await page.screenshot({ path: "scripts/debug-after-bereken.png", fullPage: true });

  // Nu alle form elementen op deze pagina dumpen
  const allEls = await page.locator("input, select").all();
  console.log(`\n${allEls.length} form elementen op calculator pagina:\n`);
  for (const el of allEls) {
    const tag = await el.evaluate((e) => e.tagName);
    const type = await el.getAttribute("type") ?? "";
    const name = await el.getAttribute("name") ?? "";
    const id = await el.getAttribute("id") ?? "";
    const placeholder = await el.getAttribute("placeholder") ?? "";
    const visible = await el.isVisible();
    if (!visible) continue;
    console.log(`  ${tag} type="${type}" name="${name}" id="${id}" placeholder="${placeholder}"`);
    if (tag === "SELECT") {
      const options = await el.locator("option").all();
      for (const opt of options) {
        const v = await opt.getAttribute("value") ?? "";
        const t = (await opt.innerText()).trim();
        console.log(`    → "${v}" = "${t}"`);
      }
    }
  }

  // Radio buttons
  const radios = await page.locator('input[type="radio"]').all();
  console.log(`\n${radios.length} radio buttons:`);
  for (const r of radios) {
    const name = await r.getAttribute("name") ?? "";
    const value = await r.getAttribute("value") ?? "";
    const id = await r.getAttribute("id") ?? "";
    console.log(`  name="${name}" value="${value}" id="${id}"`);
  }

  // Labels
  const labels = await page.locator("label").all();
  console.log(`\nZichtbare labels:`);
  for (const l of labels) {
    if (!(await l.isVisible())) continue;
    const forA = await l.getAttribute("for") ?? "";
    const text = (await l.innerText()).trim().slice(0, 80);
    console.log(`  for="${forA}" → "${text}"`);
  }

  await browser.close();
}

main().catch(console.error);
