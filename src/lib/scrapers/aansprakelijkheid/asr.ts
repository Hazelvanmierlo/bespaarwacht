import { BaseScraper, type AansprakelijkheidInput, type ScraperInput } from "../base";
import { calculateAansprakelijkheidPremium } from "../premium-model";

export class AsrAvpScraper extends BaseScraper {
  slug = "asr";
  naam = "a.s.r.";
  productType = "aansprakelijkheid" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as AansprakelijkheidInput;
    const premie = calculateAansprakelijkheidPremium(2.50, i);
    return {
      premie,
      dekking: "Aansprakelijkheid Particulier",
      eigenRisico: "€ 0",
    };
  }
}
