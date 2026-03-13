"use client";

import { usePathname } from "next/navigation";
import Nav from "@/components/nav";
import Footer from "@/components/footer";
import { WhatsAppFloat } from "@/components/WhatsAppFloat";

/** Routes where we hide the public nav, footer and WhatsApp float */
const PORTAL_ROUTES = ["/login", "/account", "/analyse/", "/admin"];
const HIDE_WHATSAPP = ["/login", "/account", "/admin"];

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const isPortal = PORTAL_ROUTES.some((r) => pathname === r || pathname.startsWith(r));
  const hideWhatsApp = HIDE_WHATSAPP.some((r) => pathname === r || pathname.startsWith(r));

  if (isPortal) {
    return (
      <>
        <main>{children}</main>
        {!hideWhatsApp && <WhatsAppFloat />}
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="pt-16">{children}</main>
      <Footer />
      {!hideWhatsApp && <WhatsAppFloat />}
    </>
  );
}
