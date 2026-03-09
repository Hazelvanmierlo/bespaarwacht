import { BaseScraper, type ProductType } from "./base";
import { inboedelScrapers } from "./inboedel";
import { opstalScrapers } from "./opstal";
import { aansprakelijkheidScrapers } from "./aansprakelijkheid";
import { reisScrapers } from "./reis";

export type { ScraperInput, ScraperResult, ProductType, InboedelInput, OpstalInput, AansprakelijkheidInput, ReisInput } from "./base";

/** All scrapers keyed by product type */
const scrapersByProduct: Record<ProductType, BaseScraper[]> = {
  inboedel: inboedelScrapers,
  opstal: opstalScrapers,
  aansprakelijkheid: aansprakelijkheidScrapers,
  reis: reisScrapers,
};

/** Get scrapers for a specific product type */
export function getScrapers(productType: ProductType): BaseScraper[] {
  return scrapersByProduct[productType] ?? [];
}

/** Backward compat: default inboedel scrapers */
export const scrapers: BaseScraper[] = inboedelScrapers;

/** Get scraper by slug (searches all products) */
export function getScraper(slug: string): BaseScraper | undefined {
  for (const list of Object.values(scrapersByProduct)) {
    const found = list.find((s) => s.slug === slug);
    if (found) return found;
  }
  return undefined;
}
