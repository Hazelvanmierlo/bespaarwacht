import { BaseScraper, type InboedelInput, type ScraperInput } from "../base";
import { calculateInboedelPremium, getDekkingLabel } from "../premium-model";

export class DitzoScraper extends BaseScraper {
  slug = "ditzo";
  naam = "Ditzo";
  productType = "inboedel" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as InboedelInput;
    const premie = calculateInboedelPremium(10.50, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 0",
    };
  }
}
