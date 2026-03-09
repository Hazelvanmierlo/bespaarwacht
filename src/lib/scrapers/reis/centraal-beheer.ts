import { BaseScraper, type ReisInput, type ScraperInput } from "../base";
import { calculateReisPremium } from "../premium-model";

export class CentraalBeheerReisScraper extends BaseScraper {
  slug = "centraal-beheer";
  naam = "Centraal Beheer";
  productType = "reis" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as ReisInput;
    const premie = calculateReisPremium(6.80, i);
    return {
      premie,
      dekking: i.doorlopend ? "Doorlopend" : "Kortlopend",
      eigenRisico: "€ 0",
    };
  }
}
