import { BaseScraper, type InboedelInput, type ScraperInput } from "../base";
import { calculateInboedelPremium, getDekkingLabel } from "../premium-model";

export class ZevenwoudenScraper extends BaseScraper {
  slug = "zevenwouden";
  naam = "Zevenwouden";
  productType = "inboedel" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as InboedelInput;
    const premie = calculateInboedelPremium(12.74, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 0",
    };
  }
}
