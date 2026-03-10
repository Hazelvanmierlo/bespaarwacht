import { getSupabaseAdmin } from "@/lib/supabase-server";
import Link from "next/link";

interface ScraperLog {
  id: string;
  leverancier: string;
  scrape_methode: string;
  status: string;
  url_gebruikt: string | null;
  url_redirect: string | null;
  tarieven_gevonden: boolean;
  tarief_stroom: number | null;
  tarief_gas: number | null;
  error_message: string | null;
  response_code: number | null;
  duration_ms: number | null;
  created_at: string;
}

const STATUS_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  success: { bg: "bg-bw-green-bg", text: "text-bw-green-strong", label: "OK" },
  error: { bg: "bg-bw-red-bg", text: "text-bw-red", label: "Fout" },
  timeout: { bg: "bg-bw-orange-bg", text: "text-bw-orange-strong", label: "Timeout" },
  blocked: { bg: "bg-bw-red-bg", text: "text-bw-red", label: "Geblokkeerd" },
  redirect: { bg: "bg-bw-orange-bg", text: "text-bw-orange-strong", label: "Redirect" },
};

export default async function EnergyMonitorPage() {
  const supabase = getSupabaseAdmin();

  let logs: ScraperLog[] = [];
  let stats = { total: 0, success: 0, errors: 0, lastRun: "" };

  if (supabase) {
    // Fetch last 200 logs
    const { data } = await supabase
      .from("energie_scraper_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    logs = (data as ScraperLog[]) || [];

    // Calculate stats from last 7 days
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const recentLogs = logs.filter((l) => l.created_at >= weekAgo);
    stats.total = recentLogs.length;
    stats.success = recentLogs.filter((l) => l.status === "success").length;
    stats.errors = recentLogs.filter((l) => l.status !== "success").length;
    stats.lastRun = logs[0]?.created_at || "";
  }

  // Group by leverancier: get latest log per leverancier
  const byLeverancier = new Map<string, ScraperLog>();
  const consecutiveErrors = new Map<string, number>();

  for (const log of logs) {
    if (!byLeverancier.has(log.leverancier)) {
      byLeverancier.set(log.leverancier, log);
    }
  }

  // Count consecutive errors per leverancier
  for (const [lev] of byLeverancier) {
    let count = 0;
    for (const log of logs) {
      if (log.leverancier !== lev) continue;
      if (log.status !== "success") count++;
      else break;
    }
    consecutiveErrors.set(lev, count);
  }

  const leverancierRows = Array.from(byLeverancier.entries()).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
  const needsAttention = Array.from(consecutiveErrors.entries()).filter(([, c]) => c >= 3).length;

  return (
    <div className="max-w-[1100px] mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-[28px] font-bold text-bw-deep">Energie Scraper Monitor</h1>
          <p className="text-sm text-bw-text-mid">Overzicht van alle energietarief-scrapers</p>
        </div>
        <Link
          href="/admin"
          className="text-sm text-bw-text-mid hover:text-bw-blue transition-colors"
        >
          ← Admin
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-bw-border p-4">
          <p className="text-xs text-bw-text-mid uppercase tracking-wide mb-1">Leveranciers</p>
          <p className="text-2xl font-bold text-bw-deep">{byLeverancier.size}</p>
        </div>
        <div className="bg-white rounded-xl border border-bw-border p-4">
          <p className="text-xs text-bw-text-mid uppercase tracking-wide mb-1">Success rate (7d)</p>
          <p className={`text-2xl font-bold ${successRate >= 80 ? "text-bw-green-strong" : successRate >= 50 ? "text-bw-orange-strong" : "text-bw-red"}`}>
            {successRate}%
          </p>
        </div>
        <div className="bg-white rounded-xl border border-bw-border p-4">
          <p className="text-xs text-bw-text-mid uppercase tracking-wide mb-1">Fouten (7d)</p>
          <p className={`text-2xl font-bold ${stats.errors === 0 ? "text-bw-green-strong" : "text-bw-red"}`}>
            {stats.errors}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-bw-border p-4">
          <p className="text-xs text-bw-text-mid uppercase tracking-wide mb-1">Actie vereist</p>
          <p className={`text-2xl font-bold ${needsAttention === 0 ? "text-bw-green-strong" : "text-bw-red"}`}>
            {needsAttention}
          </p>
        </div>
      </div>

      {/* Last run info */}
      {stats.lastRun && (
        <div className="bg-bw-bg rounded-xl border border-bw-border p-4 mb-6 text-sm text-bw-text-mid">
          Laatste run: <strong className="text-bw-deep">
            {new Date(stats.lastRun).toLocaleString("nl-NL", { dateStyle: "long", timeStyle: "short" })}
          </strong>
        </div>
      )}

      {/* Leverancier table */}
      {leverancierRows.length === 0 ? (
        <div className="bg-white rounded-xl border border-bw-border p-8 text-center">
          <p className="text-bw-text-mid text-sm">Nog geen scraper data. De cron draait elke nacht om 03:00 UTC.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-bw-border bg-[#F8FAFC]">
                  <th className="text-left py-3 px-4 font-semibold text-bw-deep">Leverancier</th>
                  <th className="text-left py-3 px-4 font-semibold text-bw-deep">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-bw-deep">Methode</th>
                  <th className="text-right py-3 px-4 font-semibold text-bw-deep">Stroom</th>
                  <th className="text-right py-3 px-4 font-semibold text-bw-deep">Gas</th>
                  <th className="text-left py-3 px-4 font-semibold text-bw-deep">Laatste check</th>
                  <th className="text-center py-3 px-4 font-semibold text-bw-deep">Fouten</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-bw-border">
                {leverancierRows.map(([naam, log]) => {
                  const badge = STATUS_BADGE[log.status] || STATUS_BADGE.error;
                  const errors = consecutiveErrors.get(naam) || 0;
                  const needsAction = errors >= 3;

                  return (
                    <tr key={naam} className={needsAction ? "bg-bw-red-bg/30" : ""}>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-bw-deep">{naam}</div>
                        {log.url_redirect && (
                          <div className="text-[11px] text-bw-orange-strong mt-0.5 truncate max-w-[200px]">
                            Redirect → {log.url_redirect}
                          </div>
                        )}
                        {needsAction && (
                          <span className="inline-block mt-1 text-[10px] font-bold text-bw-red bg-bw-red-bg px-2 py-0.5 rounded">
                            ACTIE VEREIST
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-bw-text-mid">{log.scrape_methode}</td>
                      <td className="py-3 px-4 text-right font-mono text-bw-deep">
                        {log.tarief_stroom ? `€${Number(log.tarief_stroom).toFixed(4)}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-bw-deep">
                        {log.tarief_gas ? `€${Number(log.tarief_gas).toFixed(4)}` : "—"}
                      </td>
                      <td className="py-3 px-4 text-bw-text-mid text-[12px]">
                        {new Date(log.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-bold ${errors === 0 ? "text-bw-green-strong" : errors < 3 ? "text-bw-orange-strong" : "text-bw-red"}`}>
                          {errors}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent errors */}
      {logs.filter((l) => l.status !== "success").length > 0 && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-bold text-bw-deep mb-4">Recente fouten</h2>
          <div className="space-y-2">
            {logs
              .filter((l) => l.status !== "success")
              .slice(0, 10)
              .map((log) => (
                <div
                  key={log.id}
                  className="bg-white rounded-lg border border-bw-border p-3 flex items-start gap-3"
                >
                  <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold shrink-0 mt-0.5 ${(STATUS_BADGE[log.status] || STATUS_BADGE.error).bg} ${(STATUS_BADGE[log.status] || STATUS_BADGE.error).text}`}>
                    {(STATUS_BADGE[log.status] || STATUS_BADGE.error).label}
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-bw-deep">{log.leverancier}</div>
                    {log.error_message && (
                      <p className="text-xs text-bw-text-mid mt-0.5 truncate">{log.error_message}</p>
                    )}
                    {log.url_gebruikt && (
                      <p className="text-[11px] text-bw-text-light mt-0.5 truncate">{log.url_gebruikt}</p>
                    )}
                  </div>
                  <div className="ml-auto text-[11px] text-bw-text-light shrink-0">
                    {log.response_code && <span className="mr-2">HTTP {log.response_code}</span>}
                    {new Date(log.created_at).toLocaleDateString("nl-NL", { day: "numeric", month: "short" })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
