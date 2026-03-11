import {
  BaseScraper,
  type ScraperInput,
  type ScraperResult,
  type InboedelInput,
  type OpstalInput,
  type AansprakelijkheidInput,
  type ReisInput,
} from "../base";
import {
  calculateInboedelPremium,
  calculateOpstalPremium,
  calculateAansprakelijkheidPremium,
  calculateReisPremium,
  getDekkingLabel,
} from "../premium-model";
import type { LiveScraperInput, LiveScraperResult } from "./utils";

type LiveScraperFn = (input: LiveScraperInput) => Promise<LiveScraperResult>;

// ── Inboedel ──

export class LiveInboedelScraper extends BaseScraper {
  slug: string;
  naam: string;
  productType = "inboedel" as const;

  private basePremie: number;
  private defaultEigenRisico: string;
  private liveScraper: LiveScraperFn;

  constructor(slug: string, naam: string, basePremie: number, defaultEigenRisico: string, liveScraper: LiveScraperFn) {
    super();
    this.slug = slug;
    this.naam = naam;
    this.basePremie = basePremie;
    this.defaultEigenRisico = defaultEigenRisico;
    this.liveScraper = liveScraper;
  }

  async run(input: ScraperInput): Promise<ScraperResult> {
    const start = Date.now();
    const i = input as InboedelInput;

    if (i.huisnummer && i.geboortedatum) {
      try {
        const liveInput: LiveScraperInput = {
          postcode: i.postcode,
          huisnummer: i.huisnummer,
          geboortedatum: i.geboortedatum,
          gezin: i.gezin ?? "alleenstaand",
          eigenaar: i.eigenaar ?? false,
          woningtype: i.woningtype,
        };
        const result = await Promise.race([
          this.liveScraper(liveInput),
          new Promise<LiveScraperResult>((_, reject) =>
            setTimeout(() => reject(new Error("Live scraper timeout (60s)")), 60000)
          ),
        ]);
        if (result.status === "success" && result.premie && result.premie > 0) {
          return {
            slug: this.slug, status: "success",
            premie: result.premie,
            dekking: result.dekking ?? getDekkingLabel(i.dekking),
            eigenRisico: result.eigenRisico ?? this.defaultEigenRisico,
            duration_ms: Date.now() - start, source: "live",
            stepLog: result.stepLog,
          };
        }
        console.warn(`[scraper:${this.slug}] Live returned status="${result.status}" premie=${result.premie ?? "none"}, falling back to calculated`);
      } catch (err) {
        console.warn(`[scraper:${this.slug}] Live scrape failed, falling back to calculated:`, (err as Error).message);
      }
    }

    const premie = calculateInboedelPremium(this.basePremie, i);
    return {
      slug: this.slug, status: "success", premie,
      dekking: getDekkingLabel(i.dekking), eigenRisico: this.defaultEigenRisico,
      duration_ms: Date.now() - start, source: "calculated",
    };
  }

  protected async scrape(input: ScraperInput) {
    const i = input as InboedelInput;
    return { premie: calculateInboedelPremium(this.basePremie, i), dekking: getDekkingLabel(i.dekking), eigenRisico: this.defaultEigenRisico };
  }
}

// ── Opstal ──

export class LiveOpstalScraper extends BaseScraper {
  slug: string;
  naam: string;
  productType = "opstal" as const;

  private basePremie: number;
  private defaultEigenRisico: string;
  private liveScraper: LiveScraperFn;

  constructor(slug: string, naam: string, basePremie: number, defaultEigenRisico: string, liveScraper: LiveScraperFn) {
    super();
    this.slug = slug;
    this.naam = naam;
    this.basePremie = basePremie;
    this.defaultEigenRisico = defaultEigenRisico;
    this.liveScraper = liveScraper;
  }

  async run(input: ScraperInput): Promise<ScraperResult> {
    const start = Date.now();
    const i = input as OpstalInput;

    if (i.huisnummer && i.geboortedatum) {
      try {
        const liveInput: LiveScraperInput = {
          postcode: i.postcode,
          huisnummer: i.huisnummer,
          geboortedatum: i.geboortedatum,
          gezin: "alleenstaand",
          eigenaar: i.eigenaar ?? false,
          woningtype: i.woningtype,
        };
        const result = await Promise.race([
          this.liveScraper(liveInput),
          new Promise<LiveScraperResult>((_, reject) =>
            setTimeout(() => reject(new Error("Live scraper timeout (60s)")), 60000)
          ),
        ]);
        if (result.status === "success" && result.premie && result.premie > 0) {
          return {
            slug: this.slug, status: "success",
            premie: result.premie,
            dekking: result.dekking ?? getDekkingLabel(i.dekking),
            eigenRisico: result.eigenRisico ?? this.defaultEigenRisico,
            duration_ms: Date.now() - start, source: "live",
            stepLog: result.stepLog,
          };
        }
        console.warn(`[scraper:${this.slug}] Live returned status="${result.status}" premie=${result.premie ?? "none"}, falling back to calculated`);
      } catch (err) {
        console.warn(`[scraper:${this.slug}] Live scrape failed, falling back to calculated:`, (err as Error).message);
      }
    }

    const premie = calculateOpstalPremium(this.basePremie, i);
    return {
      slug: this.slug, status: "success", premie,
      dekking: getDekkingLabel(i.dekking), eigenRisico: this.defaultEigenRisico,
      duration_ms: Date.now() - start, source: "calculated",
    };
  }

  protected async scrape(input: ScraperInput) {
    const i = input as OpstalInput;
    return { premie: calculateOpstalPremium(this.basePremie, i), dekking: getDekkingLabel(i.dekking), eigenRisico: this.defaultEigenRisico };
  }
}

// ── Aansprakelijkheid ──

export class LiveAansprakelijkheidScraper extends BaseScraper {
  slug: string;
  naam: string;
  productType = "aansprakelijkheid" as const;

  private basePremie: number;
  private defaultEigenRisico: string;
  private liveScraper: LiveScraperFn;

  constructor(slug: string, naam: string, basePremie: number, defaultEigenRisico: string, liveScraper: LiveScraperFn) {
    super();
    this.slug = slug;
    this.naam = naam;
    this.basePremie = basePremie;
    this.defaultEigenRisico = defaultEigenRisico;
    this.liveScraper = liveScraper;
  }

  async run(input: ScraperInput): Promise<ScraperResult> {
    const start = Date.now();
    const i = input as AansprakelijkheidInput;

    // AVP scrapers need at least geboortedatum for live
    if (i.geboortedatum) {
      try {
        const liveInput: LiveScraperInput = {
          postcode: i.postcode,
          huisnummer: i.huisnummer ?? "",
          geboortedatum: i.geboortedatum,
          gezin: i.gezin ?? "alleenstaand",
        };
        const result = await Promise.race([
          this.liveScraper(liveInput),
          new Promise<LiveScraperResult>((_, reject) =>
            setTimeout(() => reject(new Error("Live scraper timeout (60s)")), 60000)
          ),
        ]);
        if (result.status === "success" && result.premie && result.premie > 0) {
          return {
            slug: this.slug, status: "success",
            premie: result.premie,
            dekking: result.dekking ?? "Aansprakelijkheid Particulier",
            eigenRisico: result.eigenRisico ?? this.defaultEigenRisico,
            duration_ms: Date.now() - start, source: "live",
            stepLog: result.stepLog,
          };
        }
        console.warn(`[scraper:${this.slug}] Live returned status="${result.status}" premie=${result.premie ?? "none"}, falling back to calculated`);
      } catch (err) {
        console.warn(`[scraper:${this.slug}] Live scrape failed, falling back to calculated:`, (err as Error).message);
      }
    }

    const premie = calculateAansprakelijkheidPremium(this.basePremie, i);
    return {
      slug: this.slug, status: "success", premie,
      dekking: "Aansprakelijkheid Particulier", eigenRisico: this.defaultEigenRisico,
      duration_ms: Date.now() - start, source: "calculated",
    };
  }

  protected async scrape(input: ScraperInput) {
    const i = input as AansprakelijkheidInput;
    return { premie: calculateAansprakelijkheidPremium(this.basePremie, i), dekking: "Aansprakelijkheid Particulier", eigenRisico: this.defaultEigenRisico };
  }
}

// ── Reis ──

export class LiveReisScraper extends BaseScraper {
  slug: string;
  naam: string;
  productType = "reis" as const;

  private basePremie: number;
  private defaultEigenRisico: string;
  private liveScraper: LiveScraperFn;

  constructor(slug: string, naam: string, basePremie: number, defaultEigenRisico: string, liveScraper: LiveScraperFn) {
    super();
    this.slug = slug;
    this.naam = naam;
    this.basePremie = basePremie;
    this.defaultEigenRisico = defaultEigenRisico;
    this.liveScraper = liveScraper;
  }

  async run(input: ScraperInput): Promise<ScraperResult> {
    const start = Date.now();
    const i = input as ReisInput;

    // Reis scrapers need geboortedatum for live
    if (i.geboortedatum) {
      try {
        const liveInput: LiveScraperInput = {
          postcode: "",
          huisnummer: "",
          geboortedatum: i.geboortedatum,
          gezin: i.gezin ?? "alleenstaand",
        };
        const result = await Promise.race([
          this.liveScraper(liveInput),
          new Promise<LiveScraperResult>((_, reject) =>
            setTimeout(() => reject(new Error("Live scraper timeout (60s)")), 60000)
          ),
        ]);
        if (result.status === "success" && result.premie && result.premie > 0) {
          return {
            slug: this.slug, status: "success",
            premie: result.premie,
            dekking: result.dekking ?? (i.doorlopend ? "Doorlopend" : "Kortlopend"),
            eigenRisico: result.eigenRisico ?? this.defaultEigenRisico,
            duration_ms: Date.now() - start, source: "live",
            stepLog: result.stepLog,
          };
        }
        console.warn(`[scraper:${this.slug}] Live returned status="${result.status}" premie=${result.premie ?? "none"}, falling back to calculated`);
      } catch (err) {
        console.warn(`[scraper:${this.slug}] Live scrape failed, falling back to calculated:`, (err as Error).message);
      }
    }

    const premie = calculateReisPremium(this.basePremie, i);
    return {
      slug: this.slug, status: "success", premie,
      dekking: i.doorlopend ? "Doorlopend" : "Kortlopend", eigenRisico: this.defaultEigenRisico,
      duration_ms: Date.now() - start, source: "calculated",
    };
  }

  protected async scrape(input: ScraperInput) {
    const i = input as ReisInput;
    return { premie: calculateReisPremium(this.basePremie, i), dekking: i.doorlopend ? "Doorlopend" : "Kortlopend", eigenRisico: this.defaultEigenRisico };
  }
}
