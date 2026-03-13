"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, LockIcon, Home, Building2, ShieldCheck, Plane, Zap, FileText, ClipboardList, CircleCheckBig } from "@/components/icons";
import type { ReactNode } from "react";
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

const PRODUCTS: { type: ProductType; label: string; icon: ReactNode; description: string }[] = [
  { type: "inboedel", label: "Inboedelverzekering", icon: <Home className="w-5 h-5" />, description: "OHRA — € 17,53/mnd" },
  { type: "opstal", label: "Opstalverzekering", icon: <Building2 className="w-5 h-5" />, description: "OHRA — € 19,00/mnd" },
  { type: "aansprakelijkheid", label: "Aansprakelijkheid (AVP)", icon: <ShieldCheck className="w-5 h-5" />, description: "Centraal Beheer — € 4,40/mnd" },
  { type: "reis", label: "Reisverzekering", icon: <Plane className="w-5 h-5" />, description: "FBTO — € 10,00/mnd" },
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

  // Manual input picker visibility (verzekering only)
  const [showManualPicker, setShowManualPicker] = useState(false);

  // Check if this is manual input (no file was uploaded)
  const isManualInput = energieData?.leverancier === "" && energieData?.kosten_maand === 0 && !parsedData;
  const isManualInputVerzekering = parsedData?.verzekeraar === "" && parsedData?.maandpremie === 0;

  // Energie wizard step (0 = leverancier, 1 = verbruik, 2 = bevestig)
  const [energieStep, setEnergieStep] = useState(0);

  // Auto-advance to step 1 if data came from PDF (not manual)
  const energieFromPdf = energieData && !isManualInput;

  const ENERGIE_STEPS = [
    { label: "Leverancier", description: "Je huidige contract" },
    { label: "Verbruik", description: "Stroom & gas" },
    { label: "Vergelijk", description: "Bekijk resultaat" },
  ];

  // === ENERGIE CONFIRMATION VIEW ===
  if (energieData) {
    // If data came from PDF upload, show all-in-one confirmation
    if (energieFromPdf) {
      return (
        <div className="max-w-[540px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bw-green-bg to-[#D1FAE5] flex items-center justify-center shadow-[0_2px_8px_rgba(22,163,74,0.1)]"><Zap className="w-5 h-5 text-bw-green" /></div>
            <div>
              <h2 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep">Klopt dit?</h2>
              <p className="text-[13px] sm:text-[14px] text-bw-text-mid">Gegevens uit je energierekening. Pas aan indien nodig.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-bw-border overflow-hidden">
            {/* Personal info (if extracted from PDF) */}
            {(energieData.naam || energieData.adres) && (
              <>
                <div className="px-4 py-3 bg-[#F8FAFC] border-b border-bw-border">
                  <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Persoonsgegevens</span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {energieData.naam && <EditRow label="Naam" value={energieData.naam} onChange={(v) => updateEnergieField("naam", v)} />}
                  {energieData.adres && <EditRow label="Adres" value={energieData.adres} onChange={(v) => updateEnergieField("adres", v)} />}
                </div>
              </>
            )}

            {/* Contract */}
            <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
              <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Contract</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <EditRow label="Leverancier" value={energieData.leverancier || ""} onChange={(v) => updateEnergieField("leverancier", v)} />
              <EditRow label="Contract" value={energieData.contract_type || ""} onChange={(v) => updateEnergieField("contract_type", v)} options={["vast", "variabel", "dynamisch"]} />
              {energieData.contract_einddatum && (
                <EditRow label="Einddatum" value={energieData.contract_einddatum} onChange={(v) => updateEnergieField("contract_einddatum", v)} />
              )}
              <EditRow label="Maandkosten" value={energieData.kosten_maand || 0} type="number" prefix="€" onChange={(v) => { const num = parseFloat(v) || 0; updateEnergieField("kosten_maand", num); updateEnergieField("kosten_jaar", +(num * 12).toFixed(2)); }} />
            </div>

            {/* Usage */}
            <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
              <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Verbruik</span>
            </div>
            <div className="px-4 py-3 space-y-3">
              <EditRow label="Stroom" value={energieData.stroom_kwh_jaar || 0} type="number" onChange={(v) => { const num = parseFloat(v) || 0; updateEnergieField("stroom_kwh_jaar", num); updateEnergieField("stroom_normaal_kwh", num); }} />
              {energieData.stroom_dal_kwh != null && energieData.stroom_dal_kwh > 0 && (
                <EditRow label="Stroom dal" value={energieData.stroom_dal_kwh} type="number" onChange={(v) => updateEnergieField("stroom_dal_kwh", parseFloat(v) || null)} />
              )}
              <EditRow label="Gas" value={energieData.gas_m3_jaar ?? ""} type="number" onChange={(v) => updateEnergieField("gas_m3_jaar", v ? parseFloat(v) : null)} />
              {energieData.teruglevering_kwh != null && energieData.teruglevering_kwh > 0 && (
                <EditRow label="Teruglevering" value={energieData.teruglevering_kwh} type="number" onChange={(v) => updateEnergieField("teruglevering_kwh", parseFloat(v) || null)} />
              )}
            </div>

            {/* EAN numbers (read-only display) */}
            {(energieData.ean_stroom || energieData.ean_gas) && (
              <>
                <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
                  <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Aansluitgegevens</span>
                  <span className="text-[10px] text-bw-text-light ml-1">(handig bij overstappen)</span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {energieData.ean_stroom && <EditRow label="EAN stroom" value={energieData.ean_stroom} />}
                  {energieData.ean_gas && <EditRow label="EAN gas" value={energieData.ean_gas} />}
                  {energieData.meter_type && <EditRow label="Meter" value={energieData.meter_type} />}
                </div>
              </>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button onClick={handleEnergieConfirmAndAnalyze} className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold bg-bw-green text-white border-none cursor-pointer font-[inherit] hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.25)] transition-all">
              Ja, vergelijk leveranciers <ArrowRightIcon className="w-4 h-4" />
            </button>
            <button onClick={handleReset} className="inline-flex items-center px-4 py-3.5 rounded-xl text-[13px] font-semibold bg-white text-bw-text-mid border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors">
              Opnieuw
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
            <LockIcon className="w-3.5 h-3.5 text-bw-green shrink-0" />
            <span className="text-[11px] text-bw-green-dark"><strong>Je bestand is al verwijderd.</strong> Alleen deze gegevens worden gebruikt.</span>
          </div>
        </div>
      );
    }

    // Manual input: step-by-step wizard
    return (
      <div className="max-w-[540px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            {ENERGIE_STEPS.map((step, i) => (
              <div key={step.label} className="flex items-center gap-2 flex-1">
                <div className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 transition-all ${
                  i < energieStep ? "bg-bw-green text-white" : i === energieStep ? "bg-bw-blue text-white shadow-[0_0_0_3px_rgba(26,86,219,0.15)]" : "bg-bw-bg text-bw-text-light"
                }`}>
                  {i < energieStep ? <CircleCheckBig className="w-4 h-4" /> : i + 1}
                </div>
                {i < ENERGIE_STEPS.length - 1 && (
                  <div className={`flex-1 h-[2px] rounded-full transition-all ${i < energieStep ? "bg-bw-green" : "bg-bw-border"}`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between">
            {ENERGIE_STEPS.map((step, i) => (
              <div key={step.label} className={`text-center flex-1 ${i === energieStep ? "text-bw-deep" : "text-bw-text-light"}`}>
                <div className={`text-[11px] sm:text-[12px] font-semibold ${i === energieStep ? "text-bw-deep" : ""}`}>{step.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        {energieStep === 0 && (
          <div>
            <h2 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep mb-1">Bij welke leverancier zit je?</h2>
            <p className="text-[13px] sm:text-[14px] text-bw-text-mid mb-6">Vul je huidige energieleverancier en contractgegevens in.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-bw-deep mb-1.5 block">Huidige leverancier</label>
                <select
                  value={energieData.leverancier || ""}
                  onChange={(e) => updateEnergieField("leverancier", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-bw-border text-[14px] text-bw-deep bg-white focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20"
                >
                  <option value="">Selecteer je leverancier...</option>
                  {["Budget Energie", "Eneco", "Essent", "Greenchoice", "Oxxio", "Vattenfall", "Vandebron", "Engie", "Nederlandse Energie Maatschappij", "Mega", "Frank Energie", "Tibber", "UnitedConsumers", "Coolblue Energie", "Pure Energie", "HEM", "NextEnergy", "Anders"].map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-bw-deep mb-1.5 block">Type contract</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["vast", "variabel", "dynamisch"] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => updateEnergieField("contract_type", type)}
                      className={`px-3 py-2.5 rounded-xl border text-[13px] font-semibold cursor-pointer font-[inherit] transition-all ${
                        energieData.contract_type === type
                          ? "border-bw-green bg-bw-green-bg text-bw-green-strong shadow-[0_0_0_1px_#16A34A]"
                          : "border-bw-border bg-white text-bw-deep hover:border-[#94A3B8]"
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-bw-deep mb-1.5 block">Wat betaal je per maand? <span className="font-normal text-bw-text-light">(schatting is ok)</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-bw-text-mid">€</span>
                  <input
                    type="number"
                    value={energieData.kosten_maand || ""}
                    onChange={(e) => { const num = parseFloat(e.target.value) || 0; updateEnergieField("kosten_maand", num); updateEnergieField("kosten_jaar", +(num * 12).toFixed(2)); }}
                    placeholder="bijv. 180"
                    className="w-full pl-9 pr-16 py-3 rounded-xl border border-bw-border text-[14px] text-bw-deep focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-bw-text-light">per maand</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setEnergieStep(1)}
              className="mt-6 w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold bg-bw-blue text-white border-none cursor-pointer font-[inherit] hover:bg-[#1E40AF] transition-all"
            >
              Volgende: verbruik invullen <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {energieStep === 1 && (
          <div>
            <h2 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep mb-1">Hoeveel verbruik je?</h2>
            <p className="text-[13px] sm:text-[14px] text-bw-text-mid mb-6">Dit staat op je jaaroverzicht of energierekening. Weet je het niet precies? Een schatting is voldoende.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-bw-deep mb-1.5 block">Stroomverbruik per jaar</label>
                <div className="relative">
                  <input
                    type="number"
                    value={energieData.stroom_kwh_jaar || ""}
                    onChange={(e) => { const num = parseFloat(e.target.value) || 0; updateEnergieField("stroom_kwh_jaar", num); updateEnergieField("stroom_normaal_kwh", num); }}
                    placeholder="bijv. 2500"
                    className="w-full px-4 pr-16 py-3 rounded-xl border border-bw-border text-[14px] text-bw-deep focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-bw-text-light">kWh/jaar</span>
                </div>
                <div className="mt-1.5 flex gap-2">
                  {[1500, 2500, 4000, 6000].map((v) => (
                    <button key={v} onClick={() => { updateEnergieField("stroom_kwh_jaar", v); updateEnergieField("stroom_normaal_kwh", v); }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer font-[inherit] transition-all ${
                        energieData.stroom_kwh_jaar === v ? "bg-bw-blue text-white" : "bg-bw-bg text-bw-text-mid border border-bw-border hover:bg-[#E2E8F0]"
                      }`}>
                      {v.toLocaleString("nl-NL")}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-bw-text-light mt-1">Gemiddeld: alleenstaand ~1.500 · huishouden ~2.500 · groot gezin ~4.000+</div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-bw-deep mb-1.5 block">Gasverbruik per jaar <span className="font-normal text-bw-text-light">(geen gas? Laat leeg)</span></label>
                <div className="relative">
                  <input
                    type="number"
                    value={energieData.gas_m3_jaar ?? ""}
                    onChange={(e) => updateEnergieField("gas_m3_jaar", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="bijv. 1200"
                    className="w-full px-4 pr-16 py-3 rounded-xl border border-bw-border text-[14px] text-bw-deep focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-bw-text-light">m³/jaar</span>
                </div>
                <div className="mt-1.5 flex gap-2">
                  {[800, 1200, 1800, 2500].map((v) => (
                    <button key={v} onClick={() => updateEnergieField("gas_m3_jaar", v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer font-[inherit] transition-all ${
                        energieData.gas_m3_jaar === v ? "bg-bw-blue text-white" : "bg-bw-bg text-bw-text-mid border border-bw-border hover:bg-[#E2E8F0]"
                      }`}>
                      {v.toLocaleString("nl-NL")}
                    </button>
                  ))}
                </div>
                <div className="text-[10px] text-bw-text-light mt-1">Gemiddeld: appartement ~800 · tussenwoning ~1.200 · vrijstaand ~2.000+</div>
              </div>

              <div>
                <label className="text-[13px] font-semibold text-bw-deep mb-1.5 block">Zonnepanelen? <span className="font-normal text-bw-text-light">(optioneel)</span></label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => updateEnergieField("teruglevering_kwh", null)}
                    className={`px-3 py-2.5 rounded-xl border text-[13px] font-semibold cursor-pointer font-[inherit] transition-all ${
                      !energieData.teruglevering_kwh ? "border-bw-green bg-bw-green-bg text-bw-green-strong shadow-[0_0_0_1px_#16A34A]" : "border-bw-border bg-white text-bw-deep hover:border-[#94A3B8]"
                    }`}>
                    Nee
                  </button>
                  <button
                    onClick={() => updateEnergieField("teruglevering_kwh", energieData.teruglevering_kwh || 1500)}
                    className={`px-3 py-2.5 rounded-xl border text-[13px] font-semibold cursor-pointer font-[inherit] transition-all ${
                      energieData.teruglevering_kwh ? "border-bw-green bg-bw-green-bg text-bw-green-strong shadow-[0_0_0_1px_#16A34A]" : "border-bw-border bg-white text-bw-deep hover:border-[#94A3B8]"
                    }`}>
                    Ja
                  </button>
                </div>
                {energieData.teruglevering_kwh && (
                  <div className="mt-2 relative">
                    <input
                      type="number"
                      value={energieData.teruglevering_kwh}
                      onChange={(e) => updateEnergieField("teruglevering_kwh", parseFloat(e.target.value) || null)}
                      placeholder="bijv. 1500"
                      className="w-full px-4 pr-24 py-3 rounded-xl border border-bw-border text-[14px] text-bw-deep focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-bw-text-light">kWh teruglevering</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setEnergieStep(0)}
                className="inline-flex items-center px-4 py-3.5 rounded-xl text-[13px] font-semibold bg-white text-bw-text-mid border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
              >
                Terug
              </button>
              <button
                onClick={() => setEnergieStep(2)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold bg-bw-blue text-white border-none cursor-pointer font-[inherit] hover:bg-[#1E40AF] transition-all"
              >
                Volgende: bekijk resultaat <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {energieStep === 2 && (
          <div>
            <h2 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep mb-1">Alles klaar!</h2>
            <p className="text-[13px] sm:text-[14px] text-bw-text-mid mb-6">Controleer je gegevens en vergelijk direct alle leveranciers.</p>

            {/* Summary */}
            <div className="bg-white rounded-xl border border-bw-border overflow-hidden mb-6">
              <div className="divide-y divide-bw-border">
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-[13px] text-bw-text-mid">Leverancier</span>
                  <span className="text-[13px] font-semibold text-bw-deep">{energieData.leverancier || "Niet ingevuld"}</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-[13px] text-bw-text-mid">Contract</span>
                  <span className="text-[13px] font-semibold text-bw-deep capitalize">{energieData.contract_type}</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-[13px] text-bw-text-mid">Maandkosten</span>
                  <span className="text-[13px] font-semibold text-bw-deep">€ {energieData.kosten_maand || 0}</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-[13px] text-bw-text-mid">Stroom</span>
                  <span className="text-[13px] font-semibold text-bw-deep">{energieData.stroom_kwh_jaar?.toLocaleString("nl-NL")} kWh/jaar</span>
                </div>
                <div className="px-4 py-3 flex justify-between items-center">
                  <span className="text-[13px] text-bw-text-mid">Gas</span>
                  <span className="text-[13px] font-semibold text-bw-deep">{energieData.gas_m3_jaar ? `${energieData.gas_m3_jaar.toLocaleString("nl-NL")} m³/jaar` : "Geen gas"}</span>
                </div>
                {energieData.teruglevering_kwh && (
                  <div className="px-4 py-3 flex justify-between items-center">
                    <span className="text-[13px] text-bw-text-mid">Zonnepanelen</span>
                    <span className="text-[13px] font-semibold text-bw-deep">{energieData.teruglevering_kwh.toLocaleString("nl-NL")} kWh teruglevering</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEnergieStep(1)}
                className="inline-flex items-center px-4 py-3.5 rounded-xl text-[13px] font-semibold bg-white text-bw-text-mid border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
              >
                Terug
              </button>
              <button
                onClick={handleEnergieConfirmAndAnalyze}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold bg-bw-green text-white border-none cursor-pointer font-[inherit] hover:bg-bw-green-strong hover:shadow-[0_4px_16px_rgba(22,163,74,0.25)] transition-all"
              >
                Vergelijk alle leveranciers <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2 px-3 py-2 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
              <LockIcon className="w-3.5 h-3.5 text-bw-green shrink-0" />
              <span className="text-[11px] text-bw-green-dark"><strong>Privacy gewaarborgd.</strong> Je gegevens worden alleen gebruikt voor deze vergelijking.</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === VERZEKERING CONFIRMATION VIEW ===
  if (parsedData) {
    return (
      <div className="max-w-[680px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-bw-blue-light to-[#DBEAFE] flex items-center justify-center shadow-[0_2px_8px_rgba(43,108,176,0.1)]">
            {isManualInputVerzekering ? <ClipboardList className="w-5 h-5 text-bw-blue" /> : <FileText className="w-5 h-5 text-bw-blue" />}
          </div>
          <div>
            <h2 className="font-heading text-[26px] font-bold text-bw-deep">
              {isManualInputVerzekering ? "Vul je gegevens in" : "Klopt dit?"}
            </h2>
            <p className="text-[14px] text-bw-text-mid">
              {isManualInputVerzekering
                ? "Vul je huidige verzekeringsgegevens in en ontdek of je goedkoper uit kunt."
                : "We hebben deze gegevens uit je polis gehaald. Pas aan indien nodig."}
            </p>
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
            {isManualInputVerzekering
              ? <><strong>Privacy gewaarborgd.</strong> Je gegevens worden alleen gebruikt voor deze vergelijking.</>
              : <><strong>Je PDF is al verwijderd.</strong> Alleen deze gegevens worden gebruikt voor de vergelijking.</>}
          </span>
        </div>
      </div>
    );
  }

  // === UPLOAD VIEW ===
  return (
    <div className="max-w-[580px] mx-auto px-4 sm:px-6 py-8 sm:py-16">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="font-heading text-[clamp(22px,3vw,30px)] font-bold text-bw-deep mb-2">
          {docCategory === "energie" ? "Bespaar op je energierekening" : "Betaal je te veel voor je verzekering?"}
        </h2>
        <p className="text-[14px] sm:text-[15px] text-bw-text-mid max-w-[440px] mx-auto">
          {docCategory === "energie"
            ? "Upload je energierekening en wij vergelijken direct alle leveranciers."
            : "Upload je polisblad en wij vinden direct of het goedkoper kan."}
        </p>

        {/* Progress bar steps */}
        <div className="mt-5 mx-auto max-w-[440px] px-4">
          {/* Bar track + dots */}
          <div className="relative flex items-center justify-between mb-2">
            <div className="absolute top-1/2 left-[8%] right-[8%] h-[3px] -translate-y-1/2 rounded-full bg-gradient-to-r from-bw-blue via-bw-blue to-bw-green" />
            <div className="relative z-10 flex-1 flex justify-between">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-bw-blue text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shadow-[0_0_0_3px_white,0_0_0_4px_rgba(26,86,219,0.15)]">1</div>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-bw-blue text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shadow-[0_0_0_3px_white,0_0_0_4px_rgba(26,86,219,0.15)]">2</div>
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-bw-green text-white text-[10px] sm:text-[11px] font-bold flex items-center justify-center shadow-[0_0_0_3px_white,0_0_0_4px_rgba(22,163,74,0.15)]">3</div>
            </div>
          </div>
          {/* Labels */}
          <div className="flex justify-between text-center">
            <div className="flex-1">
              <div className="text-[11px] sm:text-[12px] font-semibold text-bw-deep">Upload</div>
              <div className="text-[9px] sm:text-[10px] text-bw-text-light hidden sm:block">PDF of foto</div>
            </div>
            <div className="flex-1">
              <div className="text-[11px] sm:text-[12px] font-semibold text-bw-deep">Vergelijk</div>
              <div className="text-[9px] sm:text-[10px] text-bw-text-light">{docCategory === "energie" ? "18+ aanbieders" : "12+ verzekeraars"}</div>
            </div>
            <div className="flex-1">
              <div className="text-[11px] sm:text-[12px] font-semibold text-bw-deep">Bespaar</div>
              <div className="text-[9px] sm:text-[10px] text-bw-green font-semibold">binnen 2 min</div>
            </div>
          </div>
        </div>
      </div>

      {/* Category toggle */}
      <div className="flex justify-center mb-6 sm:mb-8">
        <div className="inline-flex rounded-xl bg-bw-bg p-1 border border-bw-border">
          <button
            onClick={() => setDocCategory("verzekering")}
            className={`px-5 py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer border-none font-[inherit] ${
              docCategory === "verzekering"
                ? "bg-white text-bw-deep shadow-[var(--shadow-bw-card)]"
                : "bg-transparent text-bw-text-mid hover:text-bw-deep"
            }`}
          >
            Verzekeringen
          </button>
          <button
            onClick={() => setDocCategory("energie")}
            className={`px-5 py-2.5 text-[13px] font-semibold rounded-lg transition-all cursor-pointer border-none font-[inherit] ${
              docCategory === "energie"
                ? "bg-white text-bw-deep shadow-[var(--shadow-bw-card)]"
                : "bg-transparent text-bw-text-mid hover:text-bw-deep"
            }`}
          >
            Energie
          </button>
        </div>
      </div>

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
        <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*" className="hidden" onChange={handleInputChange} />

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
            <div className="text-[15px] sm:text-[16px] font-bold text-bw-deep mb-1">
              <span className="sm:hidden">Tik om een foto of PDF te kiezen</span>
              <span className="hidden sm:inline">Sleep je bestand hierheen</span>
            </div>
            <div className="text-[13px] sm:text-[14px] text-bw-text-mid mb-2">
              <span className="sm:hidden">Maak een foto van je document of kies een bestand</span>
              <span className="hidden sm:inline">of <span className="text-bw-blue font-semibold underline underline-offset-2">klik om te selecteren</span></span>
            </div>
            <div className="text-[11px] sm:text-[12px] text-bw-text-light">PDF, JPG, PNG — max 10MB</div>
          </>
        )}
      </div>

      {/* Inline trust signals */}
      <div className="mt-3 flex justify-center gap-4 sm:gap-6 text-[11px] sm:text-[12px] text-bw-text-mid">
        <span className="flex items-center gap-1.5"><LockIcon className="w-3.5 h-3.5 text-bw-green" /> Bestand wordt niet opgeslagen</span>
        <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-bw-text-mid" /> Klaar in 5 sec</span>
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mt-3 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[13px] text-[#991B1B]">
          {uploadError}
        </div>
      )}

      {/* Manual input divider */}
      <div className="mt-8 flex items-center gap-3">
        <div className="flex-1 h-px bg-bw-border" />
        <span className="text-[12px] text-bw-text-light font-medium">of</span>
        <div className="flex-1 h-px bg-bw-border" />
      </div>

      {/* Manual input option — compact */}
      {!showManualPicker ? (
        <button
          onClick={() => {
            if (docCategory === "energie") {
              setEnergieData({
                leverancier: "",
                stroom_normaal_kwh: 2500,
                stroom_dal_kwh: null,
                stroom_kwh_jaar: 2500,
                gas_m3_jaar: 1200,
                kosten_maand: 0,
                kosten_jaar: 0,
                tarief_stroom_normaal: 0,
                tarief_stroom_dal: null,
                tarief_gas_m3: null,
                teruglevering_kwh: null,
                contract_type: "variabel",
                meter_type: "enkel",
                contract_einddatum: null,
                naam: null,
                adres: null,
                ean_stroom: null,
                ean_gas: null,
                stroom_vorig_jaar_kwh: null,
              });
            } else {
              setShowManualPicker(true);
            }
          }}
          className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl text-[14px] font-semibold text-bw-text-mid bg-white border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg hover:border-[#94A3B8] transition-all"
        >
          <ClipboardList className="w-4 h-4" />
          {docCategory === "energie" ? "Vul handmatig in" : "Geen polisblad? Vul handmatig in"}
          <span className="text-[11px] font-normal text-bw-text-light ml-1">— duurt 2 min</span>
        </button>
      ) : (
        <div className="mt-4">
          <div className="text-[13px] font-semibold text-bw-deep mb-3">Welke verzekering wil je vergelijken?</div>
          <div className="grid grid-cols-2 gap-2">
            {PRODUCTS.map((p) => (
              <button
                key={p.type}
                onClick={() => {
                  setParsedData({
                    verzekeraar: "",
                    maandpremie: 0,
                    jaarpremie: 0,
                    dekking: p.type === "inboedel" || p.type === "opstal" ? "Uitgebreid" : "",
                    eigenRisico: "€ 0",
                    postcode: "",
                    woning: "Tussenwoning",
                    oppervlakte: "",
                    gezin: "Gezin / samenwonend",
                    ingangsdatum: "",
                    opzegtermijn: "",
                    bouwaard: "",
                    naam: "",
                    adres: "",
                    polisnummer: "",
                    geboortedatum: "",
                    huisnummer: "",
                    eigenaar: "Eigenaar",
                    type: PRODUCT_LABELS[p.type],
                  } as PolisData);
                  setDetectedProduct(p.type);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-bw-border bg-white text-left cursor-pointer font-[inherit] hover:border-[#94A3B8] hover:bg-bw-bg transition-all"
              >
                <span className="text-bw-blue">{p.icon}</span>
                <span className="text-[13px] font-semibold text-bw-deep">{p.label}</span>
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
