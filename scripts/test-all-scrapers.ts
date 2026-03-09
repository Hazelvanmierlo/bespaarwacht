/**
 * Test all live Playwright scrapers sequentially.
 * Usage: npx tsx scripts/test-all-scrapers.ts
 */

import { scrapeInShared } from "../src/lib/scrapers/playwright/inshared-live";
import { scrapeCentraalBeheer } from "../src/lib/scrapers/playwright/centraal-beheer-live";
import { scrapeOhra } from "../src/lib/scrapers/playwright/ohra-live";
import { scrapeCentraalBeheerOpstal } from "../src/lib/scrapers/playwright/opstal/centraal-beheer-live";
import { scrapeAsrOpstal } from "../src/lib/scrapers/playwright/opstal/asr-live";
import { scrapeFbtoOpstal } from "../src/lib/scrapers/playwright/opstal/fbto-live";
import { scrapeInterpolisOpstal } from "../src/lib/scrapers/playwright/opstal/interpolis-live";
import { scrapeCentraalBeheerAvp } from "../src/lib/scrapers/playwright/aansprakelijkheid/centraal-beheer-live";
import { scrapeAsrAvp } from "../src/lib/scrapers/playwright/aansprakelijkheid/asr-live";
import { scrapeAllianzDirectAvp } from "../src/lib/scrapers/playwright/aansprakelijkheid/allianz-direct-live";
import { scrapeFbtoAvp } from "../src/lib/scrapers/playwright/aansprakelijkheid/fbto-live";
import { scrapeCentraalBeheerReis } from "../src/lib/scrapers/playwright/reis/centraal-beheer-live";
import { scrapeAsrReis } from "../src/lib/scrapers/playwright/reis/asr-live";
import { scrapeAllianzDirectReis } from "../src/lib/scrapers/playwright/reis/allianz-direct-live";
import { scrapeFbtoReis } from "../src/lib/scrapers/playwright/reis/fbto-live";
import type { LiveScraperInput, LiveScraperResult } from "../src/lib/scrapers/playwright/utils";

const testInput: LiveScraperInput = {
  postcode: "1181EC",
  huisnummer: "10",
  geboortedatum: "15-06-1985",
  gezin: "gezin",
  eigenaar: true,
};

interface ScraperTest {
  name: string;
  product: string;
  fn: (input: LiveScraperInput) => Promise<LiveScraperResult>;
}

const scrapers: ScraperTest[] = [
  // Inboedel
  { name: "InShared", product: "inboedel", fn: scrapeInShared },
  { name: "Centraal Beheer", product: "inboedel", fn: scrapeCentraalBeheer },
  { name: "OHRA", product: "inboedel", fn: scrapeOhra },
  // Opstal
  { name: "Centraal Beheer", product: "opstal", fn: scrapeCentraalBeheerOpstal },
  { name: "a.s.r.", product: "opstal", fn: scrapeAsrOpstal },
  { name: "FBTO", product: "opstal", fn: scrapeFbtoOpstal },
  { name: "Interpolis", product: "opstal", fn: scrapeInterpolisOpstal },
  // Aansprakelijkheid
  { name: "Centraal Beheer", product: "avp", fn: scrapeCentraalBeheerAvp },
  { name: "a.s.r.", product: "avp", fn: scrapeAsrAvp },
  { name: "Allianz Direct", product: "avp", fn: scrapeAllianzDirectAvp },
  { name: "FBTO", product: "avp", fn: scrapeFbtoAvp },
  // Reis
  { name: "Centraal Beheer", product: "reis", fn: scrapeCentraalBeheerReis },
  { name: "a.s.r.", product: "reis", fn: scrapeAsrReis },
  { name: "Allianz Direct", product: "reis", fn: scrapeAllianzDirectReis },
  { name: "FBTO", product: "reis", fn: scrapeFbtoReis },
];

async function main() {
  // Allow running a single scraper by index
  const filterArg = process.argv[2];
  const toTest = filterArg
    ? scrapers.filter((_, i) => String(i) === filterArg || _.name.toLowerCase().includes(filterArg.toLowerCase()) || _.product === filterArg)
    : scrapers;

  console.log(`\n🔄 Testing ${toTest.length} scrapers...\n`);
  console.log("Input:", JSON.stringify(testInput, null, 2), "\n");

  const results: { name: string; product: string; status: string; premie?: number; duration: number; error?: string }[] = [];

  for (const scraper of toTest) {
    const label = `[${scraper.product}] ${scraper.name}`;
    process.stdout.write(`  ${label}... `);

    try {
      const result = await Promise.race([
        scraper.fn(testInput),
        new Promise<LiveScraperResult>((_, reject) =>
          setTimeout(() => reject(new Error("Timeout na 45s")), 45000)
        ),
      ]);

      if (result.status === "success" && result.premie) {
        console.log(`✅ € ${result.premie.toFixed(2)}/mnd (${result.duration_ms}ms)`);
        results.push({ name: scraper.name, product: scraper.product, status: "success", premie: result.premie, duration: result.duration_ms });
      } else {
        console.log(`❌ ${result.error?.slice(0, 80)} (${result.duration_ms}ms)`);
        results.push({ name: scraper.name, product: scraper.product, status: "error", duration: result.duration_ms, error: result.error });
      }
    } catch (err) {
      const msg = (err as Error).message;
      console.log(`❌ ${msg.slice(0, 80)}`);
      results.push({ name: scraper.name, product: scraper.product, status: "crash", duration: 0, error: msg });
    }
  }

  // Summary
  const success = results.filter(r => r.status === "success");
  const failed = results.filter(r => r.status !== "success");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`Resultaat: ${success.length}/${results.length} succesvol\n`);

  if (success.length > 0) {
    console.log("✅ Werkend:");
    for (const r of success) {
      console.log(`   [${r.product}] ${r.name}: € ${r.premie!.toFixed(2)}/mnd`);
    }
  }

  if (failed.length > 0) {
    console.log("\n❌ Niet werkend:");
    for (const r of failed) {
      console.log(`   [${r.product}] ${r.name}: ${r.error?.slice(0, 100)}`);
    }
  }
}

main().catch(console.error);
