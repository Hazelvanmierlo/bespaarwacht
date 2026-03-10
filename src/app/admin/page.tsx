import { getSupabaseAdmin } from "@/lib/supabase-server";

async function getStats() {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { verzekeraarsCount: 0, premiesCount: 0, usersCount: 0, analysesCount: 0, recentRuns: [] };
  }

  const [verzekeraars, premies, scraper_runs, users, analyses] =
    await Promise.all([
      supabase.from("verzekeraars").select("id", { count: "exact" }),
      supabase.from("premies").select("id", { count: "exact" }),
      supabase
        .from("scraper_runs")
        .select("*")
        .order("run_at", { ascending: false })
        .limit(5),
      supabase.from("users").select("id", { count: "exact" }),
      supabase.from("saved_analyses").select("id", { count: "exact" }),
    ]);

  return {
    verzekeraarsCount: verzekeraars.count ?? 0,
    premiesCount: premies.count ?? 0,
    usersCount: users.count ?? 0,
    analysesCount: analyses.count ?? 0,
    recentRuns: scraper_runs.data ?? [],
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const cards = [
    { label: "Verzekeraars", value: stats.verzekeraarsCount, icon: "🏢", color: "bg-bw-blue-light text-bw-blue" },
    { label: "Premies in DB", value: stats.premiesCount, icon: "💰", color: "bg-bw-green-bg text-bw-green" },
    { label: "Gebruikers", value: stats.usersCount, icon: "👥", color: "bg-bw-orange-bg text-bw-orange" },
    { label: "Analyses", value: stats.analysesCount, icon: "📊", color: "bg-[#EDE9FE] text-[#7C3AED]" },
  ];

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-bw-deep mb-1">Dashboard</h1>
      <p className="text-sm text-bw-text-mid mb-6">Overzicht van DeVerzekeringsAgent backend.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-bw-border p-5 flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${card.color}`}>
              {card.icon}
            </div>
            <div>
              <div className="text-2xl font-bold text-bw-deep">{card.value}</div>
              <div className="text-xs text-bw-text-mid">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
        <div className="px-5 py-4 border-b border-bw-border">
          <h2 className="text-sm font-bold text-bw-deep">Laatste scraper runs</h2>
        </div>
        {stats.recentRuns.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-bw-text-light">
            Nog geen scraper runs uitgevoerd.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-bw-bg text-left">
                <th className="px-5 py-2.5 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Tijdstip</th>
                <th className="px-5 py-2.5 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Status</th>
                <th className="px-5 py-2.5 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Premie</th>
                <th className="px-5 py-2.5 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Duur</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentRuns.map((run: Record<string, unknown>) => (
                <tr key={run.id as string} className="border-t border-bw-border">
                  <td className="px-5 py-3 text-bw-text-mid">
                    {new Date(run.run_at as string).toLocaleString("nl-NL")}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                      run.status === "success" ? "bg-bw-green-bg text-bw-green" : "bg-bw-red-bg text-bw-red"
                    }`}>
                      {run.status as string}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-semibold text-bw-deep">
                    {run.premie_gevonden ? `€ ${run.premie_gevonden}` : "—"}
                  </td>
                  <td className="px-5 py-3 text-bw-text-light">
                    {run.duration_ms ? `${run.duration_ms}ms` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
