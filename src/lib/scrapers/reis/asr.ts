import { BaseScraper, type ReisInput, type ScraperInput } from "../base";
import { calculateReisPremium } from "../premium-model";

export class AsrReisScraper extends BaseScraper {
  slug = "asr";
  naam = "a.s.r.";
  productType = "reis" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as ReisInput;
    const premie = calculateReisPremium(5.60, i);
    return {
      premie,
      dekking: i.doorlopend ? "Doorlopend" : "Kortlopend",
      eigenRisico: "€ 0",
    };
  }
}
