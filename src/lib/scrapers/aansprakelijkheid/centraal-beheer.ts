import { BaseScraper, type AansprakelijkheidInput, type ScraperInput } from "../base";
import { calculateAansprakelijkheidPremium } from "../premium-model";

export class CentraalBeheerAvpScraper extends BaseScraper {
  slug = "centraal-beheer";
  naam = "Centraal Beheer";
  productType = "aansprakelijkheid" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as AansprakelijkheidInput;
    const premie = calculateAansprakelijkheidPremium(3.10, i);
    return {
      premie,
      dekking: "Aansprakelijkheid Particulier",
      eigenRisico: "€ 0",
    };
  }
}
