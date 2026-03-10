import { BaseScraper } from "../base";
import { CentraalBeheerOpstalScraper } from "./centraal-beheer";
import { AsrOpstalScraper } from "./asr";
import { FbtoOpstalScraper } from "./fbto";
import { InterpolisOpstalScraper } from "./interpolis";

const LIVE_SCRAPERS_ENABLED = process.env.ENABLE_LIVE_SCRAPERS === "true";

const calculatedScrapers: BaseScraper[] = [
  new CentraalBeheerOpstalScraper(),
  new AsrOpstalScraper(),
  new FbtoOpstalScraper(),
  new InterpolisOpstalScraper(),
];

function buildScrapers(): BaseScraper[] {
  if (!LIVE_SCRAPERS_ENABLED) return calculatedScrapers;

  try {
    const { LiveOpstalScraper } = require("../playwright/live-wrapper");
    const { scrapeCentraalBeheerOpstal } = require("../playwright/opstal/centraal-beheer-live");
    const { scrapeAsrOpstal } = require("../playwright/opstal/asr-live");
    const { scrapeFbtoOpstal } = require("../playwright/opstal/fbto-live");
    const { scrapeInterpolisOpstal } = require("../playwright/opstal/interpolis-live");

    return [
      new LiveOpstalScraper("centraal-beheer", "Centraal Beheer", 11.20, "€ 0", scrapeCentraalBeheerOpstal),
      new LiveOpstalScraper("asr", "a.s.r.", 9.50, "€ 0", scrapeAsrOpstal),
      new LiveOpstalScraper("fbto", "FBTO", 12.30, "€ 0", scrapeFbtoOpstal),
      new LiveOpstalScraper("interpolis", "Interpolis", 13.40, "€ 0", scrapeInterpolisOpstal),
    ];
  } catch (err) {
    console.warn("[DVA] Playwright niet beschikbaar voor opstal:", (err as Error).message);
    return calculatedScrapers;
  }
}

export const opstalScrapers: BaseScraper[] = buildScrapers();
