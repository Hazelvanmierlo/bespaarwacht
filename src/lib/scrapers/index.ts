import { BaseScraper } from "./base";
import { InSharedScraper } from "./inshared";
import { AsrScraper } from "./asr";
import { AllianzDirectScraper } from "./allianz-direct";
import { CentraalBeheerScraper } from "./centraal-beheer";
import { FbtoScraper } from "./fbto";
import { ZevenwoudenScraper } from "./zevenwouden";
import { OhraScraper } from "./ohra";
import { InterpolisScraper } from "./interpolis";
import { NationaleNederlandenScraper } from "./nationale-nederlanden";
import { UniveScraper } from "./unive";
import { DitzoScraper } from "./ditzo";
import { AegonScraper } from "./aegon";

export type { ScraperInput, ScraperResult } from "./base";

/** All 12 registered scrapers */
export const scrapers: BaseScraper[] = [
  new InSharedScraper(),
  new AsrScraper(),
  new AllianzDirectScraper(),
  new CentraalBeheerScraper(),
  new FbtoScraper(),
  new ZevenwoudenScraper(),
  new OhraScraper(),
  new InterpolisScraper(),
  new NationaleNederlandenScraper(),
  new UniveScraper(),
  new DitzoScraper(),
  new AegonScraper(),
];

/** Get scraper by slug */
export function getScraper(slug: string): BaseScraper | undefined {
  return scrapers.find((s) => s.slug === slug);
}
