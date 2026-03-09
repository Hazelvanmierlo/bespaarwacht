"use client";

import { useState, useEffect } from "react";

interface ConfigStatus {
  status: string;
  config: Record<string, string>;
  webhook_url: string;
  verify_token: string;
}

export default function WhatsAppAdminPage() {
  const [config, setConfig] = useState<ConfigStatus | null>(null);
  const [testTo, setTestTo] = useState("");
  const [testMsg, setTestMsg] = useState("Hoi! Dit is een testbericht van BespaarWacht.");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/whatsapp/test")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null));
  }, []);

  async function sendTest() {
    setLoading(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testTo.replace(/\D/g, ""), message: testMsg }),
      });
      const data = await res.json();
      setTestResult(JSON.stringify(data, null, 2));
    } catch (err) {
      setTestResult(String(err));
    }
    setLoading(false);
  }

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="font-heading text-2xl font-bold text-bw-deep mb-6">WhatsApp Bot Setup</h1>

      {/* Config status */}
      <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] p-6 mb-6">
        <h2 className="font-heading text-lg font-bold text-bw-deep mb-4">Configuratie Status</h2>
        {config ? (
          <div className="space-y-2">
            {Object.entries(config.config).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between py-2 px-3 rounded-lg bg-bw-bg">
                <code className="text-sm text-bw-deep">{key}</code>
                <span className={`text-sm font-semibold ${value === "ONTBREEKT" ? "text-bw-red" : "text-bw-green-strong"}`}>
                  {value}
                </span>
              </div>
            ))}
            <div className="mt-4 p-3 rounded-lg bg-bw-bg">
              <p className="text-sm text-bw-text-mid">
                <strong>Webhook URL:</strong> <code>https://bespaarwacht.vercel.app{config.webhook_url}</code>
              </p>
              <p className="text-sm text-bw-text-mid mt-1">
                <strong>Verify Token:</strong> <code>{config.verify_token}</code>
              </p>
            </div>
            <div className={`mt-3 p-3 rounded-lg ${config.status === "ready" ? "bg-bw-green-bg" : "bg-bw-orange-bg"}`}>
              <p className={`text-sm font-semibold ${config.status === "ready" ? "text-bw-green-strong" : "text-bw-orange"}`}>
                {config.status === "ready" ? "Alle variabelen ingesteld" : "Ontbrekende variabelen — zie setup stappen hieronder"}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-bw-text-mid">Laden...</p>
        )}
      </div>

      {/* Test bericht */}
      <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] p-6 mb-6">
        <h2 className="font-heading text-lg font-bold text-bw-deep mb-4">Test Bericht Sturen</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-bw-deep block mb-1">Telefoonnummer (internationaal)</label>
            <input
              type="text"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="31612345678"
              className="w-full px-3 py-2 border border-bw-border rounded-lg text-sm focus:border-bw-green focus:ring-1 focus:ring-bw-green/20 outline-none"
            />
            <p className="text-xs text-bw-text-light mt-1">Zonder + of spaties. NL mobiel = 316...</p>
          </div>
          <div>
            <label className="text-sm font-medium text-bw-deep block mb-1">Bericht</label>
            <textarea
              value={testMsg}
              onChange={(e) => setTestMsg(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border border-bw-border rounded-lg text-sm focus:border-bw-green focus:ring-1 focus:ring-bw-green/20 outline-none resize-none"
            />
          </div>
          <button
            onClick={sendTest}
            disabled={loading || !testTo}
            className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-[#25D366] text-white hover:bg-[#128C7E] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? "Versturen..." : "Stuur testbericht"}
          </button>
          {testResult && (
            <pre className="mt-3 p-3 rounded-lg bg-bw-bg text-xs overflow-x-auto">{testResult}</pre>
          )}
        </div>
      </div>

      {/* Setup stappen */}
      <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] p-6">
        <h2 className="font-heading text-lg font-bold text-bw-deep mb-4">Setup Stappen</h2>
        <div className="space-y-4 text-sm text-bw-text leading-relaxed">
          <Step n={1} title="Meta Business Account">
            <p>Ga naar <a href="https://business.facebook.com" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">business.facebook.com</a> en maak een Business Account aan (of log in).</p>
          </Step>

          <Step n={2} title="Meta App aanmaken">
            <p>Ga naar <a href="https://developers.facebook.com/apps" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">developers.facebook.com/apps</a></p>
            <ul className="list-disc ml-4 mt-1 space-y-1">
              <li>Klik <strong>App maken</strong> &rarr; kies <strong>Business</strong> type</li>
              <li>Naam: &quot;BespaarWacht WhatsApp&quot;</li>
              <li>Koppel aan je Business Account</li>
            </ul>
          </Step>

          <Step n={3} title="WhatsApp product toevoegen">
            <ul className="list-disc ml-4 space-y-1">
              <li>In je app dashboard &rarr; <strong>Producten toevoegen</strong> &rarr; <strong>WhatsApp</strong></li>
              <li>Kies je Business Account</li>
            </ul>
          </Step>

          <Step n={4} title="085-nummer registreren">
            <ul className="list-disc ml-4 space-y-1">
              <li>Ga naar <strong>WhatsApp &rarr; Getting Started</strong></li>
              <li>Klik <strong>Add phone number</strong></li>
              <li>Vul in: <code>+31 85 369 6711</code></li>
              <li>Kies verificatie via <strong>Voice call</strong> (niet SMS — 085 is geen mobiel)</li>
              <li>Neem de telefoon op en voer de code in</li>
            </ul>
          </Step>

          <Step n={5} title="Tokens ophalen">
            <ul className="list-disc ml-4 space-y-1">
              <li><strong>Phone Number ID</strong>: staat bij WhatsApp &rarr; Getting Started &rarr; onder je nummer</li>
              <li><strong>Permanent Token</strong>: Ga naar <strong>Business Settings &rarr; System Users</strong></li>
              <li>Maak een System User aan (Admin rol)</li>
              <li>Klik <strong>Generate Token</strong> &rarr; selecteer je WhatsApp app &rarr; permissies: <code>whatsapp_business_messaging</code>, <code>whatsapp_business_management</code></li>
            </ul>
          </Step>

          <Step n={6} title="Environment variables invullen">
            <p>Voeg toe aan <code>.env.local</code> (lokaal) en Vercel dashboard (productie):</p>
            <pre className="mt-2 p-3 rounded-lg bg-bw-bg overflow-x-auto">{`WHATSAPP_TOKEN=EAAxxxxx...      # Permanent token uit stap 5
WHATSAPP_PHONE_ID=123456789...  # Phone Number ID uit stap 5
WEBHOOK_VERIFY_TOKEN=bespaarwacht_2026
ANTHROPIC_API_KEY=sk-ant-...    # Van console.anthropic.com`}</pre>
          </Step>

          <Step n={7} title="Vercel KV (Redis) opzetten">
            <ul className="list-disc ml-4 space-y-1">
              <li>Ga naar <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="text-bw-blue hover:underline">vercel.com</a> &rarr; je project &rarr; <strong>Storage</strong></li>
              <li>Klik <strong>Create Database</strong> &rarr; <strong>KV (Redis)</strong></li>
              <li>Naam: <code>bespaarwacht-kv</code></li>
              <li><code>KV_REST_API_URL</code> en <code>KV_REST_API_TOKEN</code> worden automatisch aan Vercel env toegevoegd</li>
              <li>Kopieer ze ook naar je <code>.env.local</code> voor lokaal testen</li>
            </ul>
          </Step>

          <Step n={8} title="Webhook instellen">
            <ul className="list-disc ml-4 space-y-1">
              <li>In Meta App dashboard &rarr; <strong>WhatsApp &rarr; Configuration</strong></li>
              <li><strong>Callback URL:</strong> <code>https://bespaarwacht.vercel.app/api/whatsapp</code></li>
              <li><strong>Verify Token:</strong> <code>bespaarwacht_2026</code></li>
              <li>Klik <strong>Verify and Save</strong></li>
              <li>Subscribe op: <strong>messages</strong></li>
            </ul>
          </Step>

          <Step n={9} title="Testen">
            <ul className="list-disc ml-4 space-y-1">
              <li>Stuur een testbericht via het formulier hierboven</li>
              <li>Of stuur &quot;Hoi&quot; via WhatsApp naar 085-369 6711</li>
              <li>De bot moet antwoorden met het welkomstbericht</li>
            </ul>
          </Step>
        </div>
      </div>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-bw-green text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
        {n}
      </div>
      <div>
        <h3 className="font-semibold text-bw-deep mb-1">{title}</h3>
        {children}
      </div>
    </div>
  );
}
