import Link from "next/link";
import { ArrowRightIcon, CheckIcon, PulseDot } from "@/components/icons";

const trustItems = [
  "Gratis voor consumenten",
  "Onafhankelijk",
  "Goedkoopste bovenaan",
  "Wij regelen de overstap",
  "AVG-compliant",
];

const steps = [
  { emoji: "🔍", title: "Vergelijk", desc: "Kies je verzekering en vul je gegevens in. Zie direct de beste opties, gesorteerd op prijs." },
  { emoji: "📊", title: "Bekijk resultaten", desc: "Vergelijk op premie, dekking, voorwaarden en klanttevredenheid. Helder op een rij." },
  { emoji: "✅", title: "Stap over", desc: "Sluit direct af. Wij regelen de overstap en opzegging bij je oude verzekeraar." },
  { emoji: "🛡️", title: "24/7 bewaking", desc: "Wij monitoren de markt non-stop. Wordt het ergens beter? Je krijgt direct een alert." },
];

const categories = [
  { emoji: "🏥", title: "Zorgverzekering", desc: "Vergelijk alle Nederlandse zorgverzekeraars op premie, dekking en klanttevredenheid.", badge: "Bespaar gem. €180/jr" },
  { emoji: "🚗", title: "Autoverzekering", desc: "WA, beperkt casco of allrisk. Vergelijk en stap direct over.", badge: "Bespaar gem. €290/jr" },
  { emoji: "🏠", title: "Woonverzekering", desc: "Inboedel, opstal of een combinatie. Bescherm je huis tegen de beste prijs.", badge: "Bespaar gem. €145/jr" },
  { emoji: "✈️", title: "Reisverzekering", desc: "Doorlopend of per reis. Vergelijk op dekking en medische kosten.", badge: null },
  { emoji: "⚖️", title: "Rechtsbijstand", desc: "Juridische hulp wanneer je het nodig hebt.", badge: null },
  { emoji: "🤝", title: "Aansprakelijkheid", desc: "Onmisbaar voor elk huishouden. Al vanaf een paar euro per maand.", badge: null },
];

const reviews = [
  { stars: 5, text: "\"Ik wist niet dat ik €340 per jaar te veel betaalde voor mijn autoverzekering. BespaarWacht ontdekte het en regelde de overstap binnen een dag.\"", initials: "MV", name: "Marieke V.", loc: "Utrecht" },
  { stars: 5, text: "\"Vorige maand kreeg ik een alert dat mijn zorgpremie omlaag kon. Weer €14 per maand bespaard! En het kostte me niks.\"", initials: "JB", name: "Jeroen B.", loc: "Amersfoort" },
  { stars: 5, text: "\"Eindelijk een vergelijker die niet stopt na het afsluiten. Ik hoef nergens meer aan te denken — BespaarWacht houdt alles in de gaten.\"", initials: "SH", name: "Sandra H.", loc: "Eindhoven" },
];

const comparisonRows = [
  { label: "Vergelijken op prijs", others: true, bw: true },
  { label: "Voorwaarden vergelijken", others: false, bw: true },
  { label: "Overstap regelen", others: true, bw: true },
  { label: "24/7 monitoring", others: false, bw: true },
  { label: "Alerts bij betere optie", others: false, bw: true },
];

const scanPolissen = [
  { emoji: "🏥", name: "Zorgverzekering", detail: "CZ → VGZ · betere dekking", saving: "↓ €14/mnd", hasSaving: true },
  { emoji: "🚗", name: "Autoverzekering", detail: "Centraal Beheer → FBTO", saving: "↓ €11/mnd", hasSaving: true },
  { emoji: "🏠", name: "Woonverzekering", detail: "Interpolis · scherpe premie", saving: "✓ Goed", hasSaving: false },
  { emoji: "✈️", name: "Reisverzekering", detail: "ANWB → Allianz", saving: "↓ €4/mnd", hasSaving: true },
];

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12 items-center">
          {/* Left */}
          <div>
            <div className="inline-flex items-center gap-[5px] bg-bw-green-bg text-bw-green-strong px-[11px] py-1 rounded-md text-[12.5px] font-semibold mb-4">
              ✓ 100% gratis &amp; onafhankelijk
            </div>
            <h1 className="font-heading text-[clamp(32px,3.6vw,46px)] leading-[1.12] font-bold text-bw-deep tracking-[-0.8px] mb-3.5">
              Vergelijk je verzekeringen en bespaar{" "}
              <span className="text-bw-green">direct.</span> Wij houden de markt 24/7 in de gaten.
            </h1>
            <p className="text-[16.5px] leading-relaxed text-bw-text-mid max-w-[440px] mb-6">
              Vergelijk op prijs, dekking en voorwaarden. Stap over met één klik. En daarna monitoren wij de markt non-stop — zodat jij nooit meer te veel betaalt.
            </p>
            <div className="flex gap-2.5 flex-wrap">
              <Link
                href="/upload"
                className="inline-flex items-center gap-1.5 px-[26px] py-3 rounded-lg text-[15px] font-semibold bg-bw-green text-white hover:bg-bw-green-strong hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(22,163,74,0.25)] transition-all no-underline"
              >
                Start gratis vergelijking <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
              <Link
                href="/#hoe-werkt-het"
                className="inline-flex items-center gap-1.5 px-[26px] py-3 rounded-lg text-[15px] font-semibold bg-transparent text-bw-blue border-[1.5px] border-bw-blue hover:bg-bw-blue-light transition-all no-underline"
              >
                Hoe werkt het?
              </Link>
            </div>
            <div className="mt-5 flex items-center gap-4 text-[13px] text-bw-text-mid flex-wrap">
              <span><span className="text-[#F59E0B] tracking-wider">★★★★★</span> <strong className="text-bw-text">4.8/5</strong></span>
              <span>·</span>
              <span><strong className="text-bw-text">2.400+</strong> huishoudens geholpen</span>
              <span>·</span>
              <span>Gem. <strong className="text-bw-text">€312/jaar</strong> bespaard</span>
            </div>
          </div>

          {/* Right — Scan Card */}
          <div className="bg-white border border-bw-border rounded-2xl shadow-[var(--shadow-bw),0_16px_48px_rgba(15,33,55,0.06)] overflow-hidden">
            <div className="bg-bw-deep px-5 py-3.5 flex items-center justify-between">
              <span className="text-white text-sm font-semibold">Jouw BespaarWacht overzicht</span>
              <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-bw-green">
                <PulseDot /> 24/7 actief
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-baseline gap-2 mb-0.5">
                <span className="font-heading text-[44px] font-bold text-bw-green leading-none">€ 347</span>
                <span className="text-[15px] text-bw-text-mid">per jaar besparen</span>
              </div>
              <div className="text-[12.5px] text-bw-text-light mb-4">Op basis van 4 verzekeringen · Laatst gecheckt: 2 min geleden</div>

              <div className="flex flex-col gap-1.5">
                {scanPolissen.map((pol) => (
                  <div
                    key={pol.name}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] border transition-all cursor-pointer ${
                      pol.hasSaving
                        ? "bg-bw-green-bg border-[rgba(22,163,74,0.2)] hover:border-bw-green"
                        : "border-bw-border hover:border-bw-blue hover:shadow-[0_2px_8px_rgba(43,108,176,0.08)]"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg shrink-0 ${pol.hasSaving ? "bg-bw-green-bg" : "bg-bw-blue-light"}`}>
                      {pol.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={`text-[13.5px] font-semibold ${pol.hasSaving ? "text-bw-green-strong" : ""}`}>{pol.name}</div>
                      <div className="text-xs text-bw-text-light">{pol.detail}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-flex items-center gap-[3px] px-2 py-[3px] rounded-[5px] text-[11.5px] font-bold ${
                        pol.hasSaving ? "bg-bw-green-bg text-bw-green-strong" : "bg-bw-blue-light text-bw-blue"
                      }`}>
                        {pol.saving}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3.5 text-center">
                <Link
                  href="/upload"
                  className="w-full inline-flex items-center justify-center gap-1.5 py-[11px] rounded-lg text-sm font-semibold bg-bw-green text-white hover:bg-bw-green-strong transition-all no-underline"
                >
                  Bekijk je besparingen <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="py-5 px-6 border-b border-bw-border">
        <div className="max-w-[1140px] mx-auto flex items-center justify-center gap-8 flex-wrap">
          {trustItems.map((item) => (
            <div key={item} className="flex items-center gap-1.5 text-[13px] text-bw-text-mid font-medium">
              <div className="w-4 h-4 rounded-full bg-bw-green-bg text-bw-green flex items-center justify-center shrink-0">
                <CheckIcon className="w-2.5 h-2.5" />
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6" id="hoe-werkt-het">
        <div className="text-center max-w-[560px] mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[1.5px] text-bw-blue mb-2">Hoe het werkt</div>
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-bw-deep tracking-[-0.4px] leading-tight">
            In 4 stappen nooit meer te veel betalen
          </h2>
        </div>
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="p-6 bg-white rounded-2xl border border-bw-border text-center transition-all hover:border-bw-blue hover:shadow-[var(--shadow-bw-hover)] hover:-translate-y-0.5"
            >
              <div className="font-heading text-[28px] font-bold text-bw-blue opacity-[0.18] mb-2">{i + 1}</div>
              <div className="text-[28px] mb-3">{step.emoji}</div>
              <h3 className="text-[15px] font-bold mb-1.5">{step.title}</h3>
              <p className="text-[13.5px] text-bw-text-mid leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* USP SECTION */}
      <section className="py-20 px-6 bg-bw-bg" id="waarom">
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-1 bg-bw-green-bg text-bw-green-strong text-[12.5px] font-bold px-2.5 py-1 rounded-[5px] mb-2.5">
              ✦ Helemaal gratis
            </div>
            <h2 className="font-heading text-[30px] font-bold text-bw-deep leading-tight mb-3.5">
              De enige vergelijker die niet stopt na je overstap
            </h2>
            <p className="text-[15.5px] text-bw-text-mid leading-relaxed mb-5">
              Bij Independer of Overstappen.nl vergelijk je één keer en dan ben je op jezelf aangewezen. Bij BespaarWacht monitoren wij de markt 24/7 en sturen je een alert zodra het ergens goedkoper of beter kan.
            </p>
            <ul className="list-none flex flex-col gap-3 mb-6">
              {[
                { bold: "Continue monitoring", text: "wij scannen dagelijks alle premies en voorwaarden" },
                { bold: "Directe alerts", text: "per e-mail of WhatsApp zodra je kunt besparen" },
                { bold: "Overstap in 1 klik", text: "wij regelen alles, inclusief opzegging" },
                { bold: "100% gratis", text: "de verzekeraar betaalt ons, niet jij" },
              ].map((item) => (
                <li key={item.bold} className="flex gap-2.5 text-[14.5px] leading-relaxed">
                  <div className="w-[22px] h-[22px] rounded-md bg-bw-green-bg text-bw-green flex items-center justify-center shrink-0 mt-0.5">
                    <CheckIcon className="w-3 h-3" />
                  </div>
                  <span>
                    <strong>{item.bold}</strong> — {item.text}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/upload"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-bw-green text-white hover:bg-bw-green-strong transition-all no-underline"
            >
              Start gratis vergelijking <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Comparison table */}
          <div className="bg-white border border-bw-border rounded-2xl shadow-[var(--shadow-bw)] overflow-hidden">
            <div className="bg-bw-navy px-5 py-3.5">
              <span className="text-white text-sm font-semibold">Vergelijking: traditioneel vs. BespaarWacht</span>
            </div>
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="bg-bw-bg">
                  <th className="px-4 py-3 text-left font-semibold border-b border-bw-border"></th>
                  <th className="px-4 py-3 text-center font-semibold text-bw-text-light border-b border-bw-border">Anderen</th>
                  <th className="px-4 py-3 text-center font-bold text-bw-blue border-b border-bw-border">BespaarWacht</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2.5 border-b border-bw-border">{row.label}</td>
                    <td className={`text-center border-b border-bw-border ${row.others ? "text-bw-green" : "text-bw-text-light"}`}>
                      {row.others ? "✓" : "✗"}
                    </td>
                    <td className="text-center border-b border-bw-border text-bw-green font-bold">✓</td>
                  </tr>
                ))}
                <tr className="bg-bw-green-bg">
                  <td className="px-4 py-3 font-bold">Prijs voor jou</td>
                  <td className="text-center font-semibold">Gratis</td>
                  <td className="text-center font-bold text-bw-green-strong">Gratis</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="py-20 px-6" id="verzekeringen">
        <div className="text-center max-w-[560px] mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[1.5px] text-bw-blue mb-2">Verzekeringen vergelijken</div>
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-bw-deep tracking-[-0.4px] leading-tight mb-3">
            Kies je verzekering en vergelijk direct
          </h2>
          <p className="text-[15.5px] text-bw-text-mid leading-relaxed">
            Onafhankelijk, transparant en altijd de goedkoopste bovenaan.
          </p>
        </div>
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <Link
              key={cat.title}
              href="/upload"
              className="bg-white border border-bw-border rounded-2xl p-6 transition-all hover:border-bw-blue hover:shadow-[var(--shadow-bw-hover)] hover:-translate-y-0.5 cursor-pointer no-underline text-bw-text"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[28px]">{cat.emoji}</span>
                {cat.badge && (
                  <span className="inline-flex items-center gap-[3px] px-2 py-[3px] rounded-[5px] text-[11.5px] font-bold bg-bw-green-bg text-bw-green-strong">
                    {cat.badge}
                  </span>
                )}
              </div>
              <h3 className="text-base font-bold mb-1">{cat.title}</h3>
              <p className="text-[13.5px] text-bw-text-mid leading-snug mb-3">{cat.desc}</p>
              <span className="text-[13.5px] font-semibold text-bw-blue inline-flex items-center gap-1">
                Vergelijk nu <ArrowRightIcon className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-20 px-6 bg-bw-bg" id="reviews">
        <div className="text-center max-w-[560px] mx-auto mb-12">
          <div className="text-xs font-bold uppercase tracking-[1.5px] text-bw-blue mb-2">Reviews</div>
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-bw-deep tracking-[-0.4px] leading-tight">
            Dit zeggen onze gebruikers
          </h2>
        </div>
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-4">
          {reviews.map((review) => (
            <div key={review.name} className="bg-white rounded-2xl p-[22px] border border-bw-border">
              <div className="text-[#F59E0B] text-[13px] mb-2.5 tracking-wider">
                {"★".repeat(review.stars)}
              </div>
              <div className="text-sm leading-relaxed text-bw-text mb-3.5">{review.text}</div>
              <div className="flex items-center gap-2">
                <div className="w-[30px] h-[30px] rounded-full bg-bw-blue-light text-bw-blue flex items-center justify-center font-bold text-xs">
                  {review.initials}
                </div>
                <div>
                  <div className="text-[13px] font-semibold">{review.name}</div>
                  <div className="text-[11.5px] text-bw-text-light">{review.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-bw-deep relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(43,108,176,0.12),transparent_70%)]" />
        <div className="max-w-[580px] mx-auto text-center relative z-10">
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-white mb-3 leading-tight">
            Betaal jij te veel voor je verzekeringen?
          </h2>
          <p className="text-[15.5px] text-white/60 mb-7 leading-relaxed">
            Vergelijk gratis en laat BespaarWacht de markt 24/7 voor je in de gaten houden. Altijd optimaal verzekerd.
          </p>
          <Link
            href="/upload"
            className="inline-flex items-center gap-1.5 px-[30px] py-[13px] rounded-lg text-[15px] font-semibold bg-white text-bw-deep shadow-[0_1px_4px_rgba(0,0,0,0.08)] hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] transition-all no-underline"
          >
            Start gratis vergelijking <ArrowRightIcon className="w-3.5 h-3.5" />
          </Link>
          <div className="mt-3.5 text-[12.5px] text-white/35">
            Geen kosten, geen abonnement. Wij ontvangen een vergoeding van de verzekeraar.
          </div>
        </div>
      </section>
    </>
  );
}
