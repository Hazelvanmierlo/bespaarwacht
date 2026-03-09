import { BaseScraper, type InboedelInput, type ScraperInput } from "../base";
import { calculateInboedelPremium, getDekkingLabel } from "../premium-model";

export class AllianzDirectScraper extends BaseScraper {
  slug = "allianz-direct";
  naam = "Allianz Direct";
  productType = "inboedel" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as InboedelInput;
    const premie = calculateInboedelPremium(9.30, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 0",
    };
  }
}
