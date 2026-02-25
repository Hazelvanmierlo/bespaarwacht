import { BaseScraper, type ScraperInput } from "./base";

export class AegonScraper extends BaseScraper {
  slug = "aegon";
  naam = "Aegon";

  protected async scrape(input: ScraperInput) {
    const res = await fetch("https://www.aegon.nl/api/particulier/insurance/contents/premium", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postalCode: input.postcode,
        houseType: this.mapWoningtype(input.woningtype),
        livingArea: input.oppervlakte,
        household: input.gezin === "gezin" ? "FAMILY" : "SINGLE",
        coverageLevel: this.mapDekking(input.dekking),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Aegon API ${res.status}`);
    const data = await res.json();
    return {
      premie: data.monthlyPremium ?? data.premium?.monthly ?? 0,
      dekking: input.dekking === "all_risk" ? "All Risk" : "Extra Uitgebreid",
      eigenRisico: "€ 0",
    };
  }

  private mapWoningtype(type: string): string {
    return { vrijstaand: "DETACHED", tussenwoning: "TERRACED", hoekwoning: "SEMI_DETACHED", appartement: "APARTMENT" }[type] ?? "DETACHED";
  }

  private mapDekking(dekking: string): string {
    return { basis: "BASIC", uitgebreid: "EXTENDED", extra_uitgebreid: "EXTRA_EXTENDED", all_risk: "ALL_RISK" }[dekking] ?? "EXTRA_EXTENDED";
  }
}
