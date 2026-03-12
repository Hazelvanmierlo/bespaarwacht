import { redirect } from "next/navigation";
import Link from "next/link";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { auth } from "@/auth";
import { CheckIcon, ArrowRightIcon, Home, Building2, ShieldCheck, Plane, FileText, Search } from "@/components/icons";

const PRODUCT_LABELS: Record<string, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
};

export default async function AnalysePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ product?: string }>;
}) {
  const { id } = await params;
  const { product } = await searchParams;

  // Demo page redirect
  if (id === "demo") {
    const productParam = product ? `?product=${product}` : "";
    redirect(`/analyse/demo${productParam}`);
  }

  // Check auth
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch analysis from Supabase
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return <NotFound message="Database niet beschikbaar." />;
  }

  const { data: analysis } = await supabase
    .from("saved_analyses")
    .select("*")
    .eq("id", id)
    .eq("user_id", session.user.id)
    .single();

  if (!analysis) {
    return <NotFound message="Analyse niet gevonden of je hebt geen toegang." />;
  }

  const productLabel = PRODUCT_LABELS[analysis.product_type] || analysis.product_type;

  return (
    <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
      {/* Back link */}
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 text-sm text-bw-text-mid hover:text-bw-blue transition-colors mb-6"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Terug naar overzicht
      </Link>

      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bw-blue-light to-[#DBEAFE] flex items-center justify-center text-xl">
          {analysis.product_type === "inboedel" ? <Home className="w-5 h-5 text-bw-blue" /> :
           analysis.product_type === "opstal" ? <Building2 className="w-5 h-5 text-bw-blue" /> :
           analysis.product_type === "aansprakelijkheid" ? <ShieldCheck className="w-5 h-5 text-bw-blue" /> :
           analysis.product_type === "reis" ? <Plane className="w-5 h-5 text-bw-blue" /> : <FileText className="w-5 h-5 text-bw-blue" />}
        </div>
        <div>
          <h1 className="font-heading text-[24px] font-bold text-bw-deep">{productLabel}</h1>
          <p className="text-[13px] text-bw-text-mid">
            Opgeslagen op {new Date(analysis.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>

      {/* Savings banner */}
      {analysis.max_besparing > 0 && (
        <div className="bg-bw-green-bg border border-[rgba(22,163,74,0.2)] rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-bw-green text-white flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
          </div>
          <div>
            <p className="text-sm text-bw-text-mid mb-0.5">Mogelijke besparing</p>
            <p className="font-heading text-2xl font-bold text-bw-green-strong">
              €{Number(analysis.max_besparing).toFixed(0)} <span className="text-sm font-semibold text-bw-text-mid">/jaar</span>
            </p>
          </div>
        </div>
      )}

      {/* Current policy */}
      <div className="bg-white rounded-xl border border-bw-border overflow-hidden mb-4">
        <div className="px-4 py-3 bg-[#F8FAFC] border-b border-bw-border">
          <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Huidige verzekering</span>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-bw-text-mid">Verzekeraar</span>
            <span className="text-sm font-semibold text-bw-deep">{analysis.verzekeraar_huidig}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-bw-text-mid">Premie</span>
            <span className="text-sm font-semibold text-bw-deep">€{Number(analysis.premie_huidig).toFixed(2)} /mnd</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-bw-text-mid">Dekking</span>
            <span className="text-sm font-semibold text-bw-deep">{analysis.dekking}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-bw-text-mid">Type</span>
            <span className="text-sm font-semibold text-bw-deep">{productLabel}</span>
          </div>
        </div>
      </div>

      {/* Best alternative */}
      {analysis.beste_alternatief && (
        <div className="bg-white rounded-xl border-2 border-bw-green overflow-hidden mb-6">
          <div className="px-4 py-3 bg-bw-green-bg border-b border-[rgba(22,163,74,0.2)]">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-bw-green" />
              <span className="text-[11px] font-bold text-bw-green-strong uppercase tracking-[0.5px]">Beste alternatief</span>
            </div>
          </div>
          <div className="px-4 py-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-bw-deep">{analysis.beste_alternatief}</span>
              {analysis.max_besparing > 0 && (
                <span className="text-sm font-bold text-bw-green-strong">
                  €{(Number(analysis.premie_huidig) - Number(analysis.max_besparing) / 12).toFixed(2)} /mnd
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Monitoring status */}
      <div className="bg-white rounded-xl border border-bw-border p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${analysis.monitoring_active ? "bg-bw-green animate-pulse" : "bg-bw-text-light"}`} />
          <div>
            <p className="text-sm font-semibold text-bw-deep">
              {analysis.monitoring_active ? "Monitoring actief" : "Monitoring uitgeschakeld"}
            </p>
            <p className="text-xs text-bw-text-mid">
              {analysis.monitoring_active
                ? "Wij bewaken de markt 24/7 en melden als het goedkoper kan."
                : "Schakel monitoring in om automatisch bericht te krijgen bij betere deals."}
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/upload?type=verzekering`}
          className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-bw-orange text-white hover:bg-bw-orange-strong transition-all no-underline"
        >
          Opnieuw vergelijken <ArrowRightIcon className="w-3.5 h-3.5" />
        </Link>
        <Link
          href="/account"
          className="inline-flex items-center px-4 py-3 rounded-xl text-sm font-semibold bg-white text-bw-text-mid border border-bw-border hover:bg-bw-bg transition-colors no-underline"
        >
          Overzicht
        </Link>
      </div>
    </div>
  );
}

function NotFound({ message }: { message: string }) {
  return (
    <div className="max-w-[520px] mx-auto px-6 py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-bw-bg flex items-center justify-center mx-auto mb-4"><Search className="w-6 h-6 text-bw-text-mid" /></div>
      <h1 className="font-heading text-xl font-bold text-bw-deep mb-2">Niet gevonden</h1>
      <p className="text-sm text-bw-text-mid mb-6">{message}</p>
      <Link
        href="/account"
        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-bw-blue text-white hover:bg-bw-blue-strong transition-all no-underline"
      >
        Naar mijn polissen
      </Link>
    </div>
  );
}
