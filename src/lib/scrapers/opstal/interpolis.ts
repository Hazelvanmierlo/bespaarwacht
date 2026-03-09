import { BaseScraper, type OpstalInput, type ScraperInput } from "../base";
import { calculateOpstalPremium, getDekkingLabel } from "../premium-model";

export class InterpolisOpstalScraper extends BaseScraper {
  slug = "interpolis";
  naam = "Interpolis";
  productType = "opstal" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as OpstalInput;
    const premie = calculateOpstalPremium(13.40, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 0",
    };
  }
}
