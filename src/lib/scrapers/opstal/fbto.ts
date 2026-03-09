import { BaseScraper, type OpstalInput, type ScraperInput } from "../base";
import { calculateOpstalPremium, getDekkingLabel } from "../premium-model";

export class FbtoOpstalScraper extends BaseScraper {
  slug = "fbto";
  naam = "FBTO";
  productType = "opstal" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as OpstalInput;
    const premie = calculateOpstalPremium(12.30, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 0",
    };
  }
}
