"use client";

import { useState } from "react";

export default function ScrapersPage() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, unknown>[]>([]);
  const [error, setError] = useState("");

  const runScraper = async (slug?: string) => {
    setRunning(true);
    setError("");
    try {
      const url = slug ? `/api/scrape?slug=${slug}` : "/api/scrape";
      const res = await fetch(url, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Scraper mislukt");
      setResults(data.results ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold text-bw-deep mb-1">Scrapers</h1>
          <p className="text-sm text-bw-text-mid">Start scraper runs en bekijk resultaten.</p>
        </div>
        <button
          onClick={() => runScraper()}
          disabled={running}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-bw-green text-white border-none cursor-pointer font-[inherit] hover:bg-bw-green-strong transition-all disabled:opacity-50"
        >
          {running ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Scraping...
            </>
          ) : (
            <>🔄 Alle scrapers starten</>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-bw-red-bg border border-[#FECACA] text-sm text-bw-red font-medium">
          {error}
        </div>
      )}

      {/* Scraper cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {["inshared", "asr", "allianz-direct", "centraal-beheer", "fbto", "zevenwouden", "nn", "interpolis", "ohra", "unive", "ditzo", "aegon"].map(
          (slug) => (
            <div
              key={slug}
              className="bg-white rounded-xl border border-bw-border p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-semibold text-sm text-bw-deep">{slug}</div>
                <div className="text-[11px] text-bw-text-light">Inboedelverzekering</div>
              </div>
              <button
                onClick={() => runScraper(slug)}
                disabled={running}
                className="px-3 py-1.5 rounded-md text-xs font-semibold bg-bw-deep text-white border-none cursor-pointer font-[inherit] hover:bg-bw-navy transition-colors disabled:opacity-50"
              >
                Start
              </button>
            </div>
          )
        )}
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
          <div className="px-5 py-4 border-b border-bw-border">
            <h2 className="text-sm font-bold text-bw-deep">Resultaten laatste run</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bw-bg text-left">
                <th className="px-5 py-2.5 text-xs font-bold text-bw-text-mid uppercase">Verzekeraar</th>
                <th className="px-5 py-2.5 text-xs font-bold text-bw-text-mid uppercase">Premie</th>
                <th className="px-5 py-2.5 text-xs font-bold text-bw-text-mid uppercase">Status</th>
                <th className="px-5 py-2.5 text-xs font-bold text-bw-text-mid uppercase">Duur</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} className="border-t border-bw-border">
                  <td className="px-5 py-3 font-semibold text-bw-deep">{r.slug as string}</td>
                  <td className="px-5 py-3 text-bw-green font-bold">
                    {r.premie ? `€ ${r.premie}/mnd` : "—"}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        r.status === "success"
                          ? "bg-bw-green-bg text-bw-green"
                          : "bg-bw-red-bg text-bw-red"
                      }`}
                    >
                      {r.status as string}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-bw-text-light">{r.duration_ms ? `${r.duration_ms}ms` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
