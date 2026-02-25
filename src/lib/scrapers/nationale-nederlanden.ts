import { BaseScraper, type ScraperInput } from "./base";

export class NationaleNederlandenScraper extends BaseScraper {
  slug = "nn";
  naam = "Nationale-Nederlanden";

  protected async scrape(input: ScraperInput) {
    // NN uses a public premium calculation API
    const res = await fetch(
      "https://www.nn.nl/api/insurance/contents/premium",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          zipCode: input.postcode,
          propertyType: this.mapWoningtype(input.woningtype),
          surfaceArea: input.oppervlakte,
          household: input.gezin === "gezin" ? "FAMILY" : "SINGLE",
          coverage: this.mapDekking(input.dekking),
        }),
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!res.ok) {
      throw new Error(`NN API ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      premie: data.monthlyPremium ?? data.premium?.monthly ?? 0,
      dekking: input.dekking === "all_risk" ? "All Risk" : "Uitgebreid",
      eigenRisico: "€ 0",
    };
  }

  private mapWoningtype(type: string): string {
    const map: Record<string, string> = {
      vrijstaand: "DETACHED_HOUSE",
      tussenwoning: "ROW_HOUSE",
      hoekwoning: "CORNER_HOUSE",
      appartement: "APARTMENT",
    };
    return map[type] ?? "DETACHED_HOUSE";
  }

  private mapDekking(dekking: string): string {
    const map: Record<string, string> = {
      basis: "BASIC",
      uitgebreid: "EXTENDED",
      extra_uitgebreid: "EXTRA_EXTENDED",
      all_risk: "ALL_RISK",
    };
    return map[dekking] ?? "EXTRA_EXTENDED";
  }
}
