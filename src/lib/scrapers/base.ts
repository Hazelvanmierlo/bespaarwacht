export interface ScraperInput {
  postcode: string;
  woningtype: "vrijstaand" | "tussenwoning" | "hoekwoning" | "appartement";
  oppervlakte: number;
  gezin: "alleenstaand" | "gezin";
  dekking: "basis" | "uitgebreid" | "extra_uitgebreid" | "all_risk";
}

export interface ScraperResult {
  slug: string;
  status: "success" | "error" | "timeout";
  premie?: number;
  dekking?: string;
  eigenRisico?: string;
  duration_ms: number;
  error?: string;
}

export abstract class BaseScraper {
  abstract slug: string;
  abstract naam: string;

  async run(input: ScraperInput): Promise<ScraperResult> {
    const start = Date.now();
    try {
      const premie = await this.scrape(input);
      return {
        slug: this.slug,
        status: "success",
        premie: premie.premie,
        dekking: premie.dekking,
        eigenRisico: premie.eigenRisico,
        duration_ms: Date.now() - start,
      };
    } catch (err) {
      return {
        slug: this.slug,
        status: "error",
        duration_ms: Date.now() - start,
        error: (err as Error).message,
      };
    }
  }

  protected abstract scrape(input: ScraperInput): Promise<{
    premie: number;
    dekking: string;
    eigenRisico: string;
  }>;
}
