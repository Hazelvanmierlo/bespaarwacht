import { BaseScraper, type ScraperInput } from "./base";

export class OhraScraper extends BaseScraper {
  slug = "ohra";
  naam = "OHRA";

  protected async scrape(input: ScraperInput) {
    const res = await fetch("https://www.ohra.nl/api/insurance/contents/premium", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postalCode: input.postcode,
        houseType: this.mapWoningtype(input.woningtype),
        area: input.oppervlakte,
        familyComposition: input.gezin === "gezin" ? "FAMILY" : "SINGLE",
        coverageLevel: this.mapDekking(input.dekking),
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) throw new Error(`OHRA API ${res.status}`);
    const data = await res.json();
    return {
      premie: data.monthlyPremium ?? data.premium?.monthly ?? 0,
      dekking: "Extra Uitgebreid / All Risk",
      eigenRisico: "€ 250",
    };
  }

  private mapWoningtype(type: string): string {
    return { vrijstaand: "DETACHED", tussenwoning: "TERRACED", hoekwoning: "SEMI_DETACHED", appartement: "APARTMENT" }[type] ?? "DETACHED";
  }

  private mapDekking(dekking: string): string {
    return { basis: "BASIC", uitgebreid: "EXTENDED", extra_uitgebreid: "EXTRA_EXTENDED", all_risk: "ALL_RISK" }[dekking] ?? "EXTRA_EXTENDED";
  }
}
