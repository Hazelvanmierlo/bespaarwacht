"use client";

import type { Tip } from "@/lib/energie/tips-generator";

interface AdviesPanelProps {
  tips: Tip[];
}

const prioriteitKleur: Record<number, { border: string; bg: string }> = {
  1: { border: "border-l-bw-green", bg: "bg-bw-green-bg" },
  2: { border: "border-l-bw-blue", bg: "bg-bw-blue-light" },
  3: { border: "border-l-bw-border", bg: "bg-bw-bg" },
};

export default function AdviesPanel({ tips }: AdviesPanelProps) {
  if (tips.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw)] overflow-hidden">
      <div className="px-5 py-4 border-b border-bw-border">
        <h3 className="font-heading text-lg font-bold text-bw-deep">Persoonlijk advies</h3>
        <p className="text-xs text-bw-text-mid">Op basis van jouw verbruik en situatie</p>
      </div>
      <div className="p-5 space-y-3">
        {tips.map((tip, i) => {
          const pk = prioriteitKleur[tip.prioriteit] ?? prioriteitKleur[3];
          return (
            <div
              key={i}
              className={`flex gap-3 px-4 py-3 rounded-xl border border-l-[3px] ${pk.border} ${pk.bg} transition-all`}
            >
              <span className="text-xl shrink-0 mt-0.5">{tip.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold text-bw-deep">{tip.titel}</span>
                  {tip.prioriteit === 1 && (
                    <span className="text-[10px] font-bold bg-bw-green text-white px-1.5 py-0.5 rounded">Prioriteit</span>
                  )}
                </div>
                <p className="text-xs text-bw-text-mid leading-relaxed">{tip.beschrijving}</p>
                {tip.besparing && (
                  <p className="text-xs font-semibold text-bw-green-strong mt-1">
                    Geschatte besparing: {tip.besparing}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
