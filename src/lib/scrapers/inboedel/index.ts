import { BaseScraper } from "../base";
import { AsrScraper } from "./asr";
import { CentraalBeheerScraper } from "./centraal-beheer";
import { FbtoScraper } from "./fbto";
import { InSharedScraper } from "./inshared";
import { InterpolisScraper } from "./interpolis";
import { OhraScraper } from "./ohra";

const LIVE_SCRAPERS_ENABLED = process.env.ENABLE_LIVE_SCRAPERS === "true";

const calculatedScrapers: BaseScraper[] = [
  new AsrScraper(),
  new CentraalBeheerScraper(),
  new FbtoScraper(),
  new InSharedScraper(),
  new InterpolisScraper(),
  new OhraScraper(),
];

function buildScrapers(): BaseScraper[] {
  if (!LIVE_SCRAPERS_ENABLED) return calculatedScrapers;

  try {
    const { LiveInboedelScraper } = require("../playwright/live-wrapper");
    const { scrapeAsrInboedel } = require("../playwright/inboedel/asr-live");
    const { scrapeCentraalBeheer } = require("../playwright/centraal-beheer-live");
    const { scrapeFbtoInboedel } = require("../playwright/inboedel/fbto-live");
    // Interpolis live scraper disabled: interpolis.nl has no on-site premium calculator.
    // The "Bereken je premie" CTA redirects to rabobank.nl, making live scraping infeasible.
    // Interpolis still works via the calculated scraper (InterpolisScraper).
    const { scrapeInShared } = require("../playwright/inshared-live");
    const { scrapeOhra } = require("../playwright/ohra-live");

    return [
      new LiveInboedelScraper("asr", "a.s.r.", 8.42, "€ 0", scrapeAsrInboedel),
      new LiveInboedelScraper("centraal-beheer", "Centraal Beheer", 11.85, "€ 0", scrapeCentraalBeheer),
      new LiveInboedelScraper("fbto", "FBTO", 12.10, "€ 0", scrapeFbtoInboedel),
      new LiveInboedelScraper("inshared", "InShared", 9.50, "€ 0", scrapeInShared),
      new LiveInboedelScraper("ohra", "OHRA", 10.20, "€ 0", scrapeOhra),
      // Interpolis uses calculated scraper only (see comment above)
      new InterpolisScraper(),
    ];
  } catch (err) {
    console.warn("[DVA] Playwright niet beschikbaar, fallback naar berekende premies:", (err as Error).message);
    return calculatedScrapers;
  }
}

export const inboedelScrapers: BaseScraper[] = buildScrapers();
