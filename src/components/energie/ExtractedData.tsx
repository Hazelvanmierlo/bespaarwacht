"use client";

import { useState, useCallback } from "react";
import type { EnergieData, DataKwaliteit } from "@/lib/energie/pdf-parser";

interface ExtractedDataProps {
  data: EnergieData;
  onUpdate: (updated: EnergieData) => void;
}

const kwaliteitKleur: Record<DataKwaliteit, { bg: string; text: string; label: string }> = {
  goed: { bg: "bg-bw-green-bg", text: "text-bw-green-strong", label: "Goed" },
  redelijk: { bg: "bg-bw-orange-bg", text: "text-bw-orange", label: "Redelijk" },
  beperkt: { bg: "bg-bw-red-bg", text: "text-bw-red", label: "Beperkt" },
};

export default function ExtractedData({ data, onUpdate }: ExtractedDataProps) {
  const [editing, setEditing] = useState(false);
  const kw = kwaliteitKleur[data.kwaliteit];

  const handleChange = useCallback(
    (field: keyof EnergieData, value: string) => {
      const numFields: (keyof EnergieData)[] = [
        "verbruikKwhDal", "verbruikKwhPiek", "verbruikKwhTotaal",
        "terugleveringKwh", "verbruikGasM3",
        "kostenElektriciteitJaar", "kostenGasJaar", "kostenTotaalJaar",
        "vastrecht", "netbeheerkosten",
      ];
      const updated = { ...data };
      if (numFields.includes(field)) {
        const parsed = parseFloat(value);
        (updated as Record<string, unknown>)[field] = isNaN(parsed) ? null : parsed;
      } else {
        (updated as Record<string, unknown>)[field] = value || null;
      }
      onUpdate(updated);
    },
    [data, onUpdate],
  );

  const dalPct =
    data.verbruikKwhTotaal && data.verbruikKwhDal != null
      ? Math.round((data.verbruikKwhDal / data.verbruikKwhTotaal) * 100)
      : null;

  return (
    <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] overflow-hidden">
      <div className="px-5 py-4 border-b border-bw-border flex items-center justify-between">
        <div>
          <h3 className="font-heading text-lg font-bold text-bw-deep">Gevonden data</h3>
          <p className="text-xs text-bw-text-mid">{data.bron}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${kw.bg} ${kw.text}`}>
            {kw.label}
          </span>
          <button
            onClick={() => setEditing(!editing)}
            className="text-xs font-medium text-bw-blue hover:underline bg-transparent border-none cursor-pointer"
          >
            {editing ? "Sluiten" : "Aanpassen"}
          </button>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Leverancier + contract */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <DataField
            label="Leverancier"
            value={data.leverancier}
            field="leverancier"
            editing={editing}
            onChange={handleChange}
          />
          <DataField
            label="Contract"
            value={data.contractType}
            field="contractType"
            editing={editing}
            onChange={handleChange}
          />
          <DataField
            label="Einddatum"
            value={data.einddatum}
            field="einddatum"
            editing={editing}
            onChange={handleChange}
          />
        </div>

        {/* Elektriciteit */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[1.5px] text-bw-blue mb-3">Elektriciteit</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DataField label="Dal (kWh)" value={data.verbruikKwhDal} field="verbruikKwhDal" editing={editing} onChange={handleChange} type="number" />
            <DataField label="Piek (kWh)" value={data.verbruikKwhPiek} field="verbruikKwhPiek" editing={editing} onChange={handleChange} type="number" />
            <DataField label="Totaal (kWh)" value={data.verbruikKwhTotaal} field="verbruikKwhTotaal" editing={editing} onChange={handleChange} type="number" />
            <DataField label="Teruglevering (kWh)" value={data.terugleveringKwh} field="terugleveringKwh" editing={editing} onChange={handleChange} type="number" />
          </div>
          {/* Dal/piek visual bar */}
          {dalPct != null && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-bw-text-mid mb-1">
                <span>Dal {dalPct}%</span>
                <span>Piek {100 - dalPct}%</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden flex bg-bw-bg">
                <div className="bg-bw-green rounded-l-full transition-all" style={{ width: `${dalPct}%` }} />
                <div className="bg-bw-orange rounded-r-full transition-all" style={{ width: `${100 - dalPct}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* Gas */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[1.5px] text-bw-blue mb-3">Gas</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <DataField label="Verbruik (m³)" value={data.verbruikGasM3} field="verbruikGasM3" editing={editing} onChange={handleChange} type="number" />
          </div>
        </div>

        {/* Kosten */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-[1.5px] text-bw-blue mb-3">Kosten</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <DataField label="Elektriciteit (€/jr)" value={data.kostenElektriciteitJaar} field="kostenElektriciteitJaar" editing={editing} onChange={handleChange} type="number" prefix="€" />
            <DataField label="Gas (€/jr)" value={data.kostenGasJaar} field="kostenGasJaar" editing={editing} onChange={handleChange} type="number" prefix="€" />
            <DataField label="Vastrecht (€/jr)" value={data.vastrecht} field="vastrecht" editing={editing} onChange={handleChange} type="number" prefix="€" />
            <DataField label="Netbeheer (€/jr)" value={data.netbeheerkosten} field="netbeheerkosten" editing={editing} onChange={handleChange} type="number" prefix="€" />
          </div>
        </div>

        {/* Ontbrekende velden */}
        {data.ontbrekendeVelden.length > 0 && (
          <div className="bg-bw-orange-bg border border-[rgba(234,88,12,0.15)] rounded-xl px-4 py-3">
            <p className="text-sm font-medium text-bw-orange mb-1">Ontbrekende gegevens</p>
            <p className="text-xs text-bw-text-mid">
              {data.ontbrekendeVelden.join(", ")} — vul deze aan voor een nauwkeuriger vergelijking.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Reusable field ── */
function DataField({
  label,
  value,
  field,
  editing,
  onChange,
  type = "text",
  prefix,
}: {
  label: string;
  value: string | number | null;
  field: keyof EnergieData;
  editing: boolean;
  onChange: (field: keyof EnergieData, value: string) => void;
  type?: "text" | "number";
  prefix?: string;
}) {
  const display = value != null ? (prefix ? `${prefix} ${value}` : String(value)) : "—";

  if (!editing) {
    return (
      <div>
        <p className="text-[11px] text-bw-text-light mb-0.5">{label}</p>
        <p className={`text-sm font-semibold ${value != null ? "text-bw-deep" : "text-bw-text-light"}`}>
          {display}
        </p>
      </div>
    );
  }

  return (
    <div>
      <label className="text-[11px] text-bw-text-light mb-0.5 block">{label}</label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-xs text-bw-text-mid">{prefix}</span>}
        <input
          type={type}
          step={type === "number" ? "0.01" : undefined}
          value={value ?? ""}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder="—"
          className="w-full px-2 py-1.5 text-sm border border-bw-border rounded-lg focus:border-bw-green focus:ring-1 focus:ring-bw-green/20 outline-none transition-all"
        />
      </div>
    </div>
  );
}
