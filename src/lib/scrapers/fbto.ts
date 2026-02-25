import { BaseScraper, type ScraperInput } from "./base";

export class FbtoScraper extends BaseScraper {
  slug = "fbto";
  naam = "FBTO";

  protected async scrape(input: ScraperInput) {
    const res = await fetch("https://www.fbto.nl/api/insurance/contents/premium", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postalCode: input.postcode,
        houseType: this.mapWoningtype(input.woningtype),
        surface: input.oppervlakte,
        household: input.gezin === "gezin" ? "FAMILY" : "SINGLE",
        coverage: this.mapDekking(input.dekking),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`FBTO API ${res.status}`);
    const data = await res.json();
    return {
      premie: data.monthlyPremium ?? data.premium?.monthly ?? 0,
      dekking: input.dekking === "all_risk" ? "All Risk" : "Extra Uitgebreid",
      eigenRisico: "€ 0",
    };
  }

  private mapWoningtype(type: string): string {
    return { vrijstaand: "DETACHED", tussenwoning: "TERRACED", hoekwoning: "CORNER", appartement: "FLAT" }[type] ?? "DETACHED";
  }

  private mapDekking(dekking: string): string {
    return { basis: "BASIC", uitgebreid: "EXTENDED", extra_uitgebreid: "EXTRA_EXTENDED", all_risk: "ALL_RISK" }[dekking] ?? "ALL_RISK";
  }
}
