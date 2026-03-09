import { BaseScraper, type OpstalInput, type ScraperInput } from "../base";
import { calculateOpstalPremium, getDekkingLabel } from "../premium-model";

export class AsrOpstalScraper extends BaseScraper {
  slug = "asr";
  naam = "a.s.r.";
  productType = "opstal" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as OpstalInput;
    const premie = calculateOpstalPremium(9.50, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 0",
    };
  }
}
