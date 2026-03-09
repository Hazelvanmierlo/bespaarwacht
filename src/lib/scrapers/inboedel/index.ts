import { BaseScraper } from "../base";
import { AsrScraper } from "./asr";
import { CentraalBeheerScraper } from "./centraal-beheer";
import { FbtoScraper } from "./fbto";
import { InterpolisScraper } from "./interpolis";

const LIVE_SCRAPERS_ENABLED = process.env.ENABLE_LIVE_SCRAPERS === "true";

const calculatedScrapers: BaseScraper[] = [
  new AsrScraper(),
  new CentraalBeheerScraper(),
  new FbtoScraper(),
  new InterpolisScraper(),
];

function buildScrapers(): BaseScraper[] {
  if (!LIVE_SCRAPERS_ENABLED) return calculatedScrapers;

  try {
    const { LiveInboedelScraper } = require("../playwright/live-wrapper");
    const { scrapeAsrInboedel } = require("../playwright/inboedel/asr-live");
    const { scrapeCentraalBeheer } = require("../playwright/centraal-beheer-live");
    const { scrapeFbtoInboedel } = require("../playwright/inboedel/fbto-live");
    const { scrapeInterpolisInboedel } = require("../playwright/inboedel/interpolis-live");

    return [
      new LiveInboedelScraper("asr", "a.s.r.", 8.42, "€ 0", scrapeAsrInboedel),
      new LiveInboedelScraper("centraal-beheer", "Centraal Beheer", 11.85, "€ 0", scrapeCentraalBeheer),
      new LiveInboedelScraper("fbto", "FBTO", 12.10, "€ 0", scrapeFbtoInboedel),
      new LiveInboedelScraper("interpolis", "Interpolis", 13.40, "€ 0", scrapeInterpolisInboedel),
    ];
  } catch (err) {
    console.warn("[BespaarWacht] Playwright niet beschikbaar, fallback naar berekende premies:", (err as Error).message);
    return calculatedScrapers;
  }
}

export const inboedelScrapers: BaseScraper[] = buildScrapers();
