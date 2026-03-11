/**
 * Interpolis Inboedel Live Scraper — DISABLED
 *
 * Interpolis does not have an on-site premium calculator for inboedelverzekering.
 * The "Bereken je premie" CTA on https://www.interpolis.nl/verzekeren/inboedelverzekering
 * redirects to Rabobank:
 *   https://www.rabobank.nl/particulieren/verzekering/inboedelverzekering/
 *
 * Scraping Rabobank's calculator would require a completely different scraper flow
 * and is out of scope. Interpolis premiums are served via the calculated scraper
 * (InterpolisScraper) instead.
 *
 * Investigated: 2026-03-11
 */

import type { LiveScraperInput, LiveScraperResult } from "../utils";

export async function scrapeInterpolisInboedel(
  _input: LiveScraperInput,
): Promise<LiveScraperResult> {
  return {
    status: "error",
    error:
      "Interpolis live scraper disabled: interpolis.nl redirects to rabobank.nl for premium calculation. Using calculated scraper instead.",
    duration_ms: 0,
  };
}
