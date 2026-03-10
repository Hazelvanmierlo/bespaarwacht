"use client";

import { useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightIcon, LockIcon } from "@/components/icons";
import type { ProductType } from "@/lib/scrapers/base";
import type { PolisData } from "@/lib/types";

const PRODUCTS: { type: ProductType; label: string; icon: string; description: string }[] = [
  { type: "inboedel", label: "Inboedelverzekering", icon: "🏠", description: "OHRA — € 17,53/mnd" },
  { type: "opstal", label: "Opstalverzekering", icon: "🏗️", description: "OHRA — € 19,00/mnd" },
  { type: "aansprakelijkheid", label: "Aansprakelijkheid (AVP)", icon: "🛡️", description: "Centraal Beheer — € 4,40/mnd" },
  { type: "reis", label: "Reisverzekering", icon: "✈️", description: "FBTO — € 10,00/mnd" },
];

const PRODUCT_LABELS: Record<ProductType, string> = {
  inboedel: "Inboedelverzekering",
  opstal: "Opstalverzekering",
  aansprakelijkheid: "Aansprakelijkheidsverzekering",
  reis: "Reisverzekering",
};

const WONINGTYPE_OPTIONS = ["Vrijstaand", "Tussenwoning", "Hoekwoning", "Appartement"];
const DEKKING_OPTIONS_INBOEDEL = ["Basis", "Uitgebreid", "Extra Uitgebreid", "All Risk"];
const DEKKING_OPTIONS_OPSTAL = ["Basis", "Uitgebreid", "Extra Uitgebreid", "All Risk"];
const GEZIN_OPTIONS = ["Alleenstaand", "Gezin / samenwonend"];
const EIGENAAR_OPTIONS = ["Eigenaar", "Huurder"];

export default function UploadPage() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("inboedel");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Extracted data state — shown after PDF parse
  const [parsedData, setParsedData] = useState<PolisData | null>(null);
  const [detectedProduct, setDetectedProduct] = useState<ProductType>("inboedel");

  const handleFile = useCallback(async (file?: File) => {
    const pdfFile = file ?? fileRef.current?.files?.[0];

    if (!pdfFile) {
      router.push(`/analyse/demo?product=${selectedProduct}`);
      return;
    }

    const name = pdfFile.name.toLowerCase();
    const isValid = name.endsWith(".pdf") || name.endsWith(".jpg") || name.endsWith(".jpeg") || name.endsWith(".png") || name.endsWith(".webp");
    if (!isValid) {
      setUploadError("Upload een PDF of afbeelding (JPG, PNG).");
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("file", pdfFile);

      const res = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.error || "Fout bij het verwerken van de PDF.");
        setIsUploading(false);
        return;
      }

      // Show extracted data for confirmation
      setParsedData(json.polisData);
      setDetectedProduct(json.productType);
      setIsUploading(false);
    } catch {
      setUploadError("Netwerkfout. Controleer je verbinding en probeer het opnieuw.");
      setIsUploading(false);
    }
  }, [router, selectedProduct]);

  const handleConfirmAndAnalyze = () => {
    if (!parsedData) return;
    sessionStorage.setItem("bw-upload-polis", JSON.stringify(parsedData));
    sessionStorage.setItem("bw-upload-product", detectedProduct);
    router.push(`/analyse/demo?product=${detectedProduct}&source=upload`);
  };

  const handleReset = () => {
    setParsedData(null);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateField = (field: keyof PolisData, value: string | number) => {
    if (!parsedData) return;
    setParsedData({ ...parsedData, [field]: value });
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback(() => {
    const file = fileRef.current?.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  // === CONFIRMATION VIEW: show extracted data ===
  if (parsedData) {
    return (
      <div className="max-w-[640px] mx-auto px-6 py-16">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-bw-green-bg flex items-center justify-center text-lg">📄</div>
          <div>
            <h2 className="font-heading text-[24px] font-bold text-bw-deep">Klopt dit?</h2>
            <p className="text-[13px] text-bw-text-mid">We hebben deze gegevens uit je polis gehaald. Pas aan indien nodig.</p>
          </div>
        </div>

        {/* Product type */}
        <div className="mt-6 mb-4">
          <label className="text-[12px] font-bold text-bw-text-mid uppercase tracking-[0.5px] mb-2 block">Type verzekering</label>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.type}
                onClick={() => setDetectedProduct(p.type)}
                className={`flex items-center gap-2 p-2.5 rounded-lg border text-left cursor-pointer font-[inherit] transition-all text-[12px] ${
                  detectedProduct === p.type
                    ? "border-bw-green bg-bw-green-bg shadow-[0_0_0_1px_#16A34A] font-semibold text-bw-green-strong"
                    : "border-bw-border bg-white hover:border-[#94A3B8] text-bw-deep"
                }`}
              >
                <span>{p.icon}</span> {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Editable fields */}
        <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
          {/* Polis section */}
          <div className="px-4 py-3 bg-[#F8FAFC] border-b border-bw-border">
            <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Polisgegevens</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <EditRow label="Verzekeraar" value={parsedData.verzekeraar} onChange={(v) => updateField("verzekeraar", v)} />
            <EditRow label="Maandpremie" value={parsedData.maandpremie} type="number" prefix="€" onChange={(v) => {
              const num = parseFloat(v) || 0;
              updateField("maandpremie", num);
              updateField("jaarpremie", +(num * 12).toFixed(2));
            }} />
            <EditRow label="Dekking" value={parsedData.dekking} onChange={(v) => updateField("dekking", v)}
              options={detectedProduct === "inboedel" || detectedProduct === "opstal" ? DEKKING_OPTIONS_INBOEDEL : undefined} />
            <EditRow label="Eigen risico" value={parsedData.eigenRisico} onChange={(v) => updateField("eigenRisico", v)} />
          </div>

          {/* Profiel section — conditional per product type */}
          {(detectedProduct === "inboedel" || detectedProduct === "opstal") && (
            <>
              <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
                <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Woning & profiel</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <EditRow label="Postcode" value={parsedData.postcode} onChange={(v) => updateField("postcode", v)} />
                <EditRow label="Woningtype" value={parsedData.woning} onChange={(v) => updateField("woning", v)} options={WONINGTYPE_OPTIONS} />
                <EditRow label="Oppervlakte" value={parsedData.oppervlakte} onChange={(v) => updateField("oppervlakte", v)} />
                {detectedProduct === "opstal" && (
                  <EditRow label="Bouwjaar/aard" value={parsedData.bouwaard} onChange={(v) => updateField("bouwaard", v)} />
                )}
                <EditRow label="Gezin" value={parsedData.gezin} onChange={(v) => updateField("gezin", v)} options={GEZIN_OPTIONS} />
              </div>

              {/* Extra velden voor nauwkeurigere live premies */}
              <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
                <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Extra gegevens</span>
                <span className="text-[10px] text-bw-text-light ml-1">(optioneel, voor nauwkeurigere premies)</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <EditRow label="Huisnummer" value={parsedData.huisnummer} onChange={(v) => updateField("huisnummer", v)} />
                <EditRow label="Geboortedatum" value={parsedData.geboortedatum} onChange={(v) => updateField("geboortedatum", v)} placeholder="dd-mm-jjjj" />
                <EditRow label="Eigenaar/Huurder" value={parsedData.eigenaar || "Eigenaar"} onChange={(v) => updateField("eigenaar", v)} options={EIGENAAR_OPTIONS} />
              </div>
            </>
          )}

          {detectedProduct === "aansprakelijkheid" && (
            <>
              <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
                <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Profiel</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <EditRow label="Postcode" value={parsedData.postcode} onChange={(v) => updateField("postcode", v)} />
                <EditRow label="Gezin" value={parsedData.gezin} onChange={(v) => updateField("gezin", v)} options={GEZIN_OPTIONS} />
              </div>
            </>
          )}

          {detectedProduct === "reis" && (
            <>
              <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
                <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Reisprofiel</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <EditRow label="Gezin" value={parsedData.gezin} onChange={(v) => updateField("gezin", v)} options={GEZIN_OPTIONS} />
                <EditRow label="Dekking" value={parsedData.dekking} onChange={(v) => updateField("dekking", v)}
                  options={["Doorlopend Europa", "Doorlopend Wereld", "Kortlopend Europa", "Kortlopend Wereld"]} />
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleConfirmAndAnalyze}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold bg-bw-green text-white border-none cursor-pointer font-[inherit] hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.3)] transition-all"
          >
            Analyseer en vind goedkoper <ArrowRightIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="inline-flex items-center px-4 py-3.5 rounded-xl text-[13px] font-semibold bg-white text-bw-text-mid border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
          >
            Opnieuw
          </button>
        </div>

        {/* Privacy note */}
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
          <LockIcon />
          <span className="text-[11px] text-bw-green-dark">
            <strong>Je PDF is al verwijderd.</strong> Alleen deze gegevens worden gebruikt voor de vergelijking.
          </span>
        </div>
      </div>
    );
  }

  // === UPLOAD VIEW ===
  return (
    <div className="max-w-[640px] mx-auto px-6 py-16">
      <h2 className="font-heading text-[28px] font-bold text-bw-deep mb-2">Polis uploaden</h2>
      <p className="text-[15px] text-bw-text-mid mb-8">
        Upload je polisblad als PDF of foto. Wij analyseren het automatisch en vinden betere opties.
      </p>

      {/* Product type selector */}
      <div className="mb-6">
        <div className="text-[13px] font-semibold text-bw-deep mb-3">Welk type verzekering?</div>
        <div className="grid grid-cols-2 gap-2">
          {PRODUCTS.map((p) => (
            <button
              key={p.type}
              onClick={() => setSelectedProduct(p.type)}
              className={`flex items-center gap-3 p-3 rounded-xl border text-left cursor-pointer font-[inherit] transition-all ${
                selectedProduct === p.type
                  ? "border-bw-green bg-bw-green-bg shadow-[0_0_0_1px_#16A34A]"
                  : "border-bw-border bg-white hover:border-[#94A3B8]"
              }`}
            >
              <span className="text-xl">{p.icon}</span>
              <div>
                <div className={`text-[13px] font-semibold ${selectedProduct === p.type ? "text-bw-green-strong" : "text-bw-deep"}`}>
                  {p.label}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-2xl px-8 py-12 text-center cursor-pointer transition-all ${
          isUploading
            ? "border-bw-green bg-bw-green-bg opacity-70 pointer-events-none"
            : isDragging ? "border-bw-green bg-bw-green-bg" : "border-[#CBD5E1] bg-[#FAFBFC]"
        }`}
        onClick={() => !isUploading && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*" className="hidden" onChange={handleInputChange} />

        {isUploading ? (
          <>
            <div className="w-16 h-16 rounded-2xl bg-bw-green-bg flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 border-3 border-bw-green border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-base font-semibold text-bw-deep mb-1">Document wordt verwerkt...</div>
            <div className="text-sm text-bw-text-light">Even geduld, we lezen je polis uit.</div>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-bw-green-bg flex items-center justify-center mx-auto mb-4">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="text-base font-semibold text-bw-deep mb-1">Sleep je bestand hierheen</div>
            <div className="text-sm text-bw-text-light mb-5">of klik om een bestand te selecteren</div>
            <div className="flex justify-center gap-4 text-xs text-bw-text-light">
              <span>📄 PDF of foto</span>
              <span>🔒 Wordt niet opgeslagen</span>
              <span>⚡ Analyse in 5 sec</span>
            </div>
          </>
        )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mt-3 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[13px] text-[#991B1B]">
          {uploadError}
        </div>
      )}

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

      {/* Demo buttons */}
      <div className="mt-8 p-5 bg-white rounded-xl border border-bw-border">
        <div className="text-[13px] font-semibold text-bw-deep mb-2">💡 Demo: probeer met voorbeeldpolis</div>
        <p className="text-[13px] text-bw-text-mid mb-4">
          Geen PDF bij de hand? Kies een producttype en bekijk de analyse met voorbeelddata.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {PRODUCTS.map((p) => (
            <button
              key={p.type}
              onClick={() => router.push(`/analyse/demo?product=${p.type}`)}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-left bg-bw-bg border border-bw-border cursor-pointer font-[inherit] hover:bg-[#E2E8F0] hover:border-[#94A3B8] transition-all"
            >
              <span className="text-lg">{p.icon}</span>
              <div>
                <div className="text-[12px] font-semibold text-bw-deep">{p.label}</div>
                <div className="text-[11px] text-bw-text-light">{p.description}</div>
              </div>
              <ArrowRightIcon className="w-3 h-3 ml-auto text-bw-text-light" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Inline editable row component ──
function EditRow({ label, value, onChange, type = "text", prefix, options, placeholder }: {
  label: string;
  value: string | number;
  onChange: (v: string) => void;
  type?: "text" | "number";
  prefix?: string;
  options?: string[];
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[12px] text-bw-text-mid w-[100px] shrink-0">{label}</span>
      <div className="flex-1 flex items-center gap-1">
        {prefix && <span className="text-[13px] font-semibold text-bw-deep">{prefix}</span>}
        {options ? (
          <select
            value={String(value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2.5 py-1.5 rounded-lg border border-bw-border text-[13px] font-semibold text-bw-deep bg-white focus:outline-none focus:border-bw-green focus:ring-1 focus:ring-bw-green"
          >
            {options.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
            {/* Keep current value if not in options list */}
            {!options.includes(String(value)) && (
              <option value={String(value)}>{String(value)}</option>
            )}
          </select>
        ) : (
          <input
            type={type}
            value={type === "number" ? value : String(value)}
            onChange={(e) => onChange(e.target.value)}
            step={type === "number" ? "0.01" : undefined}
            placeholder={placeholder}
            className="w-full px-2.5 py-1.5 rounded-lg border border-bw-border text-[13px] font-semibold text-bw-deep focus:outline-none focus:border-bw-green focus:ring-1 focus:ring-bw-green"
          />
        )}
      </div>
    </div>
  );
}
