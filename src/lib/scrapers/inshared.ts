import { BaseScraper, type ScraperInput } from "./base";

export class InSharedScraper extends BaseScraper {
  slug = "inshared";
  naam = "InShared";

  protected async scrape(input: ScraperInput) {
    // InShared premium calculation API
    // Uses their public calculator endpoint to get real-time premiums
    const res = await fetch("https://www.inshared.nl/api/premium/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product: "home_contents",
        zipcode: input.postcode,
        house_type: this.mapWoningtype(input.woningtype),
        surface: input.oppervlakte,
        coverage: this.mapDekking(input.dekking),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      throw new Error(`InShared API ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    return {
      premie: data.monthly_premium ?? data.premium?.monthly ?? 0,
      dekking: input.dekking === "all_risk" ? "All Risk" : "Extra Uitgebreid",
      eigenRisico: "€ 0",
    };
  }

  private mapWoningtype(type: string): string {
    const map: Record<string, string> = {
      vrijstaand: "detached",
      tussenwoning: "terraced",
      hoekwoning: "corner",
      appartement: "apartment",
    };
    return map[type] ?? "detached";
  }

  private mapDekking(dekking: string): string {
    const map: Record<string, string> = {
      basis: "basic",
      uitgebreid: "extended",
      extra_uitgebreid: "extra_extended",
      all_risk: "all_risk",
    };
    return map[dekking] ?? "extra_extended";
  }
}
