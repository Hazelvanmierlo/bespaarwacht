import { BaseScraper, type ScraperInput } from "./base";

export class AsrScraper extends BaseScraper {
  slug = "asr";
  naam = "a.s.r.";

  protected async scrape(input: ScraperInput) {
    const res = await fetch("https://www.asr.nl/api/insurance/contents/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postalCode: input.postcode,
        houseType: this.mapWoningtype(input.woningtype),
        livingArea: input.oppervlakte,
        household: input.gezin === "gezin" ? "family" : "single",
        coverage: this.mapDekking(input.dekking),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`a.s.r. API ${res.status}`);
    const data = await res.json();
    return {
      premie: data.monthlyPremium ?? data.premium?.monthly ?? 0,
      dekking: input.dekking === "all_risk" ? "All Risk" : "Extra Uitgebreid",
      eigenRisico: "€ 0",
    };
  }

  private mapWoningtype(type: string): string {
    return { vrijstaand: "detached", tussenwoning: "terraced", hoekwoning: "semi_detached", appartement: "apartment" }[type] ?? "detached";
  }

  private mapDekking(dekking: string): string {
    return { basis: "basic", uitgebreid: "extended", extra_uitgebreid: "extra_extended", all_risk: "all_risk" }[dekking] ?? "extra_extended";
  }
}
