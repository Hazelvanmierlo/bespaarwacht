/**
 * Quick test: run the fixed OHRA scraper.
 */
import { scrapeOhra } from "../src/lib/scrapers/playwright/ohra-live";

async function main() {
  console.log("Testing OHRA scraper...");
  const result = await scrapeOhra({
    postcode: "3581KJ",
    huisnummer: "5",
    geboortedatum: "15-06-1985",
    eigenaar: true,
  });
  console.log("\nResult:", JSON.stringify(result, null, 2));
}

main().catch(console.error);
