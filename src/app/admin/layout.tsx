import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldDownIcon } from "@/components/icons";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/verzekeraars", label: "Verzekeraars", icon: "🏢" },
  { href: "/admin/scrapers", label: "Scrapers", icon: "🔄" },
  { href: "/admin/gebruikers", label: "Gebruikers", icon: "👥" },
  { href: "/admin/daisycon", label: "Daisycon", icon: "🔗" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if ((session.user as { role?: string }).role !== "admin") {
    redirect("/account");
  }

  return (
    <div className="min-h-screen bg-bw-bg">
      {/* Admin top bar */}
      <div className="bg-bw-deep border-b border-white/10 px-6 py-3">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 no-underline text-white">
              <div className="w-8 h-8 rounded-lg bg-bw-blue flex items-center justify-center">
                <ShieldDownIcon className="w-4 h-4" />
              </div>
              <span className="font-heading font-bold text-base text-white">
                DeVerzekerings<span className="text-bw-blue-light">Agent</span>
              </span>
            </Link>
            <span className="text-[11px] font-bold text-white/30 bg-white/10 px-2 py-0.5 rounded">ADMIN</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-white/50 hover:text-white transition-colors no-underline">
              Naar site
            </Link>
            <span className="text-xs text-white/40">{session.user.email}</span>
          </div>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto flex gap-0 min-h-[calc(100vh-64px-52px)]">
        {/* Sidebar */}
        <aside className="w-[220px] shrink-0 border-r border-bw-border bg-white py-4 px-3">
          <nav className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium text-bw-text-mid no-underline hover:bg-bw-blue-light hover:text-bw-blue transition-all"
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
