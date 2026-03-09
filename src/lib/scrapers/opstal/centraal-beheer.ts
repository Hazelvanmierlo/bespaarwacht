import { BaseScraper, type OpstalInput, type ScraperInput } from "../base";
import { calculateOpstalPremium, getDekkingLabel } from "../premium-model";

export class CentraalBeheerOpstalScraper extends BaseScraper {
  slug = "centraal-beheer";
  naam = "Centraal Beheer";
  productType = "opstal" as const;

  protected async scrape(input: ScraperInput) {
    const i = input as OpstalInput;
    const premie = calculateOpstalPremium(11.20, i);
    return {
      premie,
      dekking: getDekkingLabel(i.dekking),
      eigenRisico: "€ 0",
    };
  }
}
