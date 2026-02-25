import { BaseScraper, type ScraperInput } from "./base";

export class ZevenwoudenScraper extends BaseScraper {
  slug = "zevenwouden";
  naam = "Zevenwouden";

  protected async scrape(input: ScraperInput) {
    const res = await fetch("https://www.zfriesland.nl/api/verzekering/inboedel/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postcode: input.postcode,
        woningtype: input.woningtype,
        oppervlakte: input.oppervlakte,
        gezinssamenstelling: input.gezin,
        dekking: input.dekking,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Zevenwouden API ${res.status}`);
    const data = await res.json();
    return {
      premie: data.premie_maand ?? data.monthlyPremium ?? 0,
      dekking: "All Risk",
      eigenRisico: "€ 0",
    };
  }
}
