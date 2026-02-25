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
          <div className="w-[34px] h-[34px] rounded-lg bg-bw-green flex items-center justify-center">
            <ShieldDownIcon />
          </div>
          <span className="font-heading font-bold text-xl tracking-[-0.4px]">
            Bespaar<span className="text-bw-green">Wacht</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/#verzekeringen" className="text-bw-text-mid text-sm font-medium px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all">
            Verzekeringen
          </Link>
          <Link href="/#hoe-werkt-het" className="text-bw-text-mid text-sm font-medium px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all">
            Hoe het werkt
          </Link>
          <Link href="/#waarom" className="text-bw-text-mid text-sm font-medium px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all">
            Waarom BespaarWacht
          </Link>
          <Link href="/#reviews" className="text-bw-text-mid text-sm font-medium px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all">
            Reviews
          </Link>
          {session?.user ? (
            <Link
              href="/account"
              className="ml-2 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-bw-deep border border-bw-border hover:bg-bw-bg transition-all"
            >
              Mijn polissen
            </Link>
          ) : (
            <Link
              href="/login"
              className="ml-1 text-bw-text-mid text-sm font-medium px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all"
            >
              Inloggen
            </Link>
          )}
          <Link
            href="/upload"
            className="ml-1 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-bw-green text-white hover:bg-bw-green-strong hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(22,163,74,0.25)] transition-all"
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
        <div className="md:hidden bg-white border-t border-bw-border px-6 py-4 flex flex-col gap-2">
          <Link href="/#verzekeringen" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Verzekeringen</Link>
          <Link href="/#hoe-werkt-het" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Hoe het werkt</Link>
          <Link href="/#waarom" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Waarom BespaarWacht</Link>
          <Link href="/#reviews" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Reviews</Link>
          {session?.user ? (
            <Link href="/account" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Mijn polissen</Link>
          ) : (
            <Link href="/login" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Inloggen</Link>
          )}
          <Link
            href="/upload"
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-bw-green text-white"
            onClick={() => setMobileOpen(false)}
          >
            Vergelijk gratis <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </nav>
  );
}
