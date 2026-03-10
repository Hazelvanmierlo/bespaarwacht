"use client";

import { useState } from "react";
import type { BerekeningResultaat } from "@/lib/energie/leveranciers";
import CountUp from "./CountUp";

type FilterType = "alles" | "vast" | "variabel" | "dynamisch" | "groen";

interface VergelijkingProps {
  resultaten: BerekeningResultaat[];
  huidigeLeverancier: string | null;
  affiliateUrls?: Record<string, string>;
}

const filterTabs: { key: FilterType; label: string }[] = [
  { key: "alles", label: "Alles" },
  { key: "vast", label: "Vast" },
  { key: "variabel", label: "Variabel" },
  { key: "dynamisch", label: "Dynamisch" },
  { key: "groen", label: "Groen" },
];

export default function Vergelijking({ resultaten, huidigeLeverancier, affiliateUrls }: VergelijkingProps) {
  const [filter, setFilter] = useState<FilterType>("alles");
  const [showDoorlopend, setShowDoorlopend] = useState(false);

  const heeftGas = resultaten.some((r) => r.kostenGas != null);
  const heeftKorting = resultaten.some((r) => r.korting > 0);

  const gefilterd = resultaten
    .filter((r) => {
      if (filter === "alles") return true;
      if (filter === "groen") return r.leverancier.groen;
      return r.leverancier.type === filter;
    })
    .sort((a, b) => {
      const aVal = showDoorlopend ? a.totaalDoorlopend : a.totaalJaar;
      const bVal = showDoorlopend ? b.totaalDoorlopend : b.totaalJaar;
      return aVal - bVal;
    });

  const goedkoopste = gefilterd.length > 0
    ? (showDoorlopend ? gefilterd[0].totaalDoorlopend : gefilterd[0].totaalJaar)
    : 0;

  return (
    <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] overflow-hidden">
      <div className="px-5 py-4 border-b border-bw-border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading text-lg font-bold text-bw-deep">Vergelijking leveranciers</h3>
            <p className="text-xs text-bw-text-mid">Jaarkosten incl. energiebelasting, ODE en BTW</p>
          </div>
          {/* Year-1 / Doorlopend toggle */}
          {heeftKorting && (
            <div className="flex items-center gap-1 bg-bw-bg rounded-lg p-0.5">
              <button
                onClick={() => setShowDoorlopend(false)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border-none cursor-pointer transition-all ${
                  !showDoorlopend ? "bg-white text-bw-deep shadow-sm" : "text-bw-text-mid bg-transparent"
                }`}
              >
                Jaar 1
              </button>
              <button
                onClick={() => setShowDoorlopend(true)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border-none cursor-pointer transition-all ${
                  showDoorlopend ? "bg-white text-bw-deep shadow-sm" : "text-bw-text-mid bg-transparent"
                }`}
              >
                Doorlopend
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-5 pt-4 pb-2 flex gap-1.5 flex-wrap">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer transition-all ${
              filter === tab.key
                ? "bg-bw-green text-white"
                : "bg-bw-bg text-bw-text-mid hover:text-bw-blue hover:bg-bw-blue-light"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="bg-bw-bg">
              <th className="px-5 py-3 text-left font-semibold text-bw-text-mid border-b border-bw-border">Leverancier</th>
              <th className="px-3 py-3 text-right font-semibold text-bw-text-mid border-b border-bw-border">Stroom</th>
              {heeftGas && <th className="px-3 py-3 text-right font-semibold text-bw-text-mid border-b border-bw-border">Gas</th>}
              <th className="px-3 py-3 text-right font-semibold text-bw-text-mid border-b border-bw-border">Vastrecht</th>
              {!showDoorlopend && heeftKorting && (
                <th className="px-3 py-3 text-right font-semibold text-bw-text-mid border-b border-bw-border">Bonus</th>
              )}
              <th className="px-5 py-3 text-right font-bold text-bw-deep border-b border-bw-border">
                {showDoorlopend ? "Totaal/jr" : "Jaar 1"}
              </th>
              <th className="px-3 py-3 text-center font-semibold text-bw-text-mid border-b border-bw-border"></th>
            </tr>
          </thead>
          <tbody>
            {gefilterd.map((r, i) => {
              const isHuidig = huidigeLeverancier != null &&
                r.leverancier.naam.toLowerCase().includes(huidigeLeverancier.toLowerCase());
              const totaal = showDoorlopend ? r.totaalDoorlopend : r.totaalJaar;
              const isGoedkoopst = totaal === goedkoopste && i === 0;
              const leverancierNaam = r.leverancier.naam.split(" — ")[0]; // base name for affiliate lookup

              return (
                <tr
                  key={r.leverancier.naam}
                  className={`transition-colors ${
                    isGoedkoopst
                      ? "bg-bw-green-bg"
                      : isHuidig
                        ? "bg-bw-blue-light"
                        : "hover:bg-bw-bg"
                  }`}
                >
                  <td className={`px-5 py-3 border-b border-bw-border ${isGoedkoopst ? "border-l-[3px] border-l-bw-green" : isHuidig ? "border-l-[3px] border-l-bw-blue" : ""}`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-bw-deep">{r.leverancier.naam}</span>
                      {r.leverancier.groen && (
                        <span className="text-[10px] font-bold bg-bw-green-bg text-bw-green-strong px-1.5 py-0.5 rounded">Groen</span>
                      )}
                      {isHuidig && (
                        <span className="text-[10px] font-bold bg-bw-blue-light text-bw-blue px-1.5 py-0.5 rounded">Huidig</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-bw-text-light capitalize">{r.leverancier.type}</span>
                      {r.leverancier.rating > 0 && (
                        <span className="text-[10px] text-bw-text-light">★ {r.leverancier.rating}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right border-b border-bw-border text-bw-text">
                    €{r.kostenElektriciteit}
                  </td>
                  {heeftGas && (
                    <td className="px-3 py-3 text-right border-b border-bw-border text-bw-text">
                      {r.kostenGas != null ? `€${r.kostenGas}` : "—"}
                    </td>
                  )}
                  <td className="px-3 py-3 text-right border-b border-bw-border text-bw-text">
                    €{r.vastrecht}
                  </td>
                  {!showDoorlopend && heeftKorting && (
                    <td className="px-3 py-3 text-right border-b border-bw-border">
                      {r.korting > 0 ? (
                        <span className="text-bw-green font-semibold">-€{r.korting}</span>
                      ) : (
                        <span className="text-bw-text-light">—</span>
                      )}
                    </td>
                  )}
                  <td className={`px-5 py-3 text-right border-b border-bw-border font-bold ${isGoedkoopst ? "text-bw-green-strong" : "text-bw-deep"}`}>
                    {i === 0 ? (
                      <CountUp end={totaal} prefix="€" className="font-bold" />
                    ) : (
                      `€${totaal}`
                    )}
                  </td>
                  <td className="px-3 py-3 border-b border-bw-border text-center">
                    {!isHuidig && (affiliateUrls?.[leverancierNaam] || r.leverancier.affiliateUrl) ? (
                      <a
                        href={affiliateUrls?.[leverancierNaam] || r.leverancier.affiliateUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block px-3 py-1.5 bg-bw-green text-white rounded-lg text-xs font-semibold no-underline hover:bg-bw-green/90 transition-colors"
                      >
                        Overstappen
                      </a>
                    ) : !isHuidig ? (
                      <span className="text-xs text-bw-text-light">-</span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {gefilterd.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-bw-text-mid">
          Geen leveranciers gevonden voor dit filter.
        </div>
      )}

      {/* Tax disclaimer */}
      <div className="px-5 py-3 border-t border-bw-border bg-[#F8FAFC]">
        <p className="text-[11px] text-bw-text-light leading-relaxed">
          Prijzen incl. energiebelasting, ODE en 21% BTW. Vermindering energiebelasting (€642/jr) verrekend.
          Netbeheerkosten (~€744/jr) zijn gelijk voor alle leveranciers en niet meegerekend.
          {!showDoorlopend && heeftKorting && " Jaar-1 prijs incl. welkomstbonus."}
        </p>
      </div>
    </div>
  );
}
