import { BaseScraper, type AansprakelijkheidInput, type ScraperInput } from "../base";
import { calculateAansprakelijkheidPremium } from "../premium-model";

export class AllianzDirectAvpScraper extends BaseScraper {
  slug = "allianz-direct";
  naam = "Allianz Direct";
  productType = "aansprakelijkheid" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as AansprakelijkheidInput;
    const premie = calculateAansprakelijkheidPremium(2.15, i);
    return {
      premie,
      dekking: "Aansprakelijkheid Particulier",
      eigenRisico: "€ 0",
    };
  }
}
