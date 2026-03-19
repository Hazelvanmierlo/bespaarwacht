// ── Product types ──
export type ProductType = "inboedel" | "opstal" | "aansprakelijkheid" | "reis";

// ── Per-product input types ──
export interface InboedelInput {
  postcode: string;
  woningtype: "vrijstaand" | "tussenwoning" | "hoekwoning" | "appartement";
  oppervlakte: number;
  gezin: "alleenstaand" | "gezin";
  dekking: "basis" | "uitgebreid" | "extra_uitgebreid" | "all_risk";
  eigenRisico?: number;
  huisnummer?: string;
  geboortedatum?: string;
  eigenaar?: boolean;
}

export interface OpstalInput {
  postcode: string;
  woningtype: "vrijstaand" | "tussenwoning" | "hoekwoning" | "appartement";
  oppervlakte: number;
  bouwjaar: number;
  dekking: "basis" | "uitgebreid" | "extra_uitgebreid" | "all_risk";
  eigenRisico?: number;
  huisnummer?: string;
  geboortedatum?: string;
  eigenaar?: boolean;
}

export interface AansprakelijkheidInput {
  postcode: string;
  gezin: "alleenstaand" | "gezin";
  huisnummer?: string;
  geboortedatum?: string;
}

export interface ReisInput {
  gezin: "alleenstaand" | "paar" | "gezin";
  doorlopend: boolean;
  werelddeel: "europa" | "wereld";
  geboortedatum?: string;
}

export type ScraperInput =
  | InboedelInput
  | OpstalInput
  | AansprakelijkheidInput
  | ReisInput;

export interface ScraperResult {
  slug: string;
  status: "success" | "error" | "timeout";
  premie?: number;
  dekking?: string;
  eigenRisico?: string;
  duration_ms: number;
  error?: string;
  source?: "live" | "calculated";
  stepLog?: string[];
}

export abstract class BaseScraper {
  abstract slug: string;
  abstract naam: string;
  abstract productType: ProductType;

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
