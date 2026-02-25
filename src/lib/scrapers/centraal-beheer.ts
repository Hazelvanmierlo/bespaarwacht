import { BaseScraper, type ScraperInput } from "./base";

export class CentraalBeheerScraper extends BaseScraper {
  slug = "centraal-beheer";
  naam = "Centraal Beheer";

  protected async scrape(input: ScraperInput) {
    // Centraal Beheer uses a public premium calculation API
    const res = await fetch(
      "https://www.centraalbeheer.nl/api/insurance/home-contents/calculate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postalCode: input.postcode,
          houseType: this.mapWoningtype(input.woningtype),
          livingArea: input.oppervlakte,
          familyComposition: input.gezin === "gezin" ? "family" : "single",
          coverageLevel: this.mapDekking(input.dekking),
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      throw new Error(`Centraal Beheer API ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      premie: data.monthlyPremium ?? data.premium?.monthly ?? 0,
      dekking: input.dekking === "all_risk" ? "All Risk" : "Extra Uitgebreid",
      eigenRisico: "€ 0",
    };
  }

  private mapWoningtype(type: string): string {
    const map: Record<string, string> = {
      vrijstaand: "DETACHED",
      tussenwoning: "TERRACED",
      hoekwoning: "SEMI_DETACHED",
      appartement: "FLAT",
    };
    return map[type] ?? "DETACHED";
  }

  private mapDekking(dekking: string): string {
    const map: Record<string, string> = {
      basis: "BASIC",
      uitgebreid: "EXTENDED",
      extra_uitgebreid: "EXTRA_EXTENDED",
      all_risk: "ALL_RISK",
    };
    return map[dekking] ?? "ALL_RISK";
  }
}
