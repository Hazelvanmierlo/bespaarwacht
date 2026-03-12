import Link from "next/link";
import { ArrowRightIcon, CheckIcon, PulseDot, ShieldDownIcon, Search, BarChart3, CircleCheckBig, ShieldCheck, HeartPulse, Car, Home, Plane, Zap, Flame, Sun } from "@/components/icons";

const trustItems = [
  "Gratis voor consumenten",
  "Onafhankelijk",
  "Goedkoopste bovenaan",
  "Wij regelen de overstap",
  "AVG-compliant",
];

const steps = [
  { num: "01", icon: <Search className="w-6 h-6 text-bw-blue" />, title: "Upload", desc: "Upload je polis of energierekening. Of vul je gegevens in via WhatsApp." },
  { num: "02", icon: <BarChart3 className="w-6 h-6 text-bw-blue" />, title: "Vergelijk", desc: "Zie direct de beste opties, gesorteerd op prijs en kwaliteit. Helder op een rij." },
  { num: "03", icon: <CircleCheckBig className="w-6 h-6 text-bw-blue" />, title: "Stap over", desc: "Sluit direct af. Wij regelen de overstap en opzegging bij je oude aanbieder." },
  { num: "04", icon: <ShieldCheck className="w-6 h-6 text-bw-blue" />, title: "24/7 bewaking", desc: "Wij monitoren de markt non-stop. Wordt het ergens beter? Je krijgt direct een alert." },
];

const insuranceCategories = [
  { emoji: <HeartPulse className="w-6 h-6 text-bw-blue" />, title: "Zorgverzekering", desc: "Vergelijk alle Nederlandse zorgverzekeraars op premie, dekking en klanttevredenheid.", badge: "Bespaar gem. €180/jr", href: "/upload?type=verzekering" },
  { emoji: <Car className="w-6 h-6 text-bw-blue" />, title: "Autoverzekering", desc: "WA, beperkt casco of allrisk. Vergelijk en stap direct over.", badge: "Bespaar gem. €290/jr", href: "/upload?type=verzekering" },
  { emoji: <Home className="w-6 h-6 text-bw-blue" />, title: "Woonverzekering", desc: "Inboedel, opstal of combinatie. Bescherm je huis tegen de beste prijs.", badge: "Bespaar gem. €145/jr", href: "/upload?type=verzekering" },
  { emoji: <Plane className="w-6 h-6 text-bw-blue" />, title: "Reisverzekering", desc: "Doorlopend of per reis. Vergelijk op dekking en medische kosten.", badge: null, href: "/upload?type=verzekering" },
  { emoji: <ShieldCheck className="w-6 h-6 text-bw-blue" />, title: "Rechtsbijstand", desc: "Juridische hulp wanneer je het nodig hebt.", badge: null, href: "/upload?type=verzekering" },
  { emoji: <ShieldCheck className="w-6 h-6 text-bw-blue" />, title: "Aansprakelijkheid", desc: "Onmisbaar voor elk huishouden. Al vanaf een paar euro per maand.", badge: null, href: "/upload?type=verzekering" },
];

const energieCategories = [
  { emoji: <Zap className="w-6 h-6 text-bw-green" />, title: "Stroom vergelijken", desc: "Vergelijk alle energieleveranciers. Vast, variabel of dynamisch — vind de laagste prijs.", badge: "Bespaar gem. €480/jr", href: "/upload?type=energie" },
  { emoji: <Flame className="w-6 h-6 text-bw-green" />, title: "Gas vergelijken", desc: "Betaal je te veel voor gas? Upload je jaaroverzicht en ontdek je bespaarpotentieel.", badge: "Bespaar gem. €320/jr", href: "/upload?type=energie" },
  { emoji: <Sun className="w-6 h-6 text-bw-green" />, title: "Stroom + teruglevering", desc: "Zonnepanelen? Vergelijk op teruglevertarief én leveringskosten.", badge: null, href: "/upload?type=energie" },
];

const reviews = [
  { stars: 5, text: "\"Ik wist niet dat ik €340 per jaar te veel betaalde voor mijn autoverzekering. DeVerzekeringsAgent ontdekte het en regelde de overstap binnen een dag.\"", initials: "MV", name: "Marieke V.", loc: "Utrecht" },
  { stars: 5, text: "\"Vorige maand kreeg ik een alert dat mijn zorgpremie omlaag kon. Weer €14 per maand bespaard! En het kostte me niks.\"", initials: "JB", name: "Jeroen B.", loc: "Amersfoort" },
  { stars: 5, text: "\"Eindelijk een vergelijker die niet stopt na het afsluiten. Ik hoef nergens meer aan te denken — DeVerzekeringsAgent houdt alles in de gaten.\"", initials: "SH", name: "Sandra H.", loc: "Eindhoven" },
];

const comparisonRows = [
  { label: "Vergelijken op prijs", others: true, bw: true },
  { label: "Voorwaarden vergelijken", others: false, bw: true },
  { label: "Overstap regelen", others: true, bw: true },
  { label: "24/7 monitoring", others: false, bw: true },
  { label: "Alerts bij betere optie", others: false, bw: true },
  { label: "Energie + verzekeringen", others: false, bw: true },
];

const scanPolissen = [
  { emoji: <HeartPulse className="w-5 h-5 text-bw-green" />, name: "Zorgverzekering", detail: "CZ → VGZ · betere dekking", saving: "↓ €14/mnd", hasSaving: true },
  { emoji: <Car className="w-5 h-5 text-bw-green" />, name: "Autoverzekering", detail: "Centraal Beheer → FBTO", saving: "↓ €11/mnd", hasSaving: true },
  { emoji: <Zap className="w-5 h-5 text-bw-green" />, name: "Energiecontract", detail: "Vattenfall → Budget Energie", saving: "↓ €38/mnd", hasSaving: true },
  { emoji: <Home className="w-5 h-5 text-bw-blue" />, name: "Woonverzekering", detail: "Interpolis · scherpe premie", saving: "✓ Goed", hasSaving: false },
];

export default function HomePage() {
  return (
    <>
      {/* HERO */}
      <section className="bg-hero-gradient relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.35]" />
        <div className="relative py-16 md:py-24 px-6">
          <div className="max-w-[1140px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-16 items-center">
            {/* Left */}
            <div>
              <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm text-bw-blue pl-2 pr-3 py-1.5 rounded-full text-[12.5px] font-semibold mb-5 shadow-[0_1px_4px_rgba(26,86,219,0.1)] border border-bw-blue-light">
                <span className="w-5 h-5 rounded-full bg-bw-blue-light flex items-center justify-center">
                  <CheckIcon className="w-3 h-3 text-bw-blue" />
                </span>
                100% gratis &amp; onafhankelijk
              </div>
              <h1 className="font-heading text-[clamp(32px,3.8vw,48px)] leading-[1.1] font-bold text-bw-deep tracking-[-1px] mb-4">
                Vergelijk verzekeringen{" "}
                <span className="text-bw-blue">én energie.</span>{" "}
                <span className="text-bw-text-mid font-normal text-[clamp(24px,2.8vw,36px)]">Wij houden de markt 24/7 in de gaten.</span>
              </h1>
              <p className="text-[16.5px] leading-relaxed text-bw-text-mid max-w-[460px] mb-7">
                Upload je polis of energierekening. Wij vinden direct een betere deal — en monitoren daarna de markt non-stop zodat jij nooit meer te veel betaalt.
              </p>
              <div className="flex gap-3 flex-wrap">
                <Link
                  href="/upload"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-bold bg-bw-orange text-white hover:bg-bw-orange-strong hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(249,115,22,0.3)] transition-all no-underline"
                >
                  Start gratis vergelijking <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <Link
                  href="/#hoe-werkt-het"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-semibold bg-white text-bw-deep border border-bw-border hover:bg-bw-bg hover:border-[#94A3B8] hover:shadow-[var(--shadow-bw-card)] transition-all no-underline"
                >
                  Hoe werkt het?
                </Link>
              </div>
              <div className="mt-6 flex items-center gap-4 text-[13px] text-bw-text-mid flex-wrap">
                <span className="flex items-center gap-1">
                  <span className="text-[#F59E0B] tracking-wider text-sm">★★★★★</span>
                  <strong className="text-bw-text">4.8/5</strong>
                </span>
                <span className="w-1 h-1 rounded-full bg-bw-border" />
                <span><strong className="text-bw-text">2.400+</strong> huishoudens geholpen</span>
                <span className="w-1 h-1 rounded-full bg-bw-border" />
                <span>Gem. <strong className="text-bw-orange">€312/jaar</strong> bespaard</span>
              </div>
            </div>

            {/* Right — Scan Card */}
            <div className="bg-white rounded-2xl shadow-[var(--shadow-bw-elevated)] overflow-hidden border border-bw-border/50">
              <div className="bg-gradient-to-r from-bw-deep to-bw-navy px-5 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <ShieldDownIcon />
                  </div>
                  <span className="text-white text-sm font-semibold">Jouw overzicht</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-bw-green bg-white/10 px-2.5 py-1 rounded-full">
                  <PulseDot /> 24/7 actief
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-heading text-[48px] font-bold text-bw-green leading-none tracking-[-1px]">€ 487</span>
                  <span className="text-[14px] text-bw-text-mid">per jaar besparen</span>
                </div>
                <div className="text-[12px] text-bw-text-light mb-5">Op basis van 4 polissen + energiecontract · Laatst gecheckt: 2 min geleden</div>

                <div className="flex flex-col gap-2">
                  {scanPolissen.map((pol) => (
                    <div
                      key={pol.name}
                      className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all cursor-pointer ${
                        pol.hasSaving
                          ? "bg-bw-green-bg/50 border-[rgba(22,163,74,0.15)] hover:border-bw-green hover:bg-bw-green-bg"
                          : "bg-bw-bg/50 border-bw-border hover:border-bw-blue hover:shadow-[0_2px_8px_rgba(26,86,219,0.08)]"
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${pol.hasSaving ? "bg-bw-green-bg" : "bg-bw-blue-light"}`}>
                        {pol.emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[13.5px] font-semibold ${pol.hasSaving ? "text-bw-green-strong" : "text-bw-deep"}`}>{pol.name}</div>
                        <div className="text-[11.5px] text-bw-text-light">{pol.detail}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-flex items-center gap-[3px] px-2.5 py-1 rounded-lg text-[11.5px] font-bold ${
                          pol.hasSaving ? "bg-bw-green text-white" : "bg-bw-blue-light text-bw-blue"
                        }`}>
                          {pol.saving}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <Link
                    href="/upload"
                    className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold bg-bw-orange text-white hover:bg-bw-orange-strong hover:shadow-[0_4px_12px_rgba(249,115,22,0.25)] transition-all no-underline"
                  >
                    Bekijk je besparingen <ArrowRightIcon className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <div className="bg-trust-gradient py-4 sm:py-5 px-4 sm:px-6 border-y border-bw-blue-light">
        <div className="max-w-[1140px] mx-auto flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
          {trustItems.map((item) => (
            <div key={item} className="flex items-center gap-2 text-[13px] text-bw-blue font-medium">
              <div className="w-5 h-5 rounded-full bg-white text-bw-blue flex items-center justify-center shrink-0 shadow-[0_1px_3px_rgba(26,86,219,0.12)]">
                <CheckIcon className="w-3 h-3" />
              </div>
              {item}
            </div>
          ))}
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="py-20 px-6 bg-white" id="hoe-werkt-het">
        <div className="text-center max-w-[560px] mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[1.5px] text-bw-blue bg-bw-blue-light px-3 py-1.5 rounded-full mb-3">Hoe het werkt</div>
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-bw-deep tracking-[-0.4px] leading-tight">
            In 4 stappen nooit meer te veel betalen
          </h2>
        </div>
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step) => (
            <div
              key={step.title}
              className="relative p-6 bg-white rounded-2xl border border-bw-border card-elevated text-center group"
            >
              <div className="text-[11px] font-bold text-bw-blue/30 uppercase tracking-[2px] mb-3">{step.num}</div>
              <div className="w-14 h-14 rounded-2xl bg-bw-blue-light flex items-center justify-center mx-auto mb-4 group-hover:scale-105 transition-transform">
                {step.icon}
              </div>
              <h3 className="text-[15px] font-bold text-bw-deep mb-2">{step.title}</h3>
              <p className="text-[13.5px] text-bw-text-mid leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VERZEKERINGEN CATEGORIES */}
      <section className="py-20 px-6 bg-section-alt" id="verzekeringen">
        <div className="text-center max-w-[560px] mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[1.5px] text-bw-blue bg-bw-blue-light px-3 py-1.5 rounded-full mb-3">Verzekeringen</div>
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-bw-deep tracking-[-0.4px] leading-tight mb-3">
            Vergelijk alle verzekeringen op één plek
          </h2>
          <p className="text-[15.5px] text-bw-text-mid leading-relaxed">
            Onafhankelijk, transparant en altijd de goedkoopste bovenaan.
          </p>
        </div>
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {insuranceCategories.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="bg-white border border-bw-border rounded-2xl p-6 card-elevated cursor-pointer no-underline text-bw-text group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-bw-blue-light flex items-center justify-center group-hover:scale-105 transition-transform">
                  {cat.emoji}
                </div>
                {cat.badge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-bw-green-bg text-bw-green-strong">
                    {cat.badge}
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-bold text-bw-deep mb-1.5">{cat.title}</h3>
              <p className="text-[13px] text-bw-text-mid leading-snug mb-4">{cat.desc}</p>
              <span className="text-[13px] font-semibold text-bw-orange inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Vergelijk nu <ArrowRightIcon className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ENERGIE CATEGORIES */}
      <section className="py-20 px-6 bg-white" id="energie">
        <div className="text-center max-w-[560px] mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[1.5px] text-bw-green-strong bg-bw-green-bg px-3 py-1.5 rounded-full mb-3">Energie</div>
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-bw-deep tracking-[-0.4px] leading-tight mb-3">
            Vergelijk energieleveranciers en bespaar honderden euro&apos;s
          </h2>
          <p className="text-[15.5px] text-bw-text-mid leading-relaxed">
            Upload je jaaroverzicht en wij vergelijken alle leveranciers. Stroom, gas én teruglevering.
          </p>
        </div>
        <div className="max-w-[900px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {energieCategories.map((cat) => (
            <Link
              key={cat.title}
              href={cat.href}
              className="bg-white border border-bw-border rounded-2xl p-6 card-elevated cursor-pointer no-underline text-bw-text group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-12 h-12 rounded-2xl bg-bw-green-bg flex items-center justify-center group-hover:scale-105 transition-transform">
                  {cat.emoji}
                </div>
                {cat.badge && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-bw-green-bg text-bw-green-strong">
                    {cat.badge}
                  </span>
                )}
              </div>
              <h3 className="text-[15px] font-bold text-bw-deep mb-1.5">{cat.title}</h3>
              <p className="text-[13px] text-bw-text-mid leading-snug mb-4">{cat.desc}</p>
              <span className="text-[13px] font-semibold text-bw-orange inline-flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                Vergelijk nu <ArrowRightIcon className="w-3 h-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* USP / COMPARISON SECTION */}
      <section className="py-20 px-6 bg-section-alt" id="waarom">
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-bw-blue-light text-bw-blue text-[12px] font-bold px-3 py-1.5 rounded-full mb-3">
              <CheckIcon className="w-3 h-3" /> Helemaal gratis
            </div>
            <h2 className="font-heading text-[clamp(26px,2.8vw,34px)] font-bold text-bw-deep leading-tight mb-4">
              De enige vergelijker die niet stopt na je overstap
            </h2>
            <p className="text-[15.5px] text-bw-text-mid leading-relaxed mb-6">
              Bij Independer of Overstappen.nl vergelijk je één keer en dan ben je op jezelf aangewezen. Bij DeVerzekeringsAgent monitoren wij de markt 24/7 — voor zowel verzekeringen als energie.
            </p>
            <ul className="list-none flex flex-col gap-4 mb-7">
              {[
                { bold: "Continue monitoring", text: "wij scannen dagelijks alle premies, tarieven en voorwaarden" },
                { bold: "Directe alerts", text: "per e-mail of WhatsApp zodra je kunt besparen" },
                { bold: "Overstap in 1 klik", text: "wij regelen alles, inclusief opzegging" },
                { bold: "Verzekeringen + energie", text: "alles op één plek, één overzicht" },
                { bold: "100% gratis", text: "de aanbieder betaalt ons, niet jij" },
              ].map((item) => (
                <li key={item.bold} className="flex gap-3 text-[14.5px] leading-relaxed">
                  <div className="w-6 h-6 rounded-lg bg-bw-blue text-white flex items-center justify-center shrink-0 mt-0.5">
                    <CheckIcon className="w-3 h-3" />
                  </div>
                  <span>
                    <strong className="text-bw-deep">{item.bold}</strong> — {item.text}
                  </span>
                </li>
              ))}
            </ul>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[14px] font-bold bg-bw-orange text-white hover:bg-bw-orange-strong hover:shadow-[0_4px_12px_rgba(249,115,22,0.25)] transition-all no-underline"
            >
              Start gratis vergelijking <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Comparison table */}
          <div className="bg-white rounded-2xl shadow-[var(--shadow-bw-elevated)] overflow-hidden border border-bw-border/50">
            <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px] sm:text-[13.5px]">
              <thead>
                <tr>
                  <th className="px-4 sm:px-5 py-4 text-left font-semibold border-b border-bw-border text-bw-text-mid text-[12px] uppercase tracking-[0.5px]"></th>
                  <th className="px-3 sm:px-4 py-4 text-center border-b border-bw-border w-[110px] sm:w-[130px]">
                    <div className="text-[11px] font-semibold text-bw-text-light uppercase tracking-[0.5px]">Anderen</div>
                    <div className="text-[9px] sm:text-[10px] text-bw-text-light font-normal mt-0.5 leading-tight">Independer, Pricewise, etc.</div>
                  </th>
                  <th className="px-3 sm:px-4 py-4 text-center border-b border-bw-border bg-[#F0FDF4] w-[110px] sm:w-[130px] relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-bw-green" />
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-bw-green-bg border border-bw-green/20 mb-1">
                      <span className="text-[9px] sm:text-[10px] font-bold text-bw-green">AANBEVOLEN</span>
                    </div>
                    <div className="text-[11px] font-bold text-bw-deep">DeVerzekerings&shy;Agent</div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 sm:px-5 py-3.5 border-b border-bw-border font-medium text-bw-deep">{row.label}</td>
                    <td className="text-center border-b border-bw-border">
                      {row.others ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bw-green-bg">
                          <CircleCheckBig className="w-3.5 h-3.5 text-bw-green" />
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#FEF2F2]">
                          <span className="text-[12px] font-bold text-[#DC2626]">✗</span>
                        </span>
                      )}
                    </td>
                    <td className="text-center border-b border-bw-border bg-[#F0FDF4]">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bw-green-bg">
                        <CircleCheckBig className="w-3.5 h-3.5 text-bw-green" />
                      </span>
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 sm:px-5 py-3.5 font-bold text-bw-deep">Prijs</td>
                  <td className="text-center font-semibold text-bw-text-mid">Gratis</td>
                  <td className="text-center bg-[#F0FDF4] py-3.5">
                    <span className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-bw-green text-white text-[12px] font-bold shadow-[0_2px_6px_rgba(22,163,74,0.25)]">Gratis</span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-20 px-6 bg-white" id="reviews">
        <div className="text-center max-w-[560px] mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[1.5px] text-[#F59E0B] bg-[#FFFBEB] px-3 py-1.5 rounded-full mb-3">
            <span className="text-sm">★</span> Reviews
          </div>
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-bw-deep tracking-[-0.4px] leading-tight mb-2">
            Dit zeggen onze gebruikers
          </h2>
          <div className="flex items-center justify-center gap-2 text-[14px] text-bw-text-mid">
            <span className="text-[#F59E0B] tracking-wider">★★★★★</span>
            <strong className="text-bw-deep">4.8 uit 5</strong> · op basis van 340+ reviews
          </div>
        </div>
        <div className="max-w-[1140px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {reviews.map((review) => (
            <div key={review.name} className="bg-white rounded-2xl p-6 border border-bw-border card-elevated">
              <div className="text-[#F59E0B] text-[14px] mb-3 tracking-wider">
                {"★".repeat(review.stars)}
              </div>
              <div className="text-[14px] leading-relaxed text-bw-text mb-5">{review.text}</div>
              <div className="flex items-center gap-3 pt-4 border-t border-bw-border">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-bw-blue-light to-bw-blue/20 text-bw-blue flex items-center justify-center font-bold text-xs">
                  {review.initials}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-bw-deep">{review.name}</div>
                  <div className="text-[11.5px] text-bw-text-light">{review.loc}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-gradient-to-br from-bw-deep via-bw-navy to-bw-deep relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full bg-[radial-gradient(circle,rgba(26,86,219,0.15),transparent_70%)]" />
          <div className="absolute -bottom-32 -left-32 w-[300px] h-[300px] rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.1),transparent_70%)]" />
        </div>
        <div className="max-w-[620px] mx-auto text-center relative z-10">
          <h2 className="font-heading text-[clamp(24px,2.8vw,36px)] font-bold text-white mb-4 leading-tight">
            Betaal jij te veel voor je verzekeringen of energie?
          </h2>
          <p className="text-[15.5px] text-white/60 mb-8 leading-relaxed">
            Vergelijk gratis en laat DeVerzekeringsAgent de markt 24/7 voor je in de gaten houden. Altijd optimaal verzekerd, altijd het beste energietarief.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-bold bg-bw-orange text-white hover:bg-bw-orange-strong hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(249,115,22,0.35)] transition-all no-underline"
            >
              Start gratis vergelijking <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
          <div className="mt-4 text-[12.5px] text-white/35">
            Geen kosten, geen abonnement. Wij ontvangen een vergoeding van de aanbieder.
          </div>
        </div>
      </section>
    </>
  );
}
