"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// ─── Chat message types ──────────────────────────────────────────────────────

type Message = {
  id: number;
  sender: "klant" | "systeem" | "ai";
  text: string;
  delay: number; // ms before this message appears
  typing?: number; // ms of "typing" animation
  highlight?: boolean;
  document?: boolean; // show as document bubble
  code?: boolean; // show as code/anonymized view
};

const CHAT_MESSAGES: Message[] = [
  {
    id: 1,
    sender: "klant",
    text: "Hoi! Ik wil mijn inboedelverzekering vergelijken. Hier is mijn polis 📎",
    delay: 600,
    typing: 800,
  },
  {
    id: 2,
    sender: "klant",
    text: "Inboedelverzekering_OHRA.pdf",
    delay: 400,
    document: true,
  },
  {
    id: 3,
    sender: "systeem",
    text: "📥 Polis ontvangen! We gaan je document nu veilig verwerken...",
    delay: 1200,
    typing: 600,
  },
  {
    id: 4,
    sender: "systeem",
    text: "🔍 Stap 1: Tekst uitlezen\nWe lezen je polis uit op onze eigen beveiligde server in de EU. Je document verlaat Europa nooit.",
    delay: 2000,
    typing: 400,
  },
  {
    id: 5,
    sender: "systeem",
    text: "🛡️ Stap 2: Persoonsgegevens herkennen\nWe vonden 8 persoonlijke gegevens:\n• Naam: C.J.J. Gobel\n• Adres: Amsteldijk Zuid 107\n• Postcode: 1186VH\n• IBAN: NL98 INGB ••••\n• Geboortedatum: ••-••-••••\n• Polisnummer: 6494572-•••",
    delay: 2500,
    typing: 600,
  },
  {
    id: 6,
    sender: "systeem",
    text: "🔒 Stap 3: Versleuteld opslaan\nJe persoonsgegevens worden AES-256 versleuteld opgeslagen in je profiel. Alleen jij hebt toegang.",
    delay: 2000,
    typing: 400,
    highlight: true,
  },
  {
    id: 7,
    sender: "systeem",
    text: "📝 Stap 4: Document anonimiseren\nAlle persoonlijke gegevens worden vervangen door tokens:",
    delay: 1800,
    typing: 400,
  },
  {
    id: 8,
    sender: "systeem",
    text: "Inboedelverzekering Polis\n\nVerzekeringnemer: [NAAM_1]\nAdres: [ADRES_1]\nPostcode: [WOONPLAATS_1]\n\nDekking: Extra uitgebreid\nPremie: € 173,88 per jaar\nEigen risico: € 250,00\nIBAN: [IBAN_1]",
    delay: 1500,
    code: true,
  },
  {
    id: 9,
    sender: "systeem",
    text: "✅ Stap 5: Veilig vergelijken\nAlleen deze geanonimiseerde versie gaat naar onze AI. De AI ziet nooit je naam, adres of bankgegevens.",
    delay: 2200,
    typing: 400,
    highlight: true,
  },
  {
    id: 10,
    sender: "ai",
    text: "📊 Analyse van je inboedelverzekering:\n\n• Dekking: Extra Uitgebreid — goed\n• Premie: € 14,49/mnd — 23% duurder dan gemiddeld\n• Eigen risico: € 250 bij storm — standaard\n• Opzegtermijn: dagelijks — flexibel\n\n💡 Advies: Je betaalt € 14,49/mnd. Bij Centraal Beheer krijg je dezelfde dekking voor € 9,50/mnd. Dat is € 59,88/jaar besparing.",
    delay: 3000,
    typing: 1200,
  },
  {
    id: 11,
    sender: "klant",
    text: "Wauw, bijna €60 per jaar besparing! En mijn gegevens zijn echt veilig?",
    delay: 2000,
    typing: 600,
  },
  {
    id: 12,
    sender: "systeem",
    text: "💯 Absoluut! Hier is wat er met je gegevens gebeurt:\n\n✓ Origineel document: direct verwijderd na verwerking\n✓ Persoonsgegevens: AES-256 versleuteld, alleen voor jou\n✓ AI ziet: alleen [NAAM_1], [ADRES_1] etc.\n✓ Server: eigen EU-server, data verlaat Europa nooit\n✓ Je kunt altijd je data laten verwijderen (AVG Art. 17)",
    delay: 2500,
    typing: 800,
    highlight: true,
  },
];

// ─── Components ──────────────────────────────────────────────────────────────

function TypingIndicator({ sender }: { sender: string }) {
  const bg = sender === "klant" ? "bg-bw-blue" : sender === "ai" ? "bg-[#8B5CF6]" : "bg-white border border-bw-border";
  const dots = sender === "klant" || sender === "ai" ? "bg-white/60" : "bg-bw-text-light";

  return (
    <div className={`inline-flex items-center gap-1.5 px-4 py-3 rounded-2xl ${bg}`}>
      <span className={`w-2 h-2 rounded-full ${dots} animate-bounce`} style={{ animationDelay: "0ms" }} />
      <span className={`w-2 h-2 rounded-full ${dots} animate-bounce`} style={{ animationDelay: "150ms" }} />
      <span className={`w-2 h-2 rounded-full ${dots} animate-bounce`} style={{ animationDelay: "300ms" }} />
    </div>
  );
}

function ChatBubble({ msg }: { msg: Message }) {
  const isKlant = msg.sender === "klant";
  const isAI = msg.sender === "ai";

  const align = isKlant ? "items-end" : "items-start";
  const bubbleColor = isKlant
    ? "bg-bw-blue text-white"
    : isAI
    ? "bg-[#8B5CF6] text-white"
    : msg.highlight
    ? "bg-bw-green-bg border-2 border-[#BBF7D0] text-bw-deep"
    : msg.code
    ? "bg-[#1E293B] text-[#E2E8F0] font-mono text-[12px]"
    : "bg-white border border-bw-border text-bw-deep";

  const label = isKlant ? null : isAI ? (
    <span className="text-[11px] font-semibold text-[#8B5CF6] ml-1 mb-0.5">AI Adviseur</span>
  ) : (
    <span className="text-[11px] font-semibold text-bw-green ml-1 mb-0.5">Beveiligd Systeem</span>
  );

  if (msg.document) {
    return (
      <div className={`flex flex-col ${align} animate-fadeUp`}>
        <div className="bg-bw-blue text-white px-4 py-3 rounded-2xl flex items-center gap-3 max-w-[280px]">
          <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <div className="text-[13px] font-semibold">{msg.text}</div>
            <div className="text-[11px] text-white/60">PDF &middot; 245 KB</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${align} animate-fadeUp`}>
      {label}
      <div className={`${bubbleColor} px-4 py-3 rounded-2xl max-w-[340px] sm:max-w-[400px] whitespace-pre-line text-[13px] sm:text-[14px] leading-relaxed shadow-sm`}>
        {msg.text}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AVGVeiligPage() {
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [typingSender, setTypingSender] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const [done, setDone] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [visibleMessages, typingSender]);

  // Play messages sequentially
  useEffect(() => {
    if (!started) return;

    let timeouts: NodeJS.Timeout[] = [];
    let cumDelay = 0;

    CHAT_MESSAGES.forEach((msg, i) => {
      cumDelay += msg.delay;

      // Show typing indicator
      if (msg.typing) {
        const typingDelay = cumDelay;
        timeouts.push(setTimeout(() => setTypingSender(msg.sender), typingDelay));
        cumDelay += msg.typing;
      }

      // Show message
      const msgDelay = cumDelay;
      timeouts.push(
        setTimeout(() => {
          setTypingSender(null);
          setVisibleMessages((prev) => [...prev, msg]);
        }, msgDelay)
      );
    });

    // Mark done
    cumDelay += 1000;
    timeouts.push(setTimeout(() => setDone(true), cumDelay));

    return () => timeouts.forEach(clearTimeout);
  }, [started]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDF4] to-bw-bg">
      {/* Hero */}
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6 text-center">
        <div className="inline-flex items-center gap-2 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-full text-[12px] font-bold mb-4 border border-[#BBF7D0]">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <polyline points="9 12 11 14 15 10"/>
          </svg>
          AVG-compliant
        </div>
        <h1 className="font-heading text-[28px] sm:text-[36px] font-bold text-bw-deep leading-tight mb-3">
          Hoe wij jouw polis <span className="text-bw-green">veilig</span> vergelijken
        </h1>
        <p className="text-[15px] sm:text-[16px] text-bw-text-mid max-w-[520px] mx-auto leading-relaxed">
          Je persoonsgegevens worden nooit gedeeld met AI of derden.
          Bekijk hieronder stap voor stap hoe het werkt.
        </p>
      </div>

      {/* Chat demo */}
      <div className="max-w-[520px] mx-auto px-4 sm:px-6 pb-8">
        {/* Phone frame */}
        <div className="bg-[#ECE5DD] rounded-3xl overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.12)] border border-[#D1D5DB]">
          {/* Chat header */}
          <div className="bg-[#075E54] px-4 py-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <polyline points="9 12 11 14 15 10"/>
              </svg>
            </div>
            <div>
              <div className="text-[14px] font-semibold text-white">DeVerzekeringsAgent</div>
              <div className="text-[11px] text-white/70">Beveiligde verbinding</div>
            </div>
            <div className="ml-auto flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#25D366] animate-pulse" />
              <span className="text-[11px] text-white/70">end-to-end</span>
            </div>
          </div>

          {/* Chat area */}
          <div
            ref={chatRef}
            className="px-3 py-4 space-y-3 overflow-y-auto"
            style={{ height: started ? "520px" : "200px", transition: "height 0.5s ease" }}
          >
            {!started && (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-bw-green/10 flex items-center justify-center">
                  <svg className="w-8 h-8 text-bw-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[15px] font-bold text-bw-deep mb-1">Bekijk de demo</div>
                  <div className="text-[13px] text-bw-text-mid">Zie hoe we je polis veilig anonimiseren</div>
                </div>
                <button
                  onClick={() => setStarted(true)}
                  className="px-6 py-2.5 rounded-xl bg-bw-green text-white text-[14px] font-bold border-none cursor-pointer hover:bg-bw-green-strong transition-all shadow-sm"
                >
                  Start demo
                </button>
              </div>
            )}

            {visibleMessages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}

            {typingSender && (
              <div className={`flex ${typingSender === "klant" ? "justify-end" : "justify-start"}`}>
                <TypingIndicator sender={typingSender} />
              </div>
            )}
          </div>
        </div>

        {/* Replay button */}
        {done && (
          <div className="text-center mt-4">
            <button
              onClick={() => {
                setVisibleMessages([]);
                setTypingSender(null);
                setDone(false);
                setStarted(false);
              }}
              className="text-[13px] font-semibold text-bw-blue hover:underline cursor-pointer bg-transparent border-none"
            >
              Opnieuw afspelen
            </button>
          </div>
        )}
      </div>

      {/* Trust badges */}
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 pb-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  <polyline points="9 12 11 14 15 10"/>
                </svg>
              ),
              title: "AVG-compliant",
              desc: "Persoonsgegevens worden AES-256 versleuteld. Alleen jij hebt toegang.",
            },
            {
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
                </svg>
              ),
              title: "AI ziet geen namen",
              desc: "Je polis wordt geanonimiseerd voordat AI het analyseert. Nooit je naam, adres of IBAN.",
            },
            {
              icon: (
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                </svg>
              ),
              title: "EU-servers",
              desc: "Verwerking op eigen servers in Duitsland. Je data verlaat Europa nooit.",
            },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white rounded-2xl border border-bw-border p-5 text-center">
              <div className="w-12 h-12 rounded-xl bg-bw-green-bg flex items-center justify-center mx-auto mb-3 text-bw-green">
                {icon}
              </div>
              <div className="text-[14px] font-bold text-bw-deep mb-1">{title}</div>
              <div className="text-[13px] text-bw-text-mid leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>

        {/* How it works steps */}
        <div className="mt-8 bg-white rounded-2xl border border-bw-border p-6">
          <h2 className="text-[18px] font-bold text-bw-deep mb-5">Zo beschermen wij je gegevens</h2>
          <div className="space-y-4">
            {[
              { step: "1", title: "Upload", desc: "Je uploadt je polis of energiecontract. Het bestand gaat naar onze eigen beveiligde server." },
              { step: "2", title: "Herkenning", desc: "Ons systeem herkent automatisch 14 soorten persoonsgegevens: namen, adressen, IBAN, BSN, en meer." },
              { step: "3", title: "Versleuteling", desc: "Je persoonsgegevens worden AES-256 versleuteld opgeslagen in je persoonlijke profiel. Alleen jij kunt ze inzien." },
              { step: "4", title: "Anonimisering", desc: "Je document wordt geanonimiseerd: 'Jan de Vries' wordt [NAAM_1], je IBAN wordt [IBAN_1]. Alle bedragen en dekkingen blijven zichtbaar." },
              { step: "5", title: "Vergelijking", desc: "Alleen het geanonimiseerde document wordt geanalyseerd. De AI ziet nooit je echte naam, adres of bankgegevens." },
              { step: "6", title: "Verwijdering", desc: "Je originele document wordt direct na verwerking verwijderd. Je kunt op elk moment al je gegevens laten wissen (AVG Art. 17)." },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-bw-green flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-[12px] font-bold text-white">{step}</span>
                </div>
                <div>
                  <div className="text-[14px] font-bold text-bw-deep">{title}</div>
                  <div className="text-[13px] text-bw-text-mid leading-relaxed">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center space-y-3">
          <Link
            href="/upload"
            className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-[15px] font-bold bg-bw-green text-white no-underline hover:bg-bw-green-strong transition-all shadow-sm"
          >
            Veilig je polis vergelijken
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </Link>
          <div className="flex items-center justify-center gap-4 text-[12px] text-bw-text-mid">
            <Link href="/privacy" className="hover:text-bw-blue transition-colors">Privacybeleid</Link>
            <span>&middot;</span>
            <Link href="/dienstwijzer" className="hover:text-bw-blue transition-colors">Dienstenwijzer</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
