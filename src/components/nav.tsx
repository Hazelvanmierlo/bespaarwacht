"use client";

import Link from "next/link";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { ShieldDownIcon, ArrowRightIcon, MenuIcon, XIcon } from "./icons";

export default function Nav() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <nav id="main-nav" className="fixed top-0 left-0 right-0 z-100 bg-white/95 backdrop-blur-[12px] border-b border-bw-border">
      <div className="max-w-[1140px] mx-auto px-6 flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-[9px] no-underline text-bw-deep">
          <div className="w-[34px] h-[34px] rounded-xl bg-bw-blue flex items-center justify-center">
            <ShieldDownIcon />
          </div>
          <span className="font-heading font-bold text-[17px] tracking-[-0.3px]">
            DeVerzekerings<span className="text-bw-blue">Agent</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          {/* Primary categories */}
          <Link href="/upload?type=verzekering" className="text-bw-text-mid text-sm font-semibold px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all">
            Verzekeringen
          </Link>
          <Link href="/upload?type=energie" className="text-bw-text-mid text-sm font-semibold px-3 py-[7px] rounded-lg hover:text-bw-green hover:bg-bw-green-bg transition-all">
            Energie
          </Link>

          <div className="w-px h-5 bg-bw-border mx-1" />

          {/* Secondary links */}
          <Link href="/#hoe-werkt-het" className="text-bw-text-mid text-sm font-medium px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all">
            Hoe het werkt
          </Link>
          <Link href="/#reviews" className="text-bw-text-mid text-sm font-medium px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all">
            Reviews
          </Link>

          <div className="w-px h-5 bg-bw-border mx-1" />

          {/* Help — personal, approachable */}
          <Link
            href="/whatsapp-demo"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-[7px] rounded-lg text-bw-text-mid hover:text-bw-blue hover:bg-bw-blue-light transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Stel je vraag
          </Link>

          {/* Login — subtle text link like Independer */}
          <Link
            href={session?.user ? "/account" : "/login"}
            className="text-bw-text-light text-[13px] font-medium px-2 py-[7px] hover:text-bw-blue transition-colors"
          >
            {session?.user ? "Mijn account" : "Inloggen"}
          </Link>

          {/* CTA */}
          <Link
            href="/upload"
            className="ml-1 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-bw-orange text-white hover:bg-bw-orange-strong hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(249,115,22,0.3)] transition-all"
          >
            Vergelijk gratis <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile toggle */}
        <button className="md:hidden bg-transparent border-none cursor-pointer" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-bw-border px-6 py-4 flex flex-col gap-2 max-h-[calc(100vh-64px)] overflow-y-auto">
          <Link href="/upload?type=verzekering" className="text-bw-deep text-sm font-semibold py-2" onClick={() => setMobileOpen(false)}>Verzekeringen</Link>
          <Link href="/upload?type=energie" className="text-bw-deep text-sm font-semibold py-2" onClick={() => setMobileOpen(false)}>Energie</Link>
          <div className="h-px bg-bw-border my-1" />
          <Link href="/#hoe-werkt-het" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Hoe het werkt</Link>
          <Link href="/#reviews" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Reviews</Link>
          <div className="h-px bg-bw-border my-1" />
          <Link
            href="/whatsapp-demo"
            className="flex items-center gap-1.5 text-sm font-medium py-2 text-bw-text-mid"
            onClick={() => setMobileOpen(false)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            Stel je vraag
          </Link>
          <Link href={session?.user ? "/account" : "/login"} className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>
            {session?.user ? "Mijn account" : "Inloggen"}
          </Link>
          <Link
            href="/upload"
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-bw-orange text-white"
            onClick={() => setMobileOpen(false)}
          >
            Vergelijk gratis <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </nav>
  );
}
