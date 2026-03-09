import { BaseScraper, type InboedelInput, type ScraperInput } from "../base";
import { calculateInboedelPremium, getDekkingLabel } from "../premium-model";

export class OhraScraper extends BaseScraper {
  slug = "ohra";
  naam = "OHRA";
  productType = "inboedel" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as InboedelInput;
    const premie = calculateInboedelPremium(14.20, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 250",
    };
  }
}
