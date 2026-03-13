"use client";

import { useState } from "react";
import { CircleCheckBig, AlertTriangle, ArrowRightIcon } from "@/components/icons";
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

const TOP_BADGES = [
  { label: "Beste keuze", bg: "bg-bw-green", text: "text-white" },
  { label: "Goed alternatief", bg: "bg-bw-deep", text: "text-white" },
  { label: "Ook interessant", bg: "bg-[#6B7280]", text: "text-white" },
];

export default function Vergelijking({ resultaten, huidigeLeverancier, affiliateUrls }: VergelijkingProps) {
  const [filter, setFilter] = useState<FilterType>("alles");
  const [showDoorlopend, setShowDoorlopend] = useState(false);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

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

  const top3 = gefilterd.slice(0, 3);

  return (
    <div>
      {/* ── HEADER + FILTERS ── */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="font-heading text-[18px] sm:text-[20px] font-bold text-bw-deep">Vergelijking leveranciers</h3>
          <p className="text-[11px] text-bw-text-mid">Jaarkosten incl. energiebelasting, ODE en BTW</p>
        </div>
        {heeftKorting && (
          <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
            <button
              onClick={() => setShowDoorlopend(false)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold border-none cursor-pointer font-[inherit] transition-all ${
                !showDoorlopend ? "bg-white text-bw-deep shadow-sm" : "text-bw-text-mid bg-transparent"
              }`}
            >
              Jaar 1
            </button>
            <button
              onClick={() => setShowDoorlopend(true)}
              className={`px-3 py-1.5 rounded-md text-[12px] font-semibold border-none cursor-pointer font-[inherit] transition-all ${
                showDoorlopend ? "bg-white text-bw-deep shadow-sm" : "text-bw-text-mid bg-transparent"
              }`}
            >
              Doorlopend
            </button>
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 flex-wrap mb-5">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold border-none cursor-pointer font-[inherit] transition-all ${
              filter === tab.key
                ? "bg-bw-green text-white"
                : "bg-[#F1F5F9] text-bw-text-mid hover:text-bw-blue hover:bg-bw-blue-light"
            }`}
          >
            {tab.label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-bw-text-light self-center">{gefilterd.length} resultaten</span>
      </div>

      {/* ── TOP 3 CARDS ── */}
      {top3.length > 0 && (
        <>
          <h4 className="text-[16px] font-bold text-bw-deep mb-3">Jouw top {Math.min(3, top3.length)}</h4>
          <div className={`grid gap-3 mb-6 ${top3.length >= 3 ? "grid-cols-1 md:grid-cols-3" : top3.length === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
            {top3.map((r, i) => {
              const badge = TOP_BADGES[i];
              const totaal = showDoorlopend ? r.totaalDoorlopend : r.totaalJaar;
              const leverancierNaam = r.leverancier.naam.split(" — ")[0];
              const isHuidig = huidigeLeverancier != null &&
                r.leverancier.naam.toLowerCase().includes(huidigeLeverancier.toLowerCase());
              const besparing = huidigKosten ? huidigKosten - totaal : null;
              const hasAffiliate = !isHuidig && (affiliateUrls?.[leverancierNaam] || r.leverancier.affiliateUrl);
              const affiliateHref = affiliateUrls?.[leverancierNaam] || r.leverancier.affiliateUrl!;
              const isExpanded = expandedCard === r.leverancier.naam;
              const maand = Math.round(totaal / 12);

              return (
                <div
                  key={r.leverancier.naam}
                  className={`bg-white rounded-2xl overflow-hidden flex flex-col ${
                    i === 0
                      ? "border-2 border-bw-green shadow-[0_4px_24px_rgba(22,163,74,0.10)]"
                      : "border border-bw-border hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)]"
                  } transition-all`}
                >
                  {/* Badge */}
                  <div className={`${badge.bg} ${badge.text} px-4 py-2 flex items-center justify-between`}>
                    <span className="text-[13px] font-bold">{badge.label}</span>
                    {besparing != null && besparing > 0 && (
                      <span className="text-[12px] font-bold bg-white/20 px-2 py-0.5 rounded-md">
                        &minus;&euro; {Math.round(besparing)}/jr
                      </span>
                    )}
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    {/* Logo + name */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-[13px] font-bold shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
                        style={{ backgroundColor: getColorForLev(leverancierNaam) }}
                      >
                        {leverancierNaam.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-bold text-bw-deep truncate">{r.leverancier.naam}</div>
                        <div className="flex items-center gap-2 text-[11px] text-bw-text-light mt-0.5">
                          <span className="capitalize">{r.leverancier.type}</span>
                          {r.leverancier.groen && <span className="text-[10px] font-bold bg-bw-green-bg text-bw-green-strong px-1.5 py-0.5 rounded">Groen</span>}
                          {r.leverancier.rating > 0 && <span>&#9733; {r.leverancier.rating}</span>}
                        </div>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right mb-3">
                      <div className="text-[11px] text-bw-text-light">Geschat per maand</div>
                      <div className={`font-heading text-[28px] font-bold leading-tight ${
                        i === 0 ? "text-bw-green" : "text-bw-deep"
                      }`}>
                        &euro; {maand}<span className="text-[13px] font-semibold text-bw-text-light">/mnd</span>
                      </div>
                      <div className="text-[11px] text-bw-text-light">&euro; {totaal}/jaar</div>
                      {!showDoorlopend && r.korting > 0 && (
                        <div className="text-[11px] font-semibold text-bw-green-strong">Incl. &euro; {r.korting} welkomstbonus</div>
                      )}
                    </div>

                    {/* Cost breakdown chips */}
                    <div className="flex flex-wrap gap-1.5 mb-3 text-[10px]">
                      <span className="px-2 py-0.5 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-bw-text-mid">
                        Stroom &euro;{r.kostenElektriciteit}
                      </span>
                      {heeftGas && r.kostenGas != null && (
                        <span className="px-2 py-0.5 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-bw-text-mid">
                          Gas &euro;{r.kostenGas}
                        </span>
                      )}
                      <span className="px-2 py-0.5 bg-[#F8FAFC] rounded border border-[#E2E8F0] text-bw-text-mid">
                        Vastrecht &euro;{r.vastrecht}
                      </span>
                    </div>

                    <div className="flex-1" />

                    {/* CTA */}
                    {hasAffiliate ? (
                      <a
                        href={affiliateHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-[14px] font-bold no-underline cursor-pointer transition-all hover:-translate-y-px ${
                          i === 0
                            ? "bg-bw-green text-white hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)]"
                            : "bg-bw-deep text-white hover:bg-bw-navy hover:shadow-[0_4px_16px_rgba(15,33,55,0.2)]"
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                        Kies deze
                      </a>
                    ) : isHuidig ? (
                      <div className="w-full text-center py-3 rounded-xl text-[13px] font-semibold text-bw-blue bg-bw-blue-light border border-[#BFDBFE]">
                        Je huidige leverancier
                      </div>
                    ) : (
                      <div className="w-full text-center py-3 rounded-xl text-[13px] font-semibold text-bw-text-mid bg-[#F8FAFC] border border-bw-border">
                        Geen overstaplink
                      </div>
                    )}

                    {/* Meer informatie */}
                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : r.leverancier.naam)}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1 py-2 text-[12px] font-semibold text-bw-blue cursor-pointer bg-transparent border-none font-[inherit] hover:underline"
                    >
                      {isExpanded ? "\u2212 Minder informatie" : "+ Meer informatie"}
                    </button>

                    {isExpanded && (
                      <ExpandedDetails r={r} heeftGas={heeftGas} showDoorlopend={showDoorlopend} huidigKosten={huidigKosten} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── ALL SUPPLIERS LIST ── */}
      {gefilterd.length > 0 && (
        <>
          <h4 className="text-[16px] font-bold text-bw-deep mb-3">Alle {gefilterd.length} leveranciers</h4>
          <div className="flex flex-col gap-2.5">
            {gefilterd.map((r, i) => {
              const rank = i + 1;
              const totaal = showDoorlopend ? r.totaalDoorlopend : r.totaalJaar;
              const maand = Math.round(totaal / 12);
              const leverancierNaam = r.leverancier.naam.split(" — ")[0];
              const isHuidig = huidigeLeverancier != null &&
                r.leverancier.naam.toLowerCase().includes(huidigeLeverancier.toLowerCase());
              const besparing = huidigKosten ? huidigKosten - totaal : null;
              const hasAffiliate = !isHuidig && (affiliateUrls?.[leverancierNaam] || r.leverancier.affiliateUrl);
              const affiliateHref = affiliateUrls?.[leverancierNaam] || r.leverancier.affiliateUrl!;
              const isExpanded = expandedCard === r.leverancier.naam;
              const isGoedkoopst = i === 0;

              return (
                <div
                  key={r.leverancier.naam}
                  className={`bg-white rounded-xl border overflow-hidden transition-all ${
                    isGoedkoopst ? "border-bw-green" : isHuidig ? "border-bw-blue" : "border-bw-border hover:shadow-[0_2px_12px_rgba(0,0,0,0.05)]"
                  }`}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Rank */}
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-bold shrink-0 ${
                      isGoedkoopst ? "bg-bw-green text-white" : "bg-[#F1F5F9] text-bw-text-mid"
                    }`}>
                      {rank}
                    </div>

                    {/* Logo */}
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0 shadow-[0_2px_6px_rgba(0,0,0,0.1)]"
                      style={{ backgroundColor: getColorForLev(leverancierNaam) }}
                    >
                      {leverancierNaam.slice(0, 2).toUpperCase()}
                    </div>

                    {/* Name + details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold text-bw-deep">{r.leverancier.naam}</span>
                        {r.leverancier.groen && (
                          <span className="text-[9px] font-bold bg-bw-green-bg text-bw-green-strong px-1.5 py-0.5 rounded">Groen</span>
                        )}
                        {isHuidig && (
                          <span className="text-[9px] font-bold bg-bw-blue-light text-[#1D4ED8] px-1.5 py-0.5 rounded">Huidig</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-bw-text-light mt-0.5">
                        <span className="capitalize">{r.leverancier.type}</span>
                        {r.leverancier.rating > 0 && <span>&#9733; {r.leverancier.rating}</span>}
                        {!showDoorlopend && r.korting > 0 && <span className="text-bw-green font-semibold">Bonus &minus;&euro;{r.korting}</span>}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-right shrink-0">
                      <div className={`text-[18px] font-bold ${isGoedkoopst ? "text-bw-green" : "text-bw-deep"}`}>
                        &euro; {maand}<span className="text-[10px] font-semibold">/mnd</span>
                      </div>
                      {besparing != null && besparing > 0 ? (
                        <div className="text-[11px] font-semibold text-bw-green-strong">&minus;&euro; {Math.round(besparing)}/jr</div>
                      ) : besparing != null && besparing < 0 ? (
                        <div className="text-[11px] text-bw-text-light">+&euro; {Math.round(Math.abs(besparing))}/jr</div>
                      ) : null}
                    </div>

                    {/* CTA */}
                    {hasAffiliate && (
                      <a
                        href={affiliateHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-bw-green text-white no-underline hover:bg-bw-green-strong transition-all shrink-0"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 002 1.61h9.72a2 2 0 002-1.61L23 6H6"/></svg>
                        Kies deze
                      </a>
                    )}
                  </div>

                  {/* Mobile CTA + expand */}
                  <div className="flex items-center border-t border-[#F1F5F9]">
                    {hasAffiliate && (
                      <a
                        href={affiliateHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sm:hidden flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-[12px] font-bold text-bw-green no-underline cursor-pointer border-r border-[#F1F5F9]"
                      >
                        Kies deze
                      </a>
                    )}
                    <button
                      onClick={() => setExpandedCard(isExpanded ? null : r.leverancier.naam)}
                      className={`${hasAffiliate ? "flex-1 sm:flex-none sm:w-full" : "w-full"} inline-flex items-center justify-center gap-1 px-3 py-2.5 text-[12px] font-semibold text-bw-blue cursor-pointer bg-transparent border-none font-[inherit] hover:underline`}
                    >
                      {isExpanded ? "\u2212 Minder informatie" : "+ Meer informatie"}
                    </button>
                  </div>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="px-4 pb-4">
                      <ExpandedDetails r={r} heeftGas={heeftGas} showDoorlopend={showDoorlopend} huidigKosten={huidigKosten} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {gefilterd.length === 0 && (
        <div className="py-8 text-center text-sm text-bw-text-mid">
          Geen leveranciers gevonden voor dit filter.
        </div>
      )}

      {/* Tax disclaimer */}
      <div className="mt-4 p-3 bg-bw-bg rounded-lg border-l-[3px] border-bw-border">
        <p className="text-[11px] text-bw-text-light leading-relaxed">
          Prijzen incl. energiebelasting, ODE en 21% BTW. Vermindering energiebelasting (&euro;642/jr) verrekend.
          Netbeheerkosten (~&euro;744/jr) zijn gelijk voor alle leveranciers en niet meegerekend.
          {!showDoorlopend && heeftKorting && " Jaar-1 prijs incl. welkomstbonus."}
        </p>
      </div>
    </div>
  );
}

/* ─── Expanded details for a card ─── */
function ExpandedDetails({ r, heeftGas, showDoorlopend, huidigKosten }: {
  r: BerekeningResultaat;
  heeftGas: boolean;
  showDoorlopend: boolean;
  huidigKosten: number | null;
}) {
  const totaal = showDoorlopend ? r.totaalDoorlopend : r.totaalJaar;
  const besparing = huidigKosten ? huidigKosten - totaal : null;

  return (
    <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Cost breakdown */}
        <div>
          <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">Kosten opbouw</div>
          <div className="space-y-1.5">
            <div className="flex justify-between text-[12px] py-1 border-b border-[#F8FAFC]">
              <span className="text-bw-text-mid">Stroom</span>
              <span className="font-semibold text-bw-deep">&euro; {r.kostenElektriciteit}</span>
            </div>
            {heeftGas && r.kostenGas != null && (
              <div className="flex justify-between text-[12px] py-1 border-b border-[#F8FAFC]">
                <span className="text-bw-text-mid">Gas</span>
                <span className="font-semibold text-bw-deep">&euro; {r.kostenGas}</span>
              </div>
            )}
            <div className="flex justify-between text-[12px] py-1 border-b border-[#F8FAFC]">
              <span className="text-bw-text-mid">Vastrecht</span>
              <span className="font-semibold text-bw-deep">&euro; {r.vastrecht}</span>
            </div>
            <div className="flex justify-between text-[12px] py-1 border-b border-[#F8FAFC]">
              <span className="text-bw-text-mid">Energiebelasting</span>
              <span className="font-semibold text-bw-deep">&euro; {r.energiebelasting}</span>
            </div>
            <div className="flex justify-between text-[12px] py-1 border-b border-[#F8FAFC]">
              <span className="text-bw-text-mid">Vermindering EB</span>
              <span className="font-semibold text-bw-green">&minus;&euro; {r.verminderingEB}</span>
            </div>
            {r.terugleverOpbrengst > 0 && (
              <div className="flex justify-between text-[12px] py-1 border-b border-[#F8FAFC]">
                <span className="text-bw-text-mid">Teruglevering</span>
                <span className="font-semibold text-bw-green">&minus;&euro; {r.terugleverOpbrengst}</span>
              </div>
            )}
            {!showDoorlopend && r.korting > 0 && (
              <div className="flex justify-between text-[12px] py-1 border-b border-[#F8FAFC]">
                <span className="text-bw-text-mid">Welkomstbonus</span>
                <span className="font-semibold text-bw-green">&minus;&euro; {r.korting}</span>
              </div>
            )}
            <div className="flex justify-between text-[12px] py-1 border-b border-[#F8FAFC]">
              <span className="text-bw-text-mid">BTW (21%)</span>
              <span className="font-semibold text-bw-deep">&euro; {r.btw}</span>
            </div>
            <div className="flex justify-between text-[13px] pt-1.5 font-bold">
              <span className="text-bw-deep">Totaal per jaar</span>
              <span className="text-bw-deep">&euro; {totaal}</span>
            </div>
          </div>
        </div>

        {/* Contract info + savings */}
        <div>
          <div className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2">Over {r.leverancier.naam}</div>
          <div className="space-y-2 text-[12px]">
            <div className="flex justify-between">
              <span className="text-bw-text-mid">Type</span>
              <span className="font-semibold text-bw-deep capitalize">{r.leverancier.type}</span>
            </div>
            {r.leverancier.groen && (
              <div className="flex justify-between">
                <span className="text-bw-text-mid">Duurzaam</span>
                <span className="font-semibold text-bw-green">Groene stroom</span>
              </div>
            )}
            {r.leverancier.rating > 0 && (
              <div className="flex justify-between">
                <span className="text-bw-text-mid">Beoordeling</span>
                <span className="font-semibold text-bw-deep">&#9733; {r.leverancier.rating}/10</span>
              </div>
            )}
          </div>

          {besparing != null && (
            <div className="bg-[#F8FAFC] rounded-lg p-3 mt-3 space-y-1.5">
              <div className="text-[10px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Vergelijking</div>
              <div className="flex justify-between text-[12px]">
                <span className="text-bw-text-mid">Huidig</span>
                <span className="font-semibold text-bw-red">&euro; {huidigKosten}/jaar</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-bw-text-mid">{r.leverancier.naam}</span>
                <span className="font-semibold text-bw-green">&euro; {totaal}/jaar</span>
              </div>
              {besparing > 0 && (
                <div className="flex justify-between text-[12px] pt-1.5 border-t border-[#E2E8F0]">
                  <span className="font-semibold text-bw-deep">Besparing</span>
                  <span className="font-bold text-bw-green">&euro; {Math.round(besparing)}/jaar</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Simple color mapping for energy suppliers ─── */
function getColorForLev(naam: string): string {
  const colors: Record<string, string> = {
    "Eneco": "#00A651",
    "Essent": "#E30613",
    "Vattenfall": "#FFB900",
    "Greenchoice": "#008C45",
    "Budget Energie": "#0066CC",
    "Oxxio": "#FF6600",
    "Vandebron": "#1B3C59",
    "Frank Energie": "#FF4081",
    "Tibber": "#0BB4AA",
    "Coolblue Energie": "#0090E3",
    "Pure Energie": "#7CB342",
    "ANWB Energie": "#FFB900",
    "Engie": "#00ADEF",
    "UnitedConsumers": "#E65100",
    "Nederlandse Energie Maatschappij": "#003366",
    "Mega": "#6C3B9B",
    "HEM": "#1A237E",
    "NextEnergy": "#00BCD4",
  };
  for (const [key, color] of Object.entries(colors)) {
    if (naam.toLowerCase().includes(key.toLowerCase())) return color;
  }
  return "#64748B";
}
