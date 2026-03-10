import { BaseScraper } from "../base";
import { CentraalBeheerAvpScraper } from "./centraal-beheer";
import { AsrAvpScraper } from "./asr";
import { AllianzDirectAvpScraper } from "./allianz-direct";
import { FbtoAvpScraper } from "./fbto";

const LIVE_SCRAPERS_ENABLED = process.env.ENABLE_LIVE_SCRAPERS === "true";

const calculatedScrapers: BaseScraper[] = [
  new CentraalBeheerAvpScraper(),
  new AsrAvpScraper(),
  new AllianzDirectAvpScraper(),
  new FbtoAvpScraper(),
];

function buildScrapers(): BaseScraper[] {
  if (!LIVE_SCRAPERS_ENABLED) return calculatedScrapers;

  try {
    const { LiveAansprakelijkheidScraper } = require("../playwright/live-wrapper");
    const { scrapeCentraalBeheerAvp } = require("../playwright/aansprakelijkheid/centraal-beheer-live");
    const { scrapeAsrAvp } = require("../playwright/aansprakelijkheid/asr-live");
    const { scrapeAllianzDirectAvp } = require("../playwright/aansprakelijkheid/allianz-direct-live");
    const { scrapeFbtoAvp } = require("../playwright/aansprakelijkheid/fbto-live");

    return [
      new LiveAansprakelijkheidScraper("centraal-beheer", "Centraal Beheer", 3.10, "€ 0", scrapeCentraalBeheerAvp),
      new LiveAansprakelijkheidScraper("asr", "a.s.r.", 2.50, "€ 0", scrapeAsrAvp),
      new LiveAansprakelijkheidScraper("allianz-direct", "Allianz Direct", 2.15, "€ 0", scrapeAllianzDirectAvp),
      new LiveAansprakelijkheidScraper("fbto", "FBTO", 2.75, "€ 0", scrapeFbtoAvp),
    ];
  } catch (err) {
    console.warn("[DVA] Playwright niet beschikbaar voor aansprakelijkheid:", (err as Error).message);
    return calculatedScrapers;
  }
}

export const aansprakelijkheidScrapers: BaseScraper[] = buildScrapers();
