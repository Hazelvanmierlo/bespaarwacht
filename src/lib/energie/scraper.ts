import { SupabaseClient } from "@supabase/supabase-js";

interface ScrapedTarief {
  type: string;
  normaal: number;
  dal: number;
  gas: number;
  vastrecht_stroom: number;
  vastrecht_gas: number;
}

interface ScrapeResult {
  success: boolean;
  methode: "html" | "json-fallback";
  tarieven: ScrapedTarief[];
  error?: string;
  responseCode?: number;
  redirectUrl?: string;
  durationMs: number;
}

/**
 * Scrapes a leverancier's modelcontract page for tariffs.
 * Falls back to provided JSON data if scraping fails.
 */
export async function scrapeLeverancier(
  naam: string,
  url: string,
  fallbackContracten: ScrapedTarief[],
): Promise<ScrapeResult> {
  const start = Date.now();

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "nl-NL,nl;q=0.9,en;q=0.8",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeout);

    const finalUrl = response.url;
    const redirectUrl = finalUrl !== url ? finalUrl : undefined;
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return {
        success: false,
        methode: "json-fallback",
        tarieven: fallbackContracten,
        error: `HTTP ${response.status}`,
        responseCode: response.status,
        redirectUrl,
        durationMs: Date.now() - start,
      };
    }

    // Only parse HTML pages
    if (!contentType.includes("text/html")) {
      return {
        success: false,
        methode: "json-fallback",
        tarieven: fallbackContracten,
        error: `Unexpected content-type: ${contentType}`,
        responseCode: response.status,
        redirectUrl,
        durationMs: Date.now() - start,
      };
    }

    const html = await response.text();

    if (html.length < 500) {
      return {
        success: false,
        methode: "json-fallback",
        tarieven: fallbackContracten,
        error: "Page too short (< 500 chars)",
        responseCode: response.status,
        redirectUrl,
        durationMs: Date.now() - start,
      };
    }

    // Try Claude extraction
    if (!process.env.ANTHROPIC_API_KEY) {
      return {
        success: false,
        methode: "json-fallback",
        tarieven: fallbackContracten,
        error: "No ANTHROPIC_API_KEY configured",
        responseCode: response.status,
        redirectUrl,
        durationMs: Date.now() - start,
      };
    }

    const truncated = html.slice(0, 12000);
    const claudeResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: `Extract energy tariffs from this Dutch energy provider page (${naam}). Return ONLY a valid JSON array.

Each element: {"type":"Variabel|1jaar|3jaar|Dynamisch","normaal":0.25,"dal":0.22,"gas":0.91,"vastrecht_stroom":5.50,"vastrecht_gas":5.50}

- normaal/dal = leveringstarief in €/kWh (excl. belastingen)
- gas = leveringstarief in €/m³ (excl. belastingen)
- vastrecht = €/maand per meter
- If you cannot find tariffs, return []

HTML:
${truncated}`,
        }],
      }),
    });

    if (!claudeResponse.ok) {
      return {
        success: false,
        methode: "json-fallback",
        tarieven: fallbackContracten,
        error: `Claude API error: ${claudeResponse.status}`,
        responseCode: response.status,
        redirectUrl,
        durationMs: Date.now() - start,
      };
    }

    const claudeData = await claudeResponse.json();
    const text = claudeData?.content?.[0]?.text || "";
    const match = text.match(/\[[\s\S]*\]/);

    if (!match) {
      return {
        success: false,
        methode: "json-fallback",
        tarieven: fallbackContracten,
        error: "Claude could not extract tariffs from page",
        responseCode: response.status,
        redirectUrl,
        durationMs: Date.now() - start,
      };
    }

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].normaal) {
      return {
        success: false,
        methode: "json-fallback",
        tarieven: fallbackContracten,
        error: "Claude returned empty or invalid tariff data",
        responseCode: response.status,
        redirectUrl,
        durationMs: Date.now() - start,
      };
    }

    return {
      success: true,
      methode: "html",
      tarieven: parsed,
      responseCode: response.status,
      redirectUrl,
      durationMs: Date.now() - start,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const isTimeout = message.includes("abort");

    return {
      success: false,
      methode: "json-fallback",
      tarieven: fallbackContracten,
      error: isTimeout ? "Request timeout (10s)" : message,
      durationMs: Date.now() - start,
    };
  }
}

/**
 * Logs a scrape result to the energie_scraper_logs table.
 */
export async function logScrapeResult(
  supabase: SupabaseClient,
  naam: string,
  result: ScrapeResult,
) {
  const status = result.success
    ? "success"
    : result.error?.includes("timeout") || result.error?.includes("abort")
      ? "timeout"
      : result.error?.includes("blocked") || result.responseCode === 403
        ? "blocked"
        : result.redirectUrl
          ? "redirect"
          : "error";

  const bestTarief = result.tarieven[0];

  await supabase.from("energie_scraper_logs").insert({
    leverancier: naam,
    scrape_methode: result.methode,
    status,
    url_gebruikt: null, // we don't log URLs for privacy
    url_redirect: result.redirectUrl || null,
    tarieven_gevonden: result.success && result.tarieven.length > 0,
    tarief_stroom: bestTarief?.normaal || null,
    tarief_gas: bestTarief?.gas || null,
    error_message: result.error || null,
    response_code: result.responseCode || null,
    duration_ms: result.durationMs,
  });
}
