import { getSupabaseAdmin } from "@/lib/supabase-server";
import Link from "next/link";
import { RefreshCw, DollarSign, Users, CircleCheckBig, AlertTriangle, Zap, LinkIcon } from "@/components/icons";
import type { ReactNode } from "react";

interface LeadRow {
  id: string;
  naam: string | null;
  telefoon: string;
  leverancier_huidig: string | null;
  leverancier_nieuw: string | null;
  besparing_jaar1: number | null;
  status: string;
  bron: string;
  created_at: string;
}

interface ScraperLog {
  id: string;
  leverancier: string;
  status: string;
  error_message: string | null;
  tarief_stroom: number | null;
  tarief_gas: number | null;
  duration_ms: number | null;
  created_at: string;
}

async function getStats() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      usersCount: 0,
      analysesCount: 0,
      leadsTotal: 0,
      leadsAfgerond: 0,
      leadsAangevraagd: 0,
      totalBesparing: 0,
      recentLeads: [] as LeadRow[],
      scraperLogs: [] as ScraperLog[],
      scraperSuccess: 0,
      scraperErrors: 0,
      leveranciersActief: 0,
    };
  }

  const [users, analyses, leads, leadsAfgerond, recentLeads, scraperLogs] =
    await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase.from("saved_analyses").select("id", { count: "exact", head: true }),
      supabase.from("energie_leads").select("id,besparing_jaar1,status", { count: "exact" }),
      supabase.from("energie_leads").select("id", { count: "exact", head: true }).eq("status", "afgerond"),
      supabase
        .from("energie_leads")
        .select("id,naam,telefoon,leverancier_huidig,leverancier_nieuw,besparing_jaar1,status,bron,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("energie_scraper_logs")
        .select("id,leverancier,status,error_message,tarief_stroom,tarief_gas,duration_ms,created_at")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  // Calculate total savings from all leads
  const allLeads = (leads.data ?? []) as { besparing_jaar1: number | null; status: string }[];
  const totalBesparing = allLeads.reduce((sum, l) => sum + (Number(l.besparing_jaar1) || 0), 0);

  // Scraper stats from last 7 days
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const recentScraperLogs = ((scraperLogs.data ?? []) as ScraperLog[]).filter(
    (l) => l.created_at >= weekAgo,
  );
  const scraperSuccess = recentScraperLogs.filter((l) => l.status === "success").length;
  const scraperErrors = recentScraperLogs.filter((l) => l.status !== "success").length;

  // Unique leveranciers with successful scrape
  const leveranciersActief = new Set(
    recentScraperLogs.filter((l) => l.status === "success").map((l) => l.leverancier),
  ).size;

  return {
    usersCount: users.count ?? 0,
    analysesCount: analyses.count ?? 0,
    leadsTotal: leads.count ?? 0,
    leadsAfgerond: leadsAfgerond.count ?? 0,
    leadsAangevraagd: allLeads.filter((l) => l.status === "aangevraagd").length,
    totalBesparing: Math.round(totalBesparing),
    recentLeads: (recentLeads.data ?? []) as LeadRow[],
    scraperLogs: (scraperLogs.data ?? []) as ScraperLog[],
    scraperSuccess,
    scraperErrors,
    leveranciersActief,
  };
}

const STATUS_COLORS: Record<string, string> = {
  aangevraagd: "bg-bw-orange-bg text-bw-orange-strong",
  bevestigd: "bg-bw-blue-light text-bw-blue",
  afgerond: "bg-bw-green-bg text-bw-green-strong",
  geannuleerd: "bg-bw-bg text-bw-text-light",
};

const SCRAPER_COLORS: Record<string, string> = {
  success: "bg-bw-green-bg text-bw-green-strong",
  error: "bg-bw-red-bg text-bw-red",
  timeout: "bg-bw-orange-bg text-bw-orange-strong",
  blocked: "bg-bw-red-bg text-bw-red",
  redirect: "bg-bw-orange-bg text-bw-orange-strong",
};

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards: { label: string; value: string | number; sub: string; icon: ReactNode; color: string }[] = [
    {
      label: "Overstappen",
      value: stats.leadsTotal,
      sub: `${stats.leadsAfgerond} afgerond`,
      icon: <RefreshCw className="w-6 h-6" />,
      color: "bg-bw-green-bg text-bw-green",
    },
    {
      label: "Totaal bespaard",
      value: `€${stats.totalBesparing.toLocaleString("nl-NL")}`,
      sub: "voor klanten",
      icon: <DollarSign className="w-6 h-6" />,
      color: "bg-bw-green-bg text-bw-green",
    },
    {
      label: "Gebruikers",
      value: stats.usersCount,
      sub: `${stats.analysesCount} analyses`,
      icon: <Users className="w-6 h-6" />,
      color: "bg-bw-blue-light text-bw-blue",
    },
    {
      label: "Scrapers",
      value: `${stats.scraperSuccess}/${stats.scraperSuccess + stats.scraperErrors}`,
      sub: `${stats.leveranciersActief} leveranciers OK`,
      icon: stats.scraperErrors === 0 ? <CircleCheckBig className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />,
      color: stats.scraperErrors === 0 ? "bg-bw-green-bg text-bw-green" : "bg-bw-orange-bg text-bw-orange",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-bw-deep mb-1">Dashboard</h1>
          <p className="text-sm text-bw-text-mid">Overzicht DeVerzekeringsAgent</p>
        </div>
        <Link
          href="/admin/energy-monitor"
          className="text-sm font-semibold text-bw-blue hover:underline"
        >
          Energie Monitor →
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div
            key={card.label}
            className="bg-white rounded-xl border border-bw-border p-5 flex items-center gap-4"
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}
            >
              {card.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-bw-deep">{card.value}</div>
              <div className="text-xs text-bw-text-mid">{card.label}</div>
              <div className="text-[11px] text-bw-text-light">{card.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent overstappen */}
        <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
          <div className="px-5 py-4 border-b border-bw-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-bw-deep">Recente overstappen</h2>
            <span className="text-[11px] text-bw-text-light">{stats.leadsTotal} totaal</span>
          </div>
          {stats.recentLeads.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-bw-text-light">
              Nog geen overstap-aanvragen.
            </div>
          ) : (
            <div className="divide-y divide-bw-border">
              {stats.recentLeads.map((lead) => (
                <div key={lead.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-bw-deep truncate">
                        {lead.naam || lead.telefoon}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          STATUS_COLORS[lead.status] || STATUS_COLORS.aangevraagd
                        }`}
                      >
                        {lead.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-bw-text-mid mt-0.5">
                      {lead.leverancier_huidig && (
                        <span>
                          {lead.leverancier_huidig} → {lead.leverancier_nieuw || "?"}
                        </span>
                      )}
                      {lead.besparing_jaar1 && (
                        <span className="ml-2 text-bw-green font-semibold">
                          €{Number(lead.besparing_jaar1).toFixed(0)}/jr
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-bw-text-light shrink-0">
                    {new Date(lead.created_at).toLocaleDateString("nl-NL", {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Scraper health */}
        <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
          <div className="px-5 py-4 border-b border-bw-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-bw-deep">Scraper health</h2>
            <Link
              href="/admin/energy-monitor"
              className="text-[11px] text-bw-blue font-semibold hover:underline"
            >
              Volledig overzicht
            </Link>
          </div>
          {stats.scraperLogs.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-bw-text-light">
              Nog geen scraper logs. De cron draait dagelijks om 03:00 UTC.
            </div>
          ) : (
            <div className="divide-y divide-bw-border">
              {stats.scraperLogs.slice(0, 8).map((log) => (
                <div key={log.id} className="px-5 py-3 flex items-center gap-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                      SCRAPER_COLORS[log.status] || SCRAPER_COLORS.error
                    }`}
                  >
                    {log.status === "success" ? "OK" : log.status.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-semibold text-bw-deep">{log.leverancier}</span>
                    {log.tarief_stroom && (
                      <span className="text-[11px] text-bw-text-mid ml-2">
                        €{Number(log.tarief_stroom).toFixed(4)}/kWh
                      </span>
                    )}
                    {log.error_message && (
                      <div className="text-[11px] text-bw-red truncate">{log.error_message}</div>
                    )}
                  </div>
                  <div className="text-[11px] text-bw-text-light shrink-0">
                    {log.duration_ms && <span>{log.duration_ms}ms</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Scraper summary bar */}
          {stats.scraperLogs.length > 0 && (
            <div className="px-5 py-3 bg-[#F8FAFC] border-t border-bw-border flex items-center justify-between text-[11px]">
              <span className="text-bw-text-mid">
                Laatste 7 dagen:{" "}
                <span className="font-bold text-bw-green-strong">{stats.scraperSuccess} OK</span>
                {stats.scraperErrors > 0 && (
                  <>
                    {" / "}
                    <span className="font-bold text-bw-red">{stats.scraperErrors} fouten</span>
                  </>
                )}
              </span>
              <span className="text-bw-text-light">
                {stats.leveranciersActief} leveranciers actief
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <Link
          href="/admin/energy-monitor"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-bw-deep border border-bw-border hover:bg-bw-bg transition-colors no-underline"
        >
          <Zap className="w-4 h-4 inline" /> Energie Monitor
        </Link>
        <Link
          href="/admin/gebruikers"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-bw-deep border border-bw-border hover:bg-bw-bg transition-colors no-underline inline-flex items-center gap-1.5"
        >
          <Users className="w-4 h-4" /> Gebruikers
        </Link>
        <Link
          href="/admin/scrapers"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-bw-deep border border-bw-border hover:bg-bw-bg transition-colors no-underline inline-flex items-center gap-1.5"
        >
          <RefreshCw className="w-4 h-4" /> Verzekering Scrapers
        </Link>
        <Link
          href="/admin/daisycon"
          className="px-4 py-2.5 rounded-lg text-sm font-semibold bg-white text-bw-deep border border-bw-border hover:bg-bw-bg transition-colors no-underline inline-flex items-center gap-1.5"
        >
          <LinkIcon className="w-4 h-4" /> Daisycon
        </Link>
      </div>
    </div>
  );
}
