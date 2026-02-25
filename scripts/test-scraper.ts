import { scrapeInShared } from "../src/lib/scrapers/playwright/inshared-live";

async function main() {
  console.log("🔄 InShared live scraper starten...\n");

  // Werkend adres: Graaf Janlaan 10, Amstelveen
  const addresses = [
    { postcode: "1181EC", huisnummer: "10" },  // Amstelveen (werkt!)
    { postcode: "3511LX", huisnummer: "20" },  // Utrecht Centrum
    { postcode: "6211CL", huisnummer: "5" },   // Maastricht
  ];

  for (const addr of addresses) {
    console.log(`\nTest: ${addr.postcode} ${addr.huisnummer}`);
    const result = await scrapeInShared(addr);
    console.log(`  Status: ${result.status}`);
    if (result.status === "success") {
      console.log(`  ✅ Inboedel:           € ${result.premieStandaard?.toFixed(2)}/mnd`);
      console.log(`  ✅ Inboedel + Compleet: € ${result.premieCompleet?.toFixed(2)}/mnd`);
      console.log(`  ✅ Opstal:             € ${result.premieOpstal?.toFixed(2)}/mnd`);
      console.log(`  ✅ Totaal maandbedrag:  € ${result.premieTotaal?.toFixed(2)}/mnd`);
      console.log(`  Duur: ${result.duration_ms}ms`);
      break;
    } else {
      console.log(`  ❌ ${result.error?.slice(0, 150)}`);
      console.log(`  Duur: ${result.duration_ms}ms`);
    }
  }
}

main().catch(console.error);
