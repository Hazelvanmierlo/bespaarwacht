import { scrapeInShared } from "../src/lib/scrapers/playwright/inshared-live";

async function main() {
  console.log("🔄 InShared live scraper starten...\n");

  // Werkend adres: Graaf Janlaan 10, Amstelveen
  const addresses = [
    { postcode: "1181EC", huisnummer: "10", geboortedatum: "15-06-1990", gezin: "alleenstaand" },
    { postcode: "3511LX", huisnummer: "20", geboortedatum: "15-06-1990", gezin: "alleenstaand" },
    { postcode: "6211CL", huisnummer: "5", geboortedatum: "15-06-1990", gezin: "alleenstaand" },
  ];

  for (const addr of addresses) {
    console.log(`\nTest: ${addr.postcode} ${addr.huisnummer}`);
    const result = await scrapeInShared(addr);
    console.log(`  Status: ${result.status}`);
    if (result.status === "success") {
      console.log(`  ✅ Premie: € ${result.premie?.toFixed(2)}/mnd`);
      console.log(`  ✅ Dekking: ${result.dekking}`);
      console.log(`  ✅ Eigen risico: ${result.eigenRisico}`);
      console.log(`  Duur: ${result.duration_ms}ms`);
      break;
    } else {
      console.log(`  ❌ ${result.error?.slice(0, 150)}`);
      console.log(`  Duur: ${result.duration_ms}ms`);
    }
  }
}

main().catch(console.error);
