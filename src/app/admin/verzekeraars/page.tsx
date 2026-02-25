import { getSupabaseAdmin } from "@/lib/supabase-server";

async function getVerzekeraars() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("verzekeraars")
    .select("*, premies(count)")
    .order("naam");
  return data ?? [];
}

export default async function VerzekeraarsPage() {
  const verzekeraars = await getVerzekeraars();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-2xl font-bold text-bw-deep mb-1">Verzekeraars</h1>
          <p className="text-sm text-bw-text-mid">{verzekeraars.length} verzekeraars in database.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bw-bg text-left">
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Verzekeraar</th>
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Slug</th>
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Calculator</th>
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Premies</th>
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {verzekeraars.map((v: Record<string, unknown>) => (
              <tr key={v.id as string} className="border-t border-bw-border hover:bg-bw-bg/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                      style={{ backgroundColor: (v.kleur as string) || "#64748B" }}
                    >
                      {(v.naam as string).slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-bw-deep">{v.naam as string}</div>
                      <div className="text-[11px] text-bw-text-light">{v.website as string}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-bw-text-mid font-mono text-xs">{v.slug as string}</td>
                <td className="px-5 py-3.5">
                  {v.has_online_calculator ? (
                    <span className="text-[11px] font-bold text-bw-green bg-bw-green-bg px-2 py-0.5 rounded">Online</span>
                  ) : (
                    <span className="text-[11px] font-bold text-bw-text-light bg-bw-bg px-2 py-0.5 rounded">Geen</span>
                  )}
                </td>
                <td className="px-5 py-3.5 font-semibold text-bw-deep">
                  {((v.premies as { count: number }[])?.[0]?.count) ?? 0}
                </td>
                <td className="px-5 py-3.5">
                  {v.actief ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-bw-green bg-bw-green-bg px-2 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-bw-green" /> Actief
                    </span>
                  ) : (
                    <span className="text-[11px] font-bold text-bw-text-light bg-bw-bg px-2 py-0.5 rounded">Inactief</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
