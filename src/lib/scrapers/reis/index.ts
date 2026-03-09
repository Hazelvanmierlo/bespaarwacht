import { BaseScraper } from "../base";
import { CentraalBeheerReisScraper } from "./centraal-beheer";
import { AsrReisScraper } from "./asr";
import { AllianzDirectReisScraper } from "./allianz-direct";
import { FbtoReisScraper } from "./fbto";

const LIVE_SCRAPERS_ENABLED = process.env.ENABLE_LIVE_SCRAPERS === "true";

const calculatedScrapers: BaseScraper[] = [
  new CentraalBeheerReisScraper(),
  new AsrReisScraper(),
  new AllianzDirectReisScraper(),
  new FbtoReisScraper(),
];

function buildScrapers(): BaseScraper[] {
  if (!LIVE_SCRAPERS_ENABLED) return calculatedScrapers;

  try {
    const { LiveReisScraper } = require("../playwright/live-wrapper");
    const { scrapeCentraalBeheerReis } = require("../playwright/reis/centraal-beheer-live");
    const { scrapeAsrReis } = require("../playwright/reis/asr-live");
    const { scrapeAllianzDirectReis } = require("../playwright/reis/allianz-direct-live");
    const { scrapeFbtoReis } = require("../playwright/reis/fbto-live");

    return [
      new LiveReisScraper("centraal-beheer", "Centraal Beheer", 6.80, "€ 0", scrapeCentraalBeheerReis),
      new LiveReisScraper("asr", "a.s.r.", 5.60, "€ 0", scrapeAsrReis),
      new LiveReisScraper("allianz-direct", "Allianz Direct", 4.90, "€ 0", scrapeAllianzDirectReis),
      new LiveReisScraper("fbto", "FBTO", 7.25, "€ 0", scrapeFbtoReis),
    ];
  } catch (err) {
    console.warn("[BespaarWacht] Playwright niet beschikbaar voor reis:", (err as Error).message);
    return calculatedScrapers;
  }
}

export const reisScrapers: BaseScraper[] = buildScrapers();
