"use client";

import { useState } from "react";
import { CircleCheckBig, AlertTriangle } from "@/components/icons";
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

  // Find current supplier cost for savings calculation
  const huidigResult = huidigeLeverancier
    ? resultaten.find((r) => r.leverancier.naam.toLowerCase().includes(huidigeLeverancier.toLowerCase()))
    : null;
  const huidigKosten = huidigResult
    ? (showDoorlopend ? huidigResult.totaalDoorlopend : huidigResult.totaalJaar)
    : null;

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

      {/* Results as cards (mobile-friendly) */}
      <div className="px-4 sm:px-5 py-3 space-y-2">
        {gefilterd.map((r, i) => {
          const isHuidig = huidigeLeverancier != null &&
            r.leverancier.naam.toLowerCase().includes(huidigeLeverancier.toLowerCase());
          const totaal = showDoorlopend ? r.totaalDoorlopend : r.totaalJaar;
          const isGoedkoopst = totaal === goedkoopste && i === 0;
          const leverancierNaam = r.leverancier.naam.split(" — ")[0];
          const hasAffiliate = !isHuidig && (affiliateUrls?.[leverancierNaam] || r.leverancier.affiliateUrl);
          const affiliateHref = affiliateUrls?.[leverancierNaam] || r.leverancier.affiliateUrl!;

          // Calculate savings vs current supplier
          const besparing = huidigKosten ? huidigKosten - totaal : null;

          return (
            <div
              key={r.leverancier.naam}
              className={`rounded-xl border p-4 transition-all ${
                isGoedkoopst
                  ? "border-bw-green bg-[#F0FDF4] shadow-[0_0_0_1px_rgba(22,163,74,0.2)]"
                  : isHuidig
                    ? "border-bw-blue bg-bw-blue-light/30"
                    : "border-bw-border bg-white hover:border-[#94A3B8]"
              }`}
            >
              {/* Top label for best/current */}
              {isGoedkoopst && !isHuidig && (
                <div className="flex items-center gap-1.5 mb-2">
                  <CircleCheckBig className="w-4 h-4 text-bw-green" />
                  <span className="text-[11px] font-bold text-bw-green uppercase tracking-[0.5px]">Goedkoopste optie</span>
                </div>
              )}
              {isHuidig && (
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="w-4 h-4 text-bw-blue" />
                  <span className="text-[11px] font-bold text-bw-blue uppercase tracking-[0.5px]">Je huidige leverancier</span>
                </div>
              )}

              {/* Main row */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-[14px] text-bw-deep">{r.leverancier.naam}</span>
                    {r.leverancier.groen && (
                      <span className="text-[10px] font-bold bg-bw-green-bg text-bw-green-strong px-1.5 py-0.5 rounded">Groen</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-bw-text-light capitalize">{r.leverancier.type}</span>
                    {r.leverancier.rating > 0 && (
                      <span className="text-[10px] text-bw-text-light">★ {r.leverancier.rating}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-[18px] font-bold ${isGoedkoopst ? "text-bw-green-strong" : "text-bw-deep"}`}>
                    {i === 0 ? (
                      <CountUp end={totaal} prefix="€" className="font-bold" />
                    ) : (
                      `€${totaal}`
                    )}
                  </div>
                  <div className="text-[11px] text-bw-text-light">per jaar</div>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-bw-text-mid">
                <span>Stroom €{r.kostenElektriciteit}</span>
                {heeftGas && r.kostenGas != null && <span>Gas €{r.kostenGas}</span>}
                <span>Vastrecht €{r.vastrecht}</span>
                {!showDoorlopend && r.korting > 0 && (
                  <span className="text-bw-green font-semibold">Bonus -€{r.korting}</span>
                )}
              </div>

              {/* Savings badge + CTA */}
              {(!isHuidig || (isHuidig && besparing !== null && besparing < 0)) && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-bw-border/50">
                  {besparing !== null && besparing > 0 ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-bw-green-bg text-bw-green-strong text-[12px] font-bold">
                      Je bespaart €{Math.round(besparing)}/jaar
                    </span>
                  ) : besparing !== null && besparing < 0 && isHuidig ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#FEF2F2] text-[#DC2626] text-[12px] font-bold">
                      €{Math.round(Math.abs(besparing))}/jaar duurder dan goedkoopste
                    </span>
                  ) : (
                    <span />
                  )}

                  {hasAffiliate && (
                    <a
                      href={affiliateHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-bw-green text-white rounded-lg text-[13px] font-bold no-underline hover:bg-bw-green-strong hover:shadow-[0_2px_8px_rgba(22,163,74,0.25)] transition-all"
                    >
                      Overstappen
                    </a>
                  )}
                </div>
              )}
            </div>
          );
        })}
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
