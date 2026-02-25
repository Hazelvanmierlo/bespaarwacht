import { BaseScraper, type ScraperInput } from "./base";

export class UniveScraper extends BaseScraper {
  slug = "unive";
  naam = "Univé";

  protected async scrape(input: ScraperInput) {
    const res = await fetch("https://www.unive.nl/api/verzekeringen/inboedel/premie", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postcode: input.postcode,
        woningtype: input.woningtype,
        oppervlakte: input.oppervlakte,
        gezin: input.gezin,
        dekking: input.dekking,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Univé API ${res.status}`);
    const data = await res.json();
    return {
      premie: data.premie_maand ?? data.monthlyPremium ?? 0,
      dekking: input.dekking === "all_risk" ? "All Risk" : "Extra Uitgebreid",
      eigenRisico: "€ 0",
    };
  }
}
