import { BaseScraper, type AansprakelijkheidInput, type ScraperInput } from "../base";
import { calculateAansprakelijkheidPremium } from "../premium-model";

export class FbtoAvpScraper extends BaseScraper {
  slug = "fbto";
  naam = "FBTO";
  productType = "aansprakelijkheid" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as AansprakelijkheidInput;
    const premie = calculateAansprakelijkheidPremium(2.75, i);
    return {
      premie,
      dekking: "Aansprakelijkheid Particulier",
      eigenRisico: "€ 0",
    };
  }
}
