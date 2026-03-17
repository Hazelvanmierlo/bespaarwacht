import Link from "next/link";
import { ShieldDownIcon } from "./icons";

export default function Footer() {
  return (
    <footer className="pt-12 pb-6 px-6 bg-bw-deep border-t border-white/5">
      <div className="max-w-[1140px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.8fr_1fr_1fr_1fr] gap-9 mb-9">
        {/* Brand */}
        <div>
          <Link href="/" className="flex items-center gap-[9px] no-underline text-white">
            <div className="w-[34px] h-[34px] rounded-xl bg-bw-blue flex items-center justify-center">
              <ShieldDownIcon />
            </div>
            <span className="font-heading font-bold text-lg tracking-[-0.3px]">
              DeVerzekerings<span className="text-bw-blue-light">Agent</span>
            </span>
          </Link>
          <p className="text-[13px] text-white/40 leading-relaxed mt-2.5 max-w-[250px]">
            Vergelijk, bespaar en wij bewaken je vaste lasten 24/7. Altijd gratis.
          </p>
        </div>

        {/* Verzekeringen */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-white/30 mb-3">Verzekeringen</h4>
          <div className="flex flex-col gap-0.5">
            {["Zorgverzekering", "Autoverzekering", "Woonverzekering", "Reisverzekering", "Aansprakelijkheid", "Rechtsbijstand"].map((item) => (
              <Link key={item} href="/upload?type=verzekering" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">
                {item}
              </Link>
            ))}
          </div>
        </div>

        {/* DeVerzekeringsAgent */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-white/30 mb-3">Over ons</h4>
          <div className="flex flex-col gap-0.5">
            <Link href="/#hoe-werkt-het" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Hoe het werkt</Link>
            <Link href="/#waarom" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Over ons</Link>
            <Link href="/#reviews" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Reviews</Link>
            <Link href="/upload?type=energie" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Energie vergelijken</Link>
            <Link href="/#reviews" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Contact</Link>
          </div>
        </div>

        {/* Juridisch */}
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-[1px] text-white/30 mb-3">Juridisch</h4>
          <div className="flex flex-col gap-0.5">
            <Link href="/privacy" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Privacybeleid</Link>
            <Link href="/voorwaarden" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Voorwaarden</Link>
            <Link href="/cookies" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Cookies</Link>
            <Link href="/klachten" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Klachtenregeling</Link>
            <Link href="/dienstwijzer" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors">Dienstenwijzer</Link>
            <Link href="/avg-veilig" className="text-[13px] text-white/55 no-underline py-[3px] hover:text-white transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
              AVG-veilig vergelijken
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="max-w-[1140px] mx-auto pt-4 border-t border-white/5 flex flex-wrap justify-between items-center text-[11.5px] text-white/25 gap-2">
        <span>&copy; 2026 Fraction B.V. (h/o DeVerzekeringsAgent) — KvK 91544467</span>
        <Link href="/avg-veilig" className="text-white/25 no-underline hover:text-white/50 transition-colors">AVG Compliant</Link>
        <span>Wft geregistreerd</span>
      </div>
      <div className="max-w-[1140px] mx-auto mt-3 text-[11px] text-white/20 leading-relaxed">
        Bij een afgesloten verzekering via DeVerzekeringsAgent ontvangen wij een vergoeding van de verzekeraar. Dit kost jou niets extra. De vergoeding heeft geen invloed op de vergelijkingsresultaten — de goedkoopste staat altijd bovenaan.
      </div>
    </footer>
  );
}
