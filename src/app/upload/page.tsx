"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ShieldIcon, ArrowRightIcon, LockIcon } from "@/components/icons";

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback(() => {
    // In production, this would parse the PDF. For now, redirect to demo analysis.
    router.push("/analyse/demo");
  }, [router]);

  return (
    <div className="max-w-[640px] mx-auto px-6 py-16">
      <h2 className="font-heading text-[28px] font-bold text-bw-deep mb-2">Polis uploaden</h2>
      <p className="text-[15px] text-bw-text-mid mb-8">
        Upload je polisblad als PDF. Wij analyseren het automatisch en vinden betere opties.
      </p>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl px-8 py-12 text-center cursor-pointer transition-all ${
          isDragging ? "border-bw-green bg-bw-green-bg" : "border-[#CBD5E1] bg-[#FAFBFC]"
        }`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFile(); }}
      >
        <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleFile} />
        <div className="w-16 h-16 rounded-2xl bg-bw-green-bg flex items-center justify-center mx-auto mb-4">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className="text-base font-semibold text-bw-deep mb-1">Sleep je PDF hierheen</div>
        <div className="text-sm text-bw-text-light mb-5">of klik om een bestand te selecteren</div>
        <div className="flex justify-center gap-4 text-xs text-bw-text-light">
          <span>📄 PDF formaat</span>
          <span>🔒 Wordt niet opgeslagen</span>
          <span>⚡ Analyse in 5 sec</span>
        </div>
      </div>

      {/* Privacy guarantee */}
      <div className="mt-5 p-4 bg-[#F0FDF4] rounded-xl border border-[#BBF7D0]">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#DCFCE7] flex items-center justify-center shrink-0 mt-0.5">
            <LockIcon />
          </div>
          <div>
            <div className="text-[13px] font-bold text-bw-green-strong mb-1">Wij slaan je bestand NIET op</div>
            <div className="text-xs text-bw-green-dark leading-relaxed">
              Je PDF wordt alleen tijdelijk verwerkt om de verzekeringsdata uit te lezen. Na analyse wordt het bestand direct verwijderd. Wij bewaren nooit je naam, adres, polisnummer of andere persoonsgegevens. Alleen geanonimiseerde verzekeringsdata (type dekking, premie, woningtype) wordt opgeslagen als je daarvoor kiest. Conform AVG dataminimalisatie.
            </div>
          </div>
        </div>
      </div>

      {/* Demo button */}
      <div className="mt-8 p-5 bg-white rounded-xl border border-bw-border">
        <div className="text-[13px] font-semibold text-bw-deep mb-2">💡 Demo: probeer met voorbeeldpolis</div>
        <p className="text-[13px] text-bw-text-mid mb-3">
          Klik hieronder om de analyse te starten met een voorbeeld OHRA inboedelverzekering.
        </p>
        <button
          onClick={() => router.push("/analyse/demo")}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold bg-bw-deep text-white border-none cursor-pointer font-[inherit] hover:bg-bw-navy transition-colors"
        >
          <ShieldIcon className="w-4 h-4" /> Demo analyse starten <ArrowRightIcon className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
