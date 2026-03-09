"use client";

import type { ApparaatDetectie, ConfidenceLevel } from "@/lib/energie/apparaat-detectie";
import { apparaatImpacts } from "@/lib/energie/apparaat-detectie";

interface ProfielDetectieProps {
  apparaten: ApparaatDetectie;
  onToggle: (key: keyof ApparaatDetectie) => void;
}

const confidenceKleur: Record<ConfidenceLevel, { bg: string; text: string; label: string }> = {
  zeker: { bg: "bg-bw-green-bg", text: "text-bw-green-strong", label: "Zeker" },
  waarschijnlijk: { bg: "bg-bw-blue-light", text: "text-bw-blue", label: "Waarschijnlijk" },
  onwaarschijnlijk: { bg: "bg-bw-bg", text: "text-bw-text-light", label: "Onwaarschijnlijk" },
  onbekend: { bg: "bg-bw-bg", text: "text-bw-text-light", label: "Onbekend" },
};

export default function ProfielDetectie({ apparaten, onToggle }: ProfielDetectieProps) {
  const keys = Object.keys(apparaten) as (keyof ApparaatDetectie)[];

  return (
    <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] overflow-hidden">
      <div className="px-5 py-4 border-b border-bw-border">
        <h3 className="font-heading text-lg font-bold text-bw-deep">Energieprofiel</h3>
        <p className="text-xs text-bw-text-mid">Automatisch gedetecteerd. Pas aan als het niet klopt.</p>
      </div>
      <div className="p-5 space-y-3">
        {keys.map((key) => {
          const confidence = apparaten[key];
          const impact = apparaatImpacts[key];
          const c = confidenceKleur[confidence];
          const isActive = confidence === "zeker" || confidence === "waarschijnlijk";

          return (
            <div
              key={key}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                isActive ? "bg-bw-green-bg border-[rgba(22,163,74,0.15)]" : "border-bw-border"
              }`}
            >
              <span className="text-xl shrink-0">{impact.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-bw-deep">{impact.label}</span>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${c.bg} ${c.text}`}>
                    {c.label}
                  </span>
                </div>
                {isActive && (
                  <p className="text-xs text-bw-text-mid leading-snug">{impact.advies}</p>
                )}
              </div>
              {/* Toggle switch */}
              <button
                onClick={() => onToggle(key)}
                className={`relative w-10 h-[22px] rounded-full border-none cursor-pointer transition-colors shrink-0 ${
                  isActive ? "bg-bw-green" : "bg-bw-border"
                }`}
              >
                <div
                  className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform ${
                    isActive ? "left-[20px]" : "left-[2px]"
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
