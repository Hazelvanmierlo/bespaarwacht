"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, LockIcon } from "@/components/icons";
import type { ProductType } from "@/lib/scrapers/base";
import type { PolisData } from "@/lib/types";

type DocCategory = "verzekering" | "energie";

interface EnergieData {
  leverancier: string;
  stroom_normaal_kwh: number;
  stroom_dal_kwh: number | null;
  stroom_kwh_jaar: number;
  gas_m3_jaar: number | null;
  kosten_maand: number;
  kosten_jaar: number;
  tarief_stroom_normaal: number;
  tarief_stroom_dal: number | null;
  tarief_gas_m3: number | null;
  teruglevering_kwh: number | null;
  contract_type: string;
  meter_type: string;
  contract_einddatum: string | null;
  naam: string | null;
  adres: string | null;
  ean_stroom: string | null;
  ean_gas: string | null;
  stroom_vorig_jaar_kwh: number | null;
}

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
const GEZIN_OPTIONS = ["Alleenstaand", "Gezin / samenwonend"];
const EIGENAAR_OPTIONS = ["Eigenaar", "Huurder"];

export default function UploadPage() {
  return (
    <Suspense fallback={<div className="max-w-[640px] mx-auto px-6 py-16 text-center text-bw-text-mid">Laden...</div>}>
      <UploadContent />
    </Suspense>
  );
}

function UploadContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductType>("inboedel");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Document category toggle
  const [docCategory, setDocCategory] = useState<DocCategory>("verzekering");

  // Set category from URL param
  useEffect(() => {
    const typeParam = searchParams.get("type");
    if (typeParam === "energie" || typeParam === "verzekering") {
      setDocCategory(typeParam);
    }
  }, [searchParams]);

  // Verzekering parsed data
  const [parsedData, setParsedData] = useState<PolisData | null>(null);
  const [detectedProduct, setDetectedProduct] = useState<ProductType>("inboedel");

  // Energie parsed data
  const [energieData, setEnergieData] = useState<EnergieData | null>(null);

  const handleFile = useCallback(async (file?: File) => {
    const pdfFile = file ?? fileRef.current?.files?.[0];

    if (!pdfFile) {
      if (docCategory === "verzekering") {
        router.push(`/analyse/demo?product=${selectedProduct}`);
      }
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
        setUploadError(json.error || "Fout bij het verwerken van het document.");
        setIsUploading(false);
        return;
      }

      if (json.type === "verzekering") {
        setParsedData(json.polisData);
        setDetectedProduct(json.productType);
        setEnergieData(null);
        setDocCategory("verzekering");
      } else if (json.type === "energie") {
        setEnergieData(json.energieData);
        setParsedData(null);
        setDocCategory("energie");
      }

      setIsUploading(false);
    } catch {
      setUploadError("Netwerkfout. Controleer je verbinding en probeer het opnieuw.");
      setIsUploading(false);
    }
  }, [router, selectedProduct, docCategory]);

  // Verzekering: confirm and analyze
  const handleConfirmAndAnalyze = () => {
    if (!parsedData) return;
    sessionStorage.setItem("bw-upload-polis", JSON.stringify(parsedData));
    sessionStorage.setItem("bw-upload-product", detectedProduct);
    router.push(`/analyse/demo?product=${detectedProduct}&source=upload`);
  };

  // Energie: confirm and go to results
  const handleEnergieConfirmAndAnalyze = () => {
    if (!energieData) return;
    // Convert WhatsApp-style energy data to the EnergieData format used by energie-analyse
    const convertedData = {
      leverancier: energieData.leverancier || null,
      contractType: energieData.contract_type === "vast" ? "Vast" : energieData.contract_type === "variabel" ? "Variabel" : "Dynamisch",
      einddatum: energieData.contract_einddatum || null,
      eanElektriciteit: energieData.ean_stroom || null,
      eanGas: energieData.ean_gas || null,
      verbruikKwhDal: energieData.stroom_dal_kwh,
      verbruikKwhPiek: energieData.stroom_normaal_kwh || null,
      verbruikKwhTotaal: energieData.stroom_kwh_jaar || null,
      terugleveringKwh: energieData.teruglevering_kwh,
      verbruikGasM3: energieData.gas_m3_jaar,
      kostenElektriciteitJaar: null,
      kostenGasJaar: null,
      kostenTotaalJaar: energieData.kosten_jaar || null,
      vastrecht: null,
      netbeheerkosten: null,
      bron: "Upload PDF",
      kwaliteit: "redelijk",
      ontbrekendeVelden: [],
    };
    sessionStorage.setItem("bw-upload-energie", JSON.stringify(convertedData));
    router.push("/energie-analyse?source=upload");
  };

  const handleReset = () => {
    setParsedData(null);
    setEnergieData(null);
    setUploadError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const updateField = (field: keyof PolisData, value: string | number) => {
    if (!parsedData) return;
    setParsedData({ ...parsedData, [field]: value });
  };

  const updateEnergieField = (field: keyof EnergieData, value: string | number | null) => {
    if (!energieData) return;
    setEnergieData({ ...energieData, [field]: value });
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

  // === ENERGIE CONFIRMATION VIEW ===
  if (energieData) {
    return (
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bw-green-bg to-[#D1FAE5] flex items-center justify-center text-xl shadow-[0_2px_8px_rgba(22,163,74,0.1)]">⚡</div>
          <div>
            <h2 className="font-heading text-[26px] font-bold text-bw-deep">Klopt dit?</h2>
            <p className="text-[14px] text-bw-text-mid">We hebben deze gegevens uit je energierekening gehaald. Pas aan indien nodig.</p>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-bw-border overflow-hidden mt-6">
          {/* Leverancier */}
          <div className="px-4 py-3 bg-[#F8FAFC] border-b border-bw-border">
            <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Contract</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <EditRow label="Leverancier" value={energieData.leverancier || ""} onChange={(v) => updateEnergieField("leverancier", v)} />
            <EditRow label="Contract" value={energieData.contract_type || ""} onChange={(v) => updateEnergieField("contract_type", v)}
              options={["vast", "variabel", "dynamisch"]} />
            <EditRow label="Einddatum" value={energieData.contract_einddatum || ""} onChange={(v) => updateEnergieField("contract_einddatum", v)} placeholder="YYYY-MM-DD" />
            <EditRow label="Maandkosten" value={energieData.kosten_maand || 0} type="number" prefix="€" onChange={(v) => {
              const num = parseFloat(v) || 0;
              updateEnergieField("kosten_maand", num);
              updateEnergieField("kosten_jaar", +(num * 12).toFixed(2));
            }} />
          </div>

          {/* Elektriciteit */}
          <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
            <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Elektriciteit</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <EditRow label="Totaal kWh/jaar" value={energieData.stroom_kwh_jaar || 0} type="number" onChange={(v) => updateEnergieField("stroom_kwh_jaar", parseFloat(v) || 0)} />
            <EditRow label="Normaal kWh" value={energieData.stroom_normaal_kwh || 0} type="number" onChange={(v) => updateEnergieField("stroom_normaal_kwh", parseFloat(v) || 0)} />
            {energieData.meter_type === "dubbel" && (
              <EditRow label="Dal kWh" value={energieData.stroom_dal_kwh || 0} type="number" onChange={(v) => updateEnergieField("stroom_dal_kwh", parseFloat(v) || 0)} />
            )}
            <EditRow label="Teruglevering kWh" value={energieData.teruglevering_kwh ?? ""} type="number" onChange={(v) => updateEnergieField("teruglevering_kwh", v ? parseFloat(v) : null)} />
            <EditRow label="Metertypes" value={energieData.meter_type || "enkel"} onChange={(v) => updateEnergieField("meter_type", v)} options={["enkel", "dubbel"]} />
          </div>

          {/* Gas */}
          <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
            <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Gas</span>
          </div>
          <div className="px-4 py-3 space-y-3">
            <EditRow label="Gas m³/jaar" value={energieData.gas_m3_jaar ?? ""} type="number" onChange={(v) => updateEnergieField("gas_m3_jaar", v ? parseFloat(v) : null)} />
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-3">
          <button
            onClick={handleEnergieConfirmAndAnalyze}
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold bg-bw-orange text-white border-none cursor-pointer font-[inherit] hover:bg-bw-orange-strong hover:shadow-[0_4px_16px_rgba(249,115,22,0.3)] transition-all"
          >
            Vergelijk leveranciers <ArrowRightIcon className="w-4 h-4" />
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
            <strong>Je bestand is al verwijderd.</strong> Alleen deze gegevens worden gebruikt voor de vergelijking.
          </span>
        </div>
      </div>
    );
  }

  // === VERZEKERING CONFIRMATION VIEW ===
  if (parsedData) {
    return (
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bw-blue-light to-[#DBEAFE] flex items-center justify-center text-xl shadow-[0_2px_8px_rgba(43,108,176,0.1)]">📄</div>
          <div>
            <h2 className="font-heading text-[26px] font-bold text-bw-deep">Klopt dit?</h2>
            <p className="text-[14px] text-bw-text-mid">We hebben deze gegevens uit je polis gehaald. Pas aan indien nodig.</p>
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
            className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold bg-bw-orange text-white border-none cursor-pointer font-[inherit] hover:bg-bw-orange-strong hover:shadow-[0_4px_16px_rgba(249,115,22,0.3)] transition-all"
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
    <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
      {/* Header with icon */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-gradient-to-br from-bw-green-bg to-bw-blue-light flex items-center justify-center mx-auto mb-3 sm:mb-4 text-[24px] sm:text-[28px]">
          {docCategory === "energie" ? "⚡" : "📄"}
        </div>
        <h2 className="font-heading text-[clamp(22px,3vw,32px)] font-bold text-bw-deep mb-2">
          {docCategory === "energie" ? "Energierekening uploaden" : "Polis uploaden"}
        </h2>
        <p className="text-[14px] sm:text-[15px] text-bw-text-mid max-w-[440px] mx-auto">
          {docCategory === "energie"
            ? "Upload je jaaroverzicht of energierekening. Wij vergelijken alle leveranciers."
            : "Upload je polisblad als PDF of foto. Wij vinden direct een betere deal."}
        </p>
      </div>

      {/* Category toggle */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="inline-flex rounded-xl bg-bw-bg p-1 border border-bw-border w-full sm:w-auto">
          <button
            onClick={() => setDocCategory("verzekering")}
            className={`flex-1 sm:flex-none px-5 py-3 sm:py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer border-none font-[inherit] ${
              docCategory === "verzekering"
                ? "bg-white text-bw-deep shadow-[var(--shadow-bw-card)]"
                : "bg-transparent text-bw-text-mid hover:text-bw-deep"
            }`}
          >
            Verzekeringen
          </button>
          <button
            onClick={() => setDocCategory("energie")}
            className={`flex-1 sm:flex-none px-5 py-3 sm:py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer border-none font-[inherit] ${
              docCategory === "energie"
                ? "bg-white text-bw-deep shadow-[var(--shadow-bw-card)]"
                : "bg-transparent text-bw-text-mid hover:text-bw-deep"
            }`}
          >
            Energie
          </button>
        </div>
      </div>

      {/* Product type selector — only for verzekeringen */}
      {docCategory === "verzekering" && (
        <div className="mb-6">
          <div className="text-[13px] font-semibold text-bw-deep mb-3">Welk type verzekering?</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.type}
                onClick={() => setSelectedProduct(p.type)}
                className={`flex items-center gap-3 p-3.5 sm:p-3 rounded-xl border text-left cursor-pointer font-[inherit] transition-all min-h-[48px] ${
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
      )}

      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl px-4 sm:px-8 py-10 sm:py-14 text-center cursor-pointer transition-all ${
          isUploading
            ? "border-bw-green bg-bw-green-bg/50 pointer-events-none"
            : isDragging
              ? "border-bw-green bg-bw-green-bg scale-[1.01]"
              : "border-[#CBD5E1] bg-white hover:border-bw-green/40 hover:bg-bw-green-bg/20"
        }`}
        onClick={() => !isUploading && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*" capture="environment" className="hidden" onChange={handleInputChange} />

        {isUploading ? (
          <>
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-bw-blue-light flex items-center justify-center mx-auto mb-4">
              <div className="w-7 sm:w-8 h-7 sm:h-8 border-3 border-bw-blue border-t-transparent rounded-full animate-spin" />
            </div>
            <div className="text-[15px] sm:text-[16px] font-bold text-bw-deep mb-1">Document wordt verwerkt...</div>
            <div className="text-[13px] sm:text-[14px] text-bw-text-mid">
              {docCategory === "energie"
                ? "Even geduld, we lezen je energierekening uit."
                : "Even geduld, we lezen je polis uit."}
            </div>
          </>
        ) : (
          <>
            <div className="w-14 sm:w-16 h-14 sm:h-16 rounded-2xl bg-gradient-to-br from-bw-blue-light to-[#DBEAFE] flex items-center justify-center mx-auto mb-4 sm:mb-5 shadow-[0_2px_8px_rgba(26,86,219,0.1)]">
              <svg className="w-6 sm:w-7 h-6 sm:h-7" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            {/* Mobile: emphasize tap/camera. Desktop: emphasize drag */}
            <div className="text-[15px] sm:text-[16px] font-bold text-bw-deep mb-1">
              <span className="sm:hidden">Tik om een foto of PDF te kiezen</span>
              <span className="hidden sm:inline">Sleep je bestand hierheen</span>
            </div>
            <div className="text-[13px] sm:text-[14px] text-bw-text-mid mb-2">
              <span className="sm:hidden">Maak een foto van je document of kies een bestand</span>
              <span className="hidden sm:inline">of <span className="text-bw-blue font-semibold underline underline-offset-2">klik om te selecteren</span></span>
            </div>
            <div className="text-[11px] sm:text-[12px] text-bw-text-light mb-4 sm:mb-5">PDF, JPG, PNG — max 10MB</div>
            <div className="flex justify-center gap-3 sm:gap-5 text-[11px] sm:text-[12px] text-bw-text-mid flex-wrap">
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-bw-bg flex items-center justify-center text-[10px] sm:text-[11px]">📄</span> PDF of foto</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-bw-bg flex items-center justify-center text-[10px] sm:text-[11px]">🔒</span> Veilig</span>
              <span className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-bw-bg flex items-center justify-center text-[10px] sm:text-[11px]">⚡</span> 5 sec</span>
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
      <div className="mt-6 p-5 bg-white rounded-2xl border border-bw-border shadow-[var(--shadow-bw-card)]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-bw-green-bg flex items-center justify-center shrink-0">
            <LockIcon />
          </div>
          <div>
            <div className="text-[14px] font-bold text-bw-deep mb-1">Wij slaan je bestand niet op</div>
            <div className="text-[13px] text-bw-text-mid leading-relaxed">
              Je bestand wordt alleen tijdelijk verwerkt om gegevens uit te lezen. Na analyse wordt het direct verwijderd. Conform AVG dataminimalisatie.
            </div>
          </div>
        </div>
      </div>

      {/* Demo buttons — only for verzekeringen */}
      {docCategory === "verzekering" && (
        <div className="mt-8 p-5 bg-white rounded-xl border border-bw-border">
          <div className="text-[13px] font-semibold text-bw-deep mb-2">💡 Demo: probeer met voorbeeldpolis</div>
          <p className="text-[13px] text-bw-text-mid mb-4">
            Geen PDF bij de hand? Kies een producttype en bekijk de analyse met voorbeelddata.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.type}
                onClick={() => router.push(`/analyse/demo?product=${p.type}`)}
                className="flex items-center gap-3 px-4 py-3.5 sm:py-3 rounded-lg text-left bg-bw-bg border border-bw-border cursor-pointer font-[inherit] hover:bg-[#E2E8F0] hover:border-[#94A3B8] transition-all min-h-[48px]"
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
      )}
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
      <span className="text-[12px] text-bw-text-mid w-[80px] sm:w-[100px] shrink-0">{label}</span>
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
