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

          {/* WhatsApp */}
          <Link
            href="/whatsapp-demo"
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-[7px] rounded-lg text-[#25D366] hover:bg-[#25D366]/10 transition-all"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </Link>

          {/* Login / Account */}
          {session?.user ? (
            <>
              {(session.user as { role?: string }).role === "admin" && (
                <Link
                  href="/admin"
                  className="text-bw-text-light text-xs font-medium px-2 py-1 rounded hover:text-bw-blue hover:bg-bw-blue-light transition-all"
                >
                  Admin
                </Link>
              )}
              <Link
                href="/account"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-bw-deep border border-bw-border hover:bg-bw-bg transition-all"
              >
                Mijn polissen
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="text-bw-text-mid text-sm font-medium px-3 py-[7px] rounded-lg hover:text-bw-blue hover:bg-bw-blue-light transition-all"
            >
              Inloggen
            </Link>
          )}

          {/* CTA */}
          <Link
            href="/upload"
            className="ml-1 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-bw-orange text-white hover:bg-bw-orange-strong hover:-translate-y-0.5 hover:shadow-[0_4px_16px_rgba(249,115,22,0.3)] transition-all"
          >
            Upload &amp; vergelijk <ArrowRightIcon className="w-3.5 h-3.5" />
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
            className="flex items-center gap-1.5 text-sm font-medium py-2 text-[#25D366]"
            onClick={() => setMobileOpen(false)}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </Link>
          {session?.user ? (
            <Link href="/account" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Mijn polissen</Link>
          ) : (
            <Link href="/login" className="text-bw-text-mid text-sm font-medium py-2" onClick={() => setMobileOpen(false)}>Inloggen</Link>
          )}
          <Link
            href="/upload"
            className="mt-2 inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold bg-bw-orange text-white"
            onClick={() => setMobileOpen(false)}
          >
            Upload &amp; vergelijk <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </nav>
  );
}
