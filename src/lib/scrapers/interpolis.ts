import { BaseScraper, type ScraperInput } from "./base";

export class InterpolisScraper extends BaseScraper {
  slug = "interpolis";
  naam = "Interpolis";

  protected async scrape(input: ScraperInput) {
    const res = await fetch("https://www.interpolis.nl/api/insurance/contents/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postalCode: input.postcode,
        houseType: this.mapWoningtype(input.woningtype),
        livingArea: input.oppervlakte,
        household: input.gezin === "gezin" ? "FAMILY" : "SINGLE",
        coverage: this.mapDekking(input.dekking),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`Interpolis API ${res.status}`);
    const data = await res.json();
    return {
      premie: data.monthlyPremium ?? data.premium?.monthly ?? 0,
      dekking: "All Risk",
      eigenRisico: "€ 0",
    };
  }

  private mapWoningtype(type: string): string {
    return { vrijstaand: "DETACHED", tussenwoning: "TERRACED", hoekwoning: "CORNER", appartement: "APARTMENT" }[type] ?? "DETACHED";
  }

  private mapDekking(dekking: string): string {
    return { basis: "BASIC", uitgebreid: "EXTENDED", extra_uitgebreid: "EXTRA_EXTENDED", all_risk: "ALL_RISK" }[dekking] ?? "ALL_RISK";
  }
}
