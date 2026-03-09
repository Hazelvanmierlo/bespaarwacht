import { BaseScraper, type ReisInput, type ScraperInput } from "../base";
import { calculateReisPremium } from "../premium-model";

export class AllianzDirectReisScraper extends BaseScraper {
  slug = "allianz-direct";
  naam = "Allianz Direct";
  productType = "reis" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as ReisInput;
    const premie = calculateReisPremium(4.90, i);
    return {
      premie,
      dekking: i.doorlopend ? "Doorlopend" : "Kortlopend",
      eigenRisico: "€ 0",
    };
  }
}
