import { BaseScraper, type ReisInput, type ScraperInput } from "../base";
import { calculateReisPremium } from "../premium-model";

export class FbtoReisScraper extends BaseScraper {
  slug = "fbto";
  naam = "FBTO";
  productType = "reis" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as ReisInput;
    const premie = calculateReisPremium(7.25, i);
    return {
      premie,
      dekking: i.doorlopend ? "Doorlopend" : "Kortlopend",
      eigenRisico: "€ 0",
    };
  }
}
