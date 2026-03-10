"use client";

import { useState, useEffect } from "react";
import type { SyncResult, DaisyconStatus } from "@/lib/daisycon/types";

export default function DaisyconAdmin() {
  const [status, setStatus] = useState<DaisyconStatus | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/daisycon/status")
      .then(r => r.json())
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/daisycon/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      // Refresh status
      const statusRes = await fetch("/api/daisycon/status");
      setStatus(await statusRes.json());
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return <div className="text-bw-text-mid text-sm">Laden...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-bw-deep">Daisycon Affiliate</h1>
          <p className="text-sm text-bw-text-mid mt-1">Beheer affiliate programma&apos;s en tracking URLs</p>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="px-4 py-2 bg-bw-green text-white rounded-lg text-sm font-semibold hover:bg-bw-green/90 transition-colors disabled:opacity-50 cursor-pointer border-none"
        >
          {syncing ? "Synchroniseren..." : "Sync nu"}
        </button>
      </div>

      {/* Status card */}
      {status && (
        <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] p-5">
          <h2 className="font-heading text-base font-bold text-bw-deep mb-4">Status</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatusItem
              label="Modus"
              value={status.mode === "mock" ? "Mock" : "Live"}
              badge={status.mode === "mock" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}
            />
            <StatusItem label="Leveranciers" value={`${status.totaalGemapt} / ${status.totaalLeveranciers}`} />
            <StatusItem label="Sandbox" value={status.sandbox ? "Ja" : "Nee"} />
            <StatusItem
              label="Laatst gesync"
              value={status.laatstGesynchroniseerd
                ? new Date(status.laatstGesynchroniseerd).toLocaleString("nl-NL")
                : "Nog niet"}
            />
          </div>
        </div>
      )}

      {/* Setup instructies (als niet geconfigureerd) */}
      {status && !status.configured && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h3 className="font-heading text-base font-bold text-amber-800 mb-2">Setup instructies</h3>
          <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
            <li>Maak een account aan op <strong>login.daisycon.com</strong></li>
            <li>Maak een nieuwe app aan (OAuth 2.0 Client Credentials)</li>
            <li>Kopieer de Client ID en Client Secret</li>
            <li>Voeg toe aan <code className="bg-amber-100 px-1 rounded">.env.local</code>:
              <pre className="mt-1 bg-amber-100 p-2 rounded text-xs overflow-x-auto">
{`DAISYCON_CLIENT_ID=jouw_client_id
DAISYCON_CLIENT_SECRET=jouw_client_secret
DAISYCON_PUBLISHER_ID=jouw_publisher_id
DAISYCON_USE_SANDBOX=true`}
              </pre>
            </li>
            <li>Herstart de app en druk op &quot;Sync nu&quot;</li>
          </ol>
          <p className="text-xs text-amber-600 mt-3">
            Mock-modus is actief. Alle leveranciers worden gesimuleerd met mock tracking URLs.
          </p>
        </div>
      )}

      {/* Leverancier mapping tabel */}
      {syncResult && (
        <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] overflow-hidden">
          <div className="px-5 py-4 border-b border-bw-border flex items-center justify-between">
            <div>
              <h2 className="font-heading text-base font-bold text-bw-deep">Leverancier Mapping</h2>
              <p className="text-xs text-bw-text-mid">
                {syncResult.totaalGemapt} gemapt, {syncResult.totaalNietGemapt} niet gemapt
              </p>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
              syncResult.mode === "mock" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"
            }`}>
              {syncResult.mode.toUpperCase()}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-bw-bg">
                  <th className="px-5 py-3 text-left font-semibold text-bw-text-mid border-b border-bw-border">Leverancier</th>
                  <th className="px-3 py-3 text-left font-semibold text-bw-text-mid border-b border-bw-border">Daisycon Campagne</th>
                  <th className="px-3 py-3 text-right font-semibold text-bw-text-mid border-b border-bw-border">Commissie</th>
                  <th className="px-3 py-3 text-center font-semibold text-bw-text-mid border-b border-bw-border">Status</th>
                  <th className="px-5 py-3 text-left font-semibold text-bw-text-mid border-b border-bw-border">Tracking URL</th>
                </tr>
              </thead>
              <tbody>
                {syncResult.leveranciers.map((m) => (
                  <tr key={m.leverancierNaam} className="hover:bg-bw-bg transition-colors">
                    <td className="px-5 py-3 border-b border-bw-border font-semibold text-bw-deep">
                      {m.leverancierNaam}
                    </td>
                    <td className="px-3 py-3 border-b border-bw-border text-bw-text">
                      {m.daisyconProgramNaam || <span className="text-bw-text-light">-</span>}
                    </td>
                    <td className="px-3 py-3 border-b border-bw-border text-right text-bw-text">
                      {m.status !== "unmapped" ? `€${m.commissie}` : "-"}
                    </td>
                    <td className="px-3 py-3 border-b border-bw-border text-center">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        m.status === "active" ? "bg-green-100 text-green-700" :
                        m.status === "unmapped" ? "bg-gray-100 text-gray-500" :
                        "bg-amber-100 text-amber-700"
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 border-b border-bw-border text-bw-text-light text-xs max-w-[300px] truncate">
                      {m.trackingUrl || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusItem({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div>
      <p className="text-xs text-bw-text-mid mb-1">{label}</p>
      {badge ? (
        <span className={`text-sm font-bold px-2 py-0.5 rounded ${badge}`}>{value}</span>
      ) : (
        <p className="text-sm font-bold text-bw-deep">{value}</p>
      )}
    </div>
  );
}
