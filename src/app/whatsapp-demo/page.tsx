"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@/components/icons";

const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '14155238886';
const WA_JOIN = process.env.NEXT_PUBLIC_WHATSAPP_JOIN_CODE || '';
const WA_TEXT = WA_JOIN || 'Hoi';

/* ── Chat message types ── */
interface ChatMsg {
  from: "bot" | "user";
  text: string;
  delay: number; // ms before showing
  buttons?: string[];
}

/* ── Demo script: the full conversation flow ── */
const SCRIPT: ChatMsg[] = [
  {
    from: "bot",
    delay: 600,
    text: "Hoi! 👋 Ik ben de DeVerzekeringsAgent energie-assistent.\n\nStuur me je jaaroverzicht of energierekening (PDF of foto) en ik vergelijk direct 18 leveranciers voor je.\n\nGeen account nodig. Overstappen? Alleen IBAN + e-mail — wij regelen de rest.",
  },
  {
    from: "user",
    delay: 2000,
    text: "📄 Jaaroverzicht_2025_Vattenfall.pdf",
  },
  {
    from: "bot",
    delay: 1500,
    text: "⏳ Ik analyseer je document...",
  },
  {
    from: "bot",
    delay: 2500,
    text: "✅ Dit heb ik gevonden:\n\n🏢 Leverancier: Vattenfall\n⚡ Stroom: 2.450 kWh dal / 1.680 kWh piek\n🔥 Gas: 1.120 m³\n☀️ Teruglevering: 890 kWh\n📍 EAN: 871234567890123456\n\n👤 Jan de Vries\n📫 Kerkstraat 12, 1234 AB Amsterdam",
    buttons: ["✅ Klopt!", "✏️ Aanpassen"],
  },
  {
    from: "user",
    delay: 2000,
    text: "✅ Klopt!",
  },
  {
    from: "bot",
    delay: 1200,
    text: "🔍 Even vergelijken met 18 leveranciers...",
  },
  {
    from: "bot",
    delay: 2800,
    text: "📊 Jouw vergelijking:\n\n🥇 *Frank Energie* — €1.847/jaar\n     Variabel · 100% groen\n     Je bespaart €342/jaar (€28/mnd)\n\n🥈 *Budget Energie* — €1.891/jaar\n     1 jaar vast · grijs\n     Je bespaart €298/jaar (€25/mnd)\n\n🥉 *Tibber* — €1.923/jaar\n     Dynamisch · 100% groen\n     Je bespaart €266/jaar (€22/mnd)\n\n📌 Huidig (Vattenfall): €2.189/jaar",
    buttons: ["🔄 Overstappen", "📋 Alle 18 zien"],
  },
  {
    from: "user",
    delay: 2500,
    text: "🔄 Overstappen",
  },
  {
    from: "bot",
    delay: 800,
    text: "Top! Naar welke leverancier wil je overstappen?\n\n1️⃣ Frank Energie — €1.847/jaar\n2️⃣ Budget Energie — €1.891/jaar\n3️⃣ Tibber — €1.923/jaar",
    buttons: ["1️⃣ Frank", "2️⃣ Budget", "3️⃣ Tibber"],
  },
  {
    from: "user",
    delay: 1800,
    text: "1️⃣ Frank",
  },
  {
    from: "bot",
    delay: 1000,
    text: "Goed, Frank Energie dus! 🎉\n\nVan je rekening heb ik al:\n✅ Naam: Jan de Vries\n✅ Adres: Kerkstraat 12, 1234 AB Amsterdam\n✅ EAN: 871234567890123456\n\nIk heb nog nodig:\n1️⃣ Je IBAN (bankrekeningnummer)\n2️⃣ Je e-mailadres",
  },
  {
    from: "user",
    delay: 2500,
    text: "NL91 ABNA 0417 1643 00",
  },
  {
    from: "bot",
    delay: 800,
    text: "✅ IBAN: NL91ABNA0417164300 (ABN AMRO)\n\nNu nog je e-mailadres:",
  },
  {
    from: "user",
    delay: 2000,
    text: "jan@email.nl",
  },
  {
    from: "bot",
    delay: 1200,
    text: "📋 Overstap bevestigen:\n\n🏢 Naar: Frank Energie (variabel)\n💰 Verwacht: €1.847/jaar\n💸 Besparing: €342/jaar\n\n👤 Jan de Vries\n📫 Kerkstraat 12, 1234 AB Amsterdam\n🏦 NL91ABNA0417164300\n📧 jan@email.nl\n⚡ EAN: 871234567890123456\n\nAlles correct?",
    buttons: ["✅ Bevestigen", "❌ Annuleren"],
  },
  {
    from: "user",
    delay: 2000,
    text: "✅ Bevestigen",
  },
  {
    from: "bot",
    delay: 1500,
    text: "🎉 Je overstap naar Frank Energie is aangevraagd!\n\n📧 Je ontvangt een bevestigingsmail op jan@email.nl\n📅 De overstap gaat in per je volgende contractdatum\n⚡ Je hoeft zelf niets te regelen — Frank Energie neemt contact op met Vattenfall\n\nBedankt dat je DeVerzekeringsAgent hebt gebruikt! 💚\nHeb je nog vragen? Stuur gerust een bericht.",
  },
];

/* ── Typing indicator ── */
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      <div className="w-2 h-2 rounded-full bg-bw-text-light animate-bounce" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 rounded-full bg-bw-text-light animate-bounce" style={{ animationDelay: "150ms" }} />
      <div className="w-2 h-2 rounded-full bg-bw-text-light animate-bounce" style={{ animationDelay: "300ms" }} />
    </div>
  );
}

/* ── Single chat bubble ── */
function ChatBubble({ msg }: { msg: ChatMsg }) {
  const isBot = msg.from === "bot";
  const isFile = msg.text.includes("📄") && msg.from === "user";

  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"} animate-fadeUp`}>
      <div
        className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5 text-[14px] leading-relaxed whitespace-pre-line ${
          isBot
            ? "bg-white text-bw-text border border-bw-border rounded-tl-md"
            : "bg-[#DCF8C6] text-bw-deep rounded-tr-md"
        } ${isFile ? "border-2 border-dashed border-[#25D366]/40" : ""}`}
      >
        {msg.text.split("\n").map((line, i) => {
          // Bold text between * *
          const parts = line.split(/\*([^*]+)\*/g);
          return (
            <span key={i}>
              {i > 0 && <br />}
              {parts.map((part, j) =>
                j % 2 === 1 ? (
                  <strong key={j}>{part}</strong>
                ) : (
                  <span key={j}>{part}</span>
                ),
              )}
            </span>
          );
        })}
        {msg.buttons && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-bw-border/50">
            {msg.buttons.map((btn) => (
              <span
                key={btn}
                className="inline-block px-3 py-1.5 rounded-full text-xs font-semibold bg-bw-blue-light text-bw-blue border border-bw-blue/20"
              >
                {btn}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ── */
export default function WhatsAppDemoPage() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typing, setTyping] = useState(false);
  const [started, setStarted] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTo({ top: chatRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [visibleCount, typing]);

  // Play the script
  useEffect(() => {
    if (!started || visibleCount >= SCRIPT.length) return;

    const next = SCRIPT[visibleCount];
    setTyping(true);

    const timer = setTimeout(() => {
      setTyping(false);
      setVisibleCount((c) => c + 1);
    }, next.delay);

    return () => clearTimeout(timer);
  }, [started, visibleCount]);

  function restart() {
    setVisibleCount(0);
    setTyping(false);
    setStarted(false);
  }

  const done = visibleCount >= SCRIPT.length;

  return (
    <>
      {/* Hero */}
      <section className="py-16 md:py-20 px-6 bg-white">
        <div className="max-w-[700px] mx-auto text-center">
          <div className="inline-flex items-center gap-[5px] bg-[#25D366]/10 text-[#128C7E] px-[11px] py-1 rounded-md text-[12.5px] font-semibold mb-4">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp energie-assistent
          </div>
          <h1 className="font-heading text-[clamp(28px,3.2vw,42px)] leading-[1.15] font-bold text-bw-deep tracking-[-0.6px] mb-3">
            Bespaar op energie via{" "}
            <span className="text-[#25D366]">WhatsApp</span>
          </h1>
          <p className="text-[16px] leading-relaxed text-bw-text-mid max-w-[520px] mx-auto mb-2">
            Stuur je energierekening, ontvang binnen 10 seconden een vergelijking
            van 18 leveranciers. Overstappen? Alleen IBAN + e-mail.
          </p>
        </div>
      </section>

      {/* Chat demo */}
      <section className="pb-16 px-6">
        <div className="max-w-[520px] mx-auto">
          {/* Phone frame */}
          <div className="rounded-[2rem] border-[3px] border-bw-border bg-[#ECE5DD] shadow-[var(--shadow-bw-hover)] overflow-hidden">
            {/* WhatsApp header bar */}
            <div className="bg-[#075E54] text-white px-5 py-3.5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-bw-blue flex items-center justify-center shrink-0">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-sm">DeVerzekeringsAgent</p>
                <p className="text-[11px] text-white/70">Energie-assistent</p>
              </div>
            </div>

            {/* Chat area */}
            <div
              ref={chatRef}
              className="h-[480px] overflow-y-auto px-3 py-4 space-y-2.5 scroll-smooth"
            >
              {SCRIPT.slice(0, visibleCount).map((msg, i) => (
                <ChatBubble key={i} msg={msg} />
              ))}
              {typing && (
                <div className="flex justify-start animate-fadeUp">
                  <div className="bg-white rounded-2xl rounded-tl-md border border-bw-border">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="bg-[#F0F0F0] px-3 py-2.5 flex items-center gap-2">
              {!started ? (
                <button
                  onClick={() => setStarted(true)}
                  className="w-full py-2.5 rounded-full text-sm font-semibold bg-[#25D366] text-white hover:bg-[#128C7E] transition-all cursor-pointer"
                >
                  ▶ Start demo
                </button>
              ) : done ? (
                <button
                  onClick={restart}
                  className="w-full py-2.5 rounded-full text-sm font-semibold bg-bw-deep text-white hover:bg-bw-navy transition-all cursor-pointer"
                >
                  ↻ Opnieuw bekijken
                </button>
              ) : (
                <div className="w-full py-2 text-center text-xs text-bw-text-light">
                  Gesprek loopt...
                </div>
              )}
            </div>
          </div>

          {/* CTA under phone */}
          <div className="mt-8 text-center space-y-4">
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(WA_TEXT)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#128C7E] text-white font-bold py-3.5 px-7 rounded-xl text-[15px] transition-all hover:scale-105 shadow-lg no-underline"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Start op WhatsApp
            </a>
            <p className="text-xs text-bw-text-light">
              Of bekijk de{" "}
              <Link href="/energie-analyse" className="text-bw-blue hover:underline">
                website-versie
              </Link>{" "}
              waar je zelf een PDF uploadt.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-bw-bg">
        <div className="max-w-[700px] mx-auto text-center">
          <h2 className="font-heading text-[clamp(20px,2.4vw,28px)] font-bold text-bw-deep mb-8">
            Zo werkt het
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                icon: "📄",
                title: "Stuur je rekening",
                desc: "Maak een foto of stuur de PDF van je jaaroverzicht via WhatsApp.",
              },
              {
                icon: "⚡",
                title: "Directe vergelijking",
                desc: "Binnen 10 seconden vergelijken we 18 leveranciers met 30+ contracten.",
              },
              {
                icon: "✅",
                title: "Overstappen",
                desc: "Alleen IBAN + e-mail nodig. Naam, adres en EAN halen we uit je rekening.",
              },
            ].map((step) => (
              <div
                key={step.title}
                className="bg-white rounded-2xl border border-bw-border p-6 text-center"
              >
                <span className="text-3xl mb-3 block">{step.icon}</span>
                <h3 className="text-[15px] font-bold text-bw-deep mb-1.5">
                  {step.title}
                </h3>
                <p className="text-[13px] text-bw-text-mid leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
