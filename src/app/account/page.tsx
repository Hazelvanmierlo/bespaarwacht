"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import { UploadIcon, ShieldIcon, ArrowRightIcon, CheckIcon, LockIcon, TrashIcon, PulseDot } from "@/components/icons";
import type { SavedPolis } from "@/lib/types";

interface ServerAnalysis {
  id: string;
  verzekeraar_huidig: string;
  product_type: string;
  dekking: string;
  premie_huidig: number;
  beste_alternatief: string;
  max_besparing: number;
  monitoring_active: boolean;
  created_at: string;
}

export default function AccountPage() {
  const { data: session, status } = useSession();
  const [polissen, setPolissen] = useState<SavedPolis[]>([]);
  const [serverAnalyses, setServerAnalyses] = useState<ServerAnalysis[]>([]);

  useEffect(() => {
    // Local storage polissen (backwards compat)
    const stored = JSON.parse(localStorage.getItem("bw-polissen") || "[]");
    setPolissen(stored);

    // Fetch server analyses if logged in
    if (session?.user) {
      fetch("/api/analyses")
        .then((r) => r.json())
        .then((data) => setServerAnalyses(data.analyses ?? []))
        .catch(() => {});
    }
  }, [session]);

  const deletePolis = (id: string) => {
    if (!confirm("Weet je zeker dat je deze analyse wilt verwijderen?")) return;
    const updated = polissen.filter((p) => p.id !== id);
    setPolissen(updated);
    localStorage.setItem("bw-polissen", JSON.stringify(updated));
  };

  const deleteServerAnalysis = async (id: string) => {
    if (!confirm("Weet je zeker dat je deze analyse wilt verwijderen?")) return;
    await fetch(`/api/analyses/${id}`, { method: "DELETE" });
    setServerAnalyses((prev) => prev.filter((a) => a.id !== id));
  };

  const allItems = [
    ...serverAnalyses.map((a) => ({
      id: a.id,
      verzekeraar: a.verzekeraar_huidig,
      type: a.product_type,
      dekking: a.dekking ?? "",
      maandpremie: Number(a.premie_huidig),
      woning: "",
      oppervlakte: "",
      maxBesparing: Number(a.max_besparing),
      monitoringActive: a.monitoring_active,
      isServer: true as const,
    })),
    ...polissen.map((p) => ({
      id: p.id,
      verzekeraar: p.verzekeraar,
      type: p.type,
      dekking: p.dekking,
      maandpremie: p.maandpremie,
      woning: p.woning,
      oppervlakte: p.oppervlakte,
      maxBesparing: p.maxBesparing,
      monitoringActive: p.monitoringActive,
      isServer: false as const,
    })),
  ];

  return (
    <div className="max-w-[800px] mx-auto px-6 py-12 pb-20">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h2 className="font-heading text-[28px] font-bold text-bw-deep">Mijn Polissen</h2>
          <p className="text-sm text-bw-text-mid mt-1">
            {session?.user
              ? `Ingelogd als ${session.user.email}`
              : "Je opgeslagen analyses worden hier bewaard."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session?.user && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-bw-text-mid border border-bw-border bg-white cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
            >
              Uitloggen
            </button>
          )}
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-bw-green text-white no-underline hover:bg-bw-green-strong transition-colors"
          >
            <UploadIcon className="w-4 h-4" /> Nieuwe polis
          </Link>
        </div>
      </div>

      {allItems.length === 0 ? (
        <div className="text-center py-16 px-6 bg-white rounded-2xl border border-bw-border">
          <div className="text-5xl mb-4">📋</div>
          <h3 className="text-lg font-bold text-bw-deep mb-2">Nog geen polissen opgeslagen</h3>
          <p className="text-sm text-bw-text-mid mb-6">Upload je eerste polis en sla de analyse op om 24/7 monitoring te activeren.</p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-6 py-3 rounded-[10px] text-[15px] font-semibold bg-bw-green text-white no-underline hover:bg-bw-green-strong transition-colors"
          >
            <UploadIcon className="w-4 h-4" /> Start nu <ArrowRightIcon className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {allItems.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-[14px] border border-bw-border px-6 py-5 flex items-center justify-between gap-4 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.05)] flex-wrap"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-bw-green-bg flex items-center justify-center shrink-0">
                  <ShieldIcon className="w-5 h-5 text-bw-green" />
                </div>
                <div>
                  <div className="text-[15px] font-bold text-bw-deep">{p.verzekeraar} — {p.type}</div>
                  <div className="text-[13px] text-bw-text-mid">
                    {p.dekking}
                    {p.woning ? ` · ${p.woning}` : ""}
                    {p.oppervlakte ? ` · ${p.oppervlakte}` : ""}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-bw-red font-semibold">€ {p.maandpremie}/mnd</span>
                    <span className="text-xs text-bw-green font-bold bg-bw-green-bg px-1.5 py-0.5 rounded">↓ Tot € {p.maxBesparing}/jr besparing</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {p.monitoringActive && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-bw-green-bg">
                    <PulseDot />
                    <span className="text-[11px] font-semibold text-bw-green">Monitoring actief</span>
                  </div>
                )}
                <Link
                  href="/analyse/demo"
                  className="px-3.5 py-2 rounded-md text-xs font-semibold bg-bw-deep text-white no-underline hover:bg-bw-navy transition-colors inline-flex items-center gap-1"
                >
                  Bekijk <ArrowRightIcon className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => p.isServer ? deleteServerAnalysis(p.id) : deletePolis(p.id)}
                  className="p-2 rounded-md bg-transparent text-bw-red border border-[#FECACA] cursor-pointer flex items-center hover:bg-bw-red-bg transition-colors"
                  title="Verwijderen"
                >
                  <TrashIcon />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AVG Privacy Panel */}
      <div className="mt-8 bg-white rounded-[14px] border border-bw-border overflow-hidden">
        <div className="px-5 py-4 bg-bw-deep flex items-center gap-2">
          <LockIcon className="w-3.5 h-3.5 text-white" />
          <span className="text-sm font-bold text-white">Jouw privacy — AVG-compliant</span>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="p-3.5 bg-bw-green-bg rounded-[10px] border-l-[3px] border-bw-green">
              <div className="text-xs font-bold text-bw-green-strong mb-1.5">WAT WIJ WEL OPSLAAN</div>
              <div className="text-xs text-bw-green-dark leading-relaxed">
                Alleen geanonimiseerde verzekeringsdata: type verzekering, dekking, premie, woningtype, regio (postcode 4 cijfers). Deze data is niet herleidbaar tot jou als persoon.
              </div>
            </div>
            <div className="p-3.5 bg-bw-red-bg rounded-[10px] border-l-[3px] border-bw-red">
              <div className="text-xs font-bold text-bw-red mb-1.5">WAT WIJ NOOIT OPSLAAN</div>
              <div className="text-xs text-[#991B1B] leading-relaxed">
                Je naam, adres, geboortedatum, polisnummer, IBAN, BSN of andere direct identificeerbare persoonsgegevens. Je PDF wordt na analyse direct verwijderd.
              </div>
            </div>
          </div>
          <div className="p-3.5 bg-bw-bg rounded-[10px] mb-3">
            <div className="text-xs font-bold text-bw-deep mb-2">Jouw AVG-rechten bij BespaarWacht</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {[
                ["Recht op inzage", "Bekijk altijd welke data wij bewaren"],
                ["Recht op verwijdering", "Verwijder je data met één klik"],
                ["Recht op overdracht", "Download je data als bestand"],
                ["Recht op bezwaar", "Bezwaar maken kan altijd"],
                ["Geen verkoop", "Wij verkopen nooit je gegevens"],
                ["Geen marketing", "Geen spam, alleen relevante alerts"],
              ].map(([title, desc]) => (
                <div key={title} className="flex items-start gap-1.5 py-1">
                  <span className="text-bw-green shrink-0 mt-0.5"><CheckIcon className="w-3 h-3" /></span>
                  <div>
                    <span className="text-[11px] font-semibold text-bw-deep">{title}: </span>
                    <span className="text-[11px] text-bw-text-mid">{desc}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="text-[11px] text-bw-text-light leading-relaxed">
            BespaarWacht verwerkt gegevens conform de AVG (Algemene Verordening Gegevensbescherming). Grondslag: uitvoering overeenkomst (art. 6 lid 1b AVG) en gerechtvaardigd belang (art. 6 lid 1f AVG). Dataminimalisatie is ons uitgangspunt — wij verzamelen alleen wat strikt noodzakelijk is.
          </div>
        </div>
      </div>
    </div>
  );
}
