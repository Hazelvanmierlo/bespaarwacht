"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ShieldDownIcon, LockIcon, FileText, Home, Building2, ShieldCheck,
  Plane, Car, HeartPulse, Zap, ArrowRightIcon,
} from "@/components/icons";
import type { ReactNode } from "react";

interface DocAnalysis {
  id: string;
  verzekeraar_huidig: string;
  product_type: string;
  dekking: string;
  premie_huidig: number;
  created_at: string;
  geanonimiseerde_tekst: string | null;
  pii_count: number;
  review_status: string;
}

const PRODUCT_ICONS: Record<string, ReactNode> = {
  inboedel: <Home className="w-5 h-5" />,
  opstal: <Building2 className="w-5 h-5" />,
  aansprakelijkheid: <ShieldCheck className="w-5 h-5" />,
  reis: <Plane className="w-5 h-5" />,
  auto: <Car className="w-5 h-5" />,
  zorg: <HeartPulse className="w-5 h-5" />,
  energie: <Zap className="w-5 h-5" />,
};

const PRODUCT_LABELS: Record<string, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
  auto: "Autoverzekering",
  zorg: "Zorgverzekering",
  energie: "Energiecontract",
};

export default function DocumentenPage() {
  const { data: session, status } = useSession();
  const [analyses, setAnalyses] = useState<DocAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [anonPreview, setAnonPreview] = useState<Record<string, string>>({});
  const [loadingPreview, setLoadingPreview] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      window.location.href = "/login";
    }
    if (session?.user) {
      fetch("/api/analyses")
        .then((r) => r.json())
        .then((d) => setAnalyses(d.analyses ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [session, status]);

  const loadPreview = async (id: string) => {
    if (anonPreview[id]) {
      setExpandedDoc(expandedDoc === id ? null : id);
      return;
    }
    setLoadingPreview(id);
    try {
      const res = await fetch(`/api/account/documenten/${id}/anon`);
      if (res.ok) {
        const text = await res.text();
        setAnonPreview((prev) => ({ ...prev, [id]: text }));
        setExpandedDoc(id);
      }
    } catch {
      // silent
    }
    setLoadingPreview(null);
  };

  const docsWithAnon = analyses.filter((a) => a.verzekeraar_huidig);

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-bw-bg flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-bw-blue border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bw-bg">
      {/* Header */}
      <header className="bg-white border-b border-bw-border sticky top-0 z-50">
        <div className="max-w-[800px] mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Link href="/account" className="flex items-center gap-2 no-underline text-bw-deep">
              <div className="w-8 h-8 rounded-lg bg-bw-blue flex items-center justify-center">
                <ShieldDownIcon />
              </div>
              <span className="font-heading font-bold text-[15px] tracking-[-0.3px] hidden sm:inline">
                DeVerzekerings<span className="text-bw-blue">Agent</span>
              </span>
            </Link>
            <svg className="w-4 h-4 text-bw-text-light hidden sm:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            <span className="text-[13px] font-semibold text-bw-text-mid hidden sm:inline">Mijn documenten</span>
          </div>
          <Link
            href="/account"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium text-bw-text-mid border border-bw-border bg-white no-underline hover:bg-bw-bg transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-[800px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Page title */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep flex items-center gap-2.5">
              <LockIcon className="w-5 h-5 text-bw-text-mid" />
              Mijn documenten
            </h1>
            <p className="text-[13px] text-bw-text-mid mt-1">
              Geanonimiseerde versies van je polissen en contracten.
            </p>
          </div>
          <Link
            href="/avg-veilig"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[12px] font-semibold text-bw-green bg-bw-green-bg no-underline hover:bg-[#D1FAE5] transition-colors border border-[#BBF7D0]"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
            </svg>
            Hoe we je data beschermen
          </Link>
        </div>

        {/* AVG banner */}
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl px-4 py-3 flex items-center gap-2.5 mb-6">
          <svg className="w-4 h-4 text-bw-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
          </svg>
          <span className="text-[12px] text-[#166534]">
            <strong>AVG-beschermd</strong> — Alle persoonsgegevens zijn vervangen door tokens ([NAAM_1], [ADRES_1], etc.). Bedragen en dekkingen blijven zichtbaar. Je kunt op elk moment je data laten verwijderen.
          </span>
        </div>

        {/* Document list */}
        {docsWithAnon.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-dashed border-bw-border">
            <FileText className="w-12 h-12 text-bw-text-light/40 mx-auto mb-3" />
            <h3 className="text-[15px] font-bold text-bw-deep mb-1.5">Nog geen documenten</h3>
            <p className="text-[13px] text-bw-text-mid mb-5 max-w-sm mx-auto">
              Upload je eerste polis en wij anonimiseren en vergelijken deze automatisch.
            </p>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[13px] font-bold text-white bg-bw-orange no-underline hover:bg-bw-orange-strong transition-colors"
            >
              Upload polis <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {docsWithAnon.map((a) => {
              const icon = PRODUCT_ICONS[a.product_type] || <FileText className="w-5 h-5" />;
              const label = PRODUCT_LABELS[a.product_type] || a.product_type;
              const isExpanded = expandedDoc === a.id;
              const hasAnon = !!a.geanonimiseerde_tekst || !!anonPreview[a.id];

              return (
                <div key={a.id} className="bg-white rounded-xl border border-bw-border overflow-hidden">
                  {/* Document row */}
                  <div className="px-4 sm:px-5 py-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-bw-bg flex items-center justify-center shrink-0 text-bw-blue">
                      {icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-bold text-bw-deep truncate">
                        {a.verzekeraar_huidig} &mdash; {label}
                      </div>
                      <div className="text-[12px] text-bw-text-light mt-0.5 flex items-center gap-2 flex-wrap">
                        <span>{new Date(a.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}</span>
                        <span>&middot;</span>
                        <span>&euro;{Number(a.premie_huidig).toFixed(2)}/mnd</span>
                        {a.pii_count > 0 && (
                          <>
                            <span>&middot;</span>
                            <span className="text-bw-green font-semibold">{a.pii_count} PII-tokens verwijderd</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {hasAnon ? (
                        <>
                          <button
                            onClick={() => loadPreview(a.id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-bw-blue bg-bw-blue-light border-none cursor-pointer font-[inherit] hover:bg-[#DBEAFE] transition-colors"
                          >
                            {loadingPreview === a.id ? (
                              <span className="w-3.5 h-3.5 border-2 border-bw-blue border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                            )}
                            {isExpanded ? "Sluiten" : "Bekijk"}
                          </button>
                          <a
                            href={`/api/account/documenten/${a.id}/anon`}
                            download
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-[12px] font-semibold text-bw-text-mid bg-bw-bg border-none cursor-pointer no-underline hover:bg-bw-border/50 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                            Download
                          </a>
                        </>
                      ) : (
                        <span className="text-[11px] text-bw-text-light px-3 py-2 bg-bw-bg rounded-lg">
                          Wordt verwerkt...
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded preview */}
                  {isExpanded && anonPreview[a.id] && (
                    <div className="px-4 sm:px-5 pb-4">
                      <div className="bg-[#1E293B] rounded-xl p-4 sm:p-5 overflow-x-auto">
                        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                          <svg className="w-3.5 h-3.5 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                          </svg>
                          <span className="text-[11px] font-semibold text-bw-green">Geanonimiseerde versie</span>
                          <span className="text-[11px] text-white/30 ml-auto">{anonPreview[a.id].length} tekens</span>
                        </div>
                        <pre className="text-[12px] sm:text-[13px] text-[#E2E8F0] font-mono whitespace-pre-wrap leading-relaxed max-h-[600px] overflow-y-auto">
                          {anonPreview[a.id]}
                        </pre>
                      </div>
                      <div className="mt-2.5 flex items-center gap-2 text-[11px] text-bw-text-light">
                        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                        Tokens zoals [NAAM_1], [ADRES_1], [IBAN_1] vervangen je persoonsgegevens. Alleen jij kunt de originele waarden inzien via je profiel.
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Privacy footer */}
        <div className="mt-8 bg-white rounded-xl border border-bw-border p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
            {[
              { icon: "shield", title: "AES-256 versleuteld", desc: "Persoonsgegevens zijn encrypted opgeslagen" },
              { icon: "eye", title: "AI ziet geen namen", desc: "Alleen geanonimiseerde tekst wordt geanalyseerd" },
              { icon: "trash", title: "Recht op verwijdering", desc: "Vraag op elk moment volledige verwijdering aan" },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-bw-green shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
                </svg>
                <div>
                  <span className="font-semibold text-bw-deep">{title}</span>
                  <span className="text-bw-text-light"> — {desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
