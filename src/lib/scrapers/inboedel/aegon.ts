import { BaseScraper, type InboedelInput, type ScraperInput } from "../base";
import { calculateInboedelPremium, getDekkingLabel } from "../premium-model";

export class AegonScraper extends BaseScraper {
  slug = "aegon";
  naam = "Aegon";
  productType = "inboedel" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as InboedelInput;
    const premie = calculateInboedelPremium(11.00, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 0",
    };
  }
}
