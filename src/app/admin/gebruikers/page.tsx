import { getSupabaseAdmin } from "@/lib/supabase-server";

async function getUsers() {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];
  const { data } = await supabase
    .from("users")
    .select("id, email, name, role, provider, created_at, saved_analyses(count)")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export default async function GebruikersPage() {
  const users = await getUsers();

  return (
    <div>
      <h1 className="font-heading text-2xl font-bold text-bw-deep mb-1">Gebruikers</h1>
      <p className="text-sm text-bw-text-mid mb-6">{users.length} geregistreerde gebruikers.</p>

      <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bw-bg text-left">
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Gebruiker</th>
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Provider</th>
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Rol</th>
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Analyses</th>
              <th className="px-5 py-3 text-xs font-bold text-bw-text-mid uppercase tracking-wider">Geregistreerd</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user: Record<string, unknown>) => (
              <tr key={user.id as string} className="border-t border-bw-border hover:bg-bw-bg/50 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-bw-deep">{(user.name as string) || "—"}</div>
                  <div className="text-[11px] text-bw-text-light">{user.email as string}</div>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-[11px] font-bold text-bw-text-mid bg-bw-bg px-2 py-0.5 rounded capitalize">
                    {user.provider as string}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                    user.role === "admin" ? "bg-[#EDE9FE] text-[#7C3AED]" : "bg-bw-blue-light text-bw-blue"
                  }`}>
                    {user.role as string}
                  </span>
                </td>
                <td className="px-5 py-3.5 font-semibold text-bw-deep">
                  {((user.saved_analyses as { count: number }[])?.[0]?.count) ?? 0}
                </td>
                <td className="px-5 py-3.5 text-bw-text-light">
                  {new Date(user.created_at as string).toLocaleDateString("nl-NL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
