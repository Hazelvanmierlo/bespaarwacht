"use client";

import { useRef, useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightIcon, LockIcon, Home, Building2, ShieldCheck, Plane, Zap, FileText, ClipboardList, CircleCheckBig } from "@/components/icons";
import type { ReactNode } from "react";
import type { ProductType } from "@/lib/scrapers/base";
import type { PolisData } from "@/lib/types";
import { applyPeriodChoice } from "@/lib/polis-validation";

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
        if (json.unsupported) {
          setUploadError(json.unsupportedMessage || "Dit type verzekering vergelijken we nog niet.");
          setIsUploading(false);
          return;
        }
        const pd = json.polisData;
        // Check if this is a conditions-only document (no personal/policy data)
        const hasPremie = (pd.maandpremie && pd.maandpremie > 0) || (pd.jaarpremie && pd.jaarpremie > 0);
        const hasVerzekeraar = pd.verzekeraar && pd.verzekeraar.trim() !== "";
        const hasNaam = pd.naam && pd.naam.trim() !== "";

        if (!hasPremie && !hasNaam) {
          // This is likely a conditions document, not a personal policy
          // Set empty polisData so the manual form appears
          setParsedData({
            ...pd,
            verzekeraar: pd.verzekeraar || "",
            maandpremie: 0,
            jaarpremie: 0,
            naam: "",
            _needsManualInput: true,
            _reason: !hasPremie && !hasVerzekeraar
              ? "Dit lijkt een voorwaardendocument te zijn, geen persoonlijke polis. Vul hieronder je gegevens in zodat we je polis kunnen vergelijken."
              : !hasPremie
              ? "We konden geen premie vinden in je document. Vul je premie in zodat we kunnen vergelijken."
              : "We missen een paar gegevens om je polis te vergelijken.",
          });
        } else {
          setParsedData(pd);
        }
        setDetectedProduct(json.productType);
        setEnergieData(null);
        setDocCategory("verzekering");
      } else if (json.type === "energie") {
        const ed = json.energieData;
        const hasKosten = (ed.kosten_maand && ed.kosten_maand > 0) || (ed.kosten_jaar && ed.kosten_jaar > 0);

        if (!hasKosten) {
          setEnergieData({
            ...ed,
            leverancier: ed.leverancier || "",
            kosten_maand: 0,
            _needsManualInput: true,
            _reason: "We konden geen kosten vinden in je document. Vul je maandbedrag in.",
          });
        } else {
          setEnergieData(ed);
        }
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
    setShowEnergieEdit(false);
    setShowEditFields(false);
    setEnergieStep(0);
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
  const isManualInputVerzekering = (parsedData?.verzekeraar === "" && parsedData?.maandpremie === 0) || !!(parsedData as unknown as Record<string, unknown>)?._needsManualInput;

  // Energie wizard step (0 = huishouden, 1 = leverancier, 2 = bevestig)
  const [energieStep, setEnergieStep] = useState(0);

  // Verzekering edit fields toggle (must be at top level, not inside conditional)
  const [showEditFields, setShowEditFields] = useState(false);
  const [showEnergieEdit, setShowEnergieEdit] = useState(false);

  // Estimation profile state
  const [aantalPersonen, setAantalPersonen] = useState<number | null>(null);
  const [woningType, setWoningType] = useState<string | null>(null);
  const [heeftZonnepanelen, setHeeftZonnepanelen] = useState(false);
  const [showVerbruikDetails, setShowVerbruikDetails] = useState(false);

  // Auto-advance to step 1 if data came from PDF (not manual)
  const energieFromPdf = energieData && !isManualInput;

  const ENERGIE_STEPS = [
    { label: "Huishouden", description: "Wie wonen er?" },
    { label: "Contract", description: "Je leverancier" },
    { label: "Vergelijk", description: "Bekijk resultaat" },
  ];

  // Estimation lookup table: [personen][woningtype] → { stroom, gas }
  const VERBRUIK_SCHATTINGEN: Record<number, Record<string, { stroom: number; gas: number }>> = {
    1: { appartement: { stroom: 1300, gas: 600 }, tussenwoning: { stroom: 1500, gas: 900 }, hoekwoning: { stroom: 1600, gas: 1000 }, vrijstaand: { stroom: 1800, gas: 1200 }, "2-onder-1-kap": { stroom: 1700, gas: 1100 } },
    2: { appartement: { stroom: 2200, gas: 800 }, tussenwoning: { stroom: 2500, gas: 1200 }, hoekwoning: { stroom: 2700, gas: 1400 }, vrijstaand: { stroom: 3000, gas: 1700 }, "2-onder-1-kap": { stroom: 2800, gas: 1500 } },
    3: { appartement: { stroom: 3000, gas: 1000 }, tussenwoning: { stroom: 3300, gas: 1400 }, hoekwoning: { stroom: 3500, gas: 1600 }, vrijstaand: { stroom: 3800, gas: 1900 }, "2-onder-1-kap": { stroom: 3600, gas: 1700 } },
    4: { appartement: { stroom: 3600, gas: 1100 }, tussenwoning: { stroom: 4000, gas: 1600 }, hoekwoning: { stroom: 4200, gas: 1800 }, vrijstaand: { stroom: 4600, gas: 2200 }, "2-onder-1-kap": { stroom: 4300, gas: 2000 } },
    5: { appartement: { stroom: 4200, gas: 1300 }, tussenwoning: { stroom: 4700, gas: 1800 }, hoekwoning: { stroom: 5000, gas: 2100 }, vrijstaand: { stroom: 5500, gas: 2600 }, "2-onder-1-kap": { stroom: 5200, gas: 2300 } },
  };

  const applyEstimation = (personen: number, woning: string, zonne: boolean) => {
    const entry = VERBRUIK_SCHATTINGEN[Math.min(personen, 5)]?.[woning];
    if (!entry || !energieData) return;
    const stroom = entry.stroom;
    const gas = entry.gas;
    // Rough cost estimate: €0.30/kWh stroom + €1.30/m³ gas + €30/mnd vastrecht
    const maand = Math.round(((stroom * 0.30) + (gas * 1.30)) / 12 + 30);
    updateEnergieField("stroom_kwh_jaar", stroom);
    updateEnergieField("stroom_normaal_kwh", stroom);
    updateEnergieField("gas_m3_jaar", gas);
    updateEnergieField("kosten_maand", maand);
    updateEnergieField("kosten_jaar", maand * 12);
    if (zonne) {
      updateEnergieField("teruglevering_kwh", Math.round(stroom * 0.4));
    } else {
      updateEnergieField("teruglevering_kwh", null);
    }
  };

  // === ENERGIE CONFIRMATION VIEW ===
  if (energieData) {
    // If data came from PDF upload, show all-in-one confirmation
    if (energieFromPdf) {
      const jaarkosten = energieData.kosten_jaar || (energieData.kosten_maand ? energieData.kosten_maand * 12 : 0);

      return (
        <div className="max-w-[580px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
          {/* Success header with animation */}
          <div className="text-center mb-6 animate-fadeUp">
            <div className="inline-flex items-center gap-1.5 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-full text-[12px] font-bold mb-3">
              <CircleCheckBig className="w-3.5 h-3.5" /> Document succesvol uitgelezen
            </div>
            <h2 className="font-heading text-[24px] sm:text-[30px] font-bold text-bw-deep mb-1">
              Controleer je gegevens
            </h2>
            <p className="text-[14px] text-bw-text-mid">Klopt alles? Dan vergelijken we direct 18+ leveranciers.</p>
          </div>

          {/* Big highlight card — current cost */}
          {jaarkosten > 0 && (
            <div className="bg-gradient-to-br from-bw-deep to-bw-navy rounded-2xl p-5 sm:p-6 mb-5 text-white animate-fadeUp" style={{ animationDelay: "0.05s" }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[12px] text-white/60 mb-0.5">Je betaalt nu</div>
                  <div className="font-heading text-[32px] sm:text-[38px] font-bold leading-tight">
                    &euro;{Math.round(jaarkosten).toLocaleString("nl-NL")}<span className="text-[16px] font-semibold text-white/50">/jaar</span>
                  </div>
                  <div className="text-[13px] text-white/50 mt-0.5">= &euro;{(jaarkosten / 12).toFixed(0)}/maand bij {energieData.leverancier || "je leverancier"}</div>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                  <Zap className="w-7 h-7 text-[#4ADE80]" />
                </div>
              </div>
            </div>
          )}

          {/* Summary cards — shown when NOT editing */}
          {!showEnergieEdit && (
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 mb-5 animate-fadeUp" style={{ animationDelay: "0.1s" }}>
              {/* Contract card */}
              <div className="bg-white rounded-xl border border-bw-border p-4">
                <div className="text-[10px] font-bold text-bw-text-light uppercase tracking-[0.5px] mb-2.5">Contract</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-bw-text-light">Leverancier</div>
                    <div className="text-[14px] font-bold text-bw-deep">{energieData.leverancier || "Onbekend"}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-bw-text-light">Type</div>
                    <div className="text-[13px] font-semibold text-bw-deep capitalize">{energieData.contract_type || "Variabel"}</div>
                  </div>
                  {energieData.contract_einddatum && (
                    <div>
                      <div className="text-[11px] text-bw-text-light">Einddatum</div>
                      <div className="text-[13px] font-semibold text-bw-deep">{energieData.contract_einddatum}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Usage card */}
              <div className="bg-white rounded-xl border border-bw-border p-4">
                <div className="text-[10px] font-bold text-bw-text-light uppercase tracking-[0.5px] mb-2.5">Verbruik</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-bw-text-light">Stroom</div>
                    <div className="text-[14px] font-bold text-bw-deep">{(energieData.stroom_kwh_jaar || 0).toLocaleString("nl-NL")} <span className="text-[11px] font-normal text-bw-text-light">kWh/jaar</span></div>
                  </div>
                  <div>
                    <div className="text-[11px] text-bw-text-light">Gas</div>
                    <div className="text-[13px] font-semibold text-bw-deep">{energieData.gas_m3_jaar ? `${energieData.gas_m3_jaar.toLocaleString("nl-NL")} m\u00B3/jaar` : "Geen gas"}</div>
                  </div>
                  {energieData.teruglevering_kwh != null && energieData.teruglevering_kwh > 0 && (
                    <div>
                      <div className="text-[11px] text-bw-text-light">Teruglevering</div>
                      <div className="text-[13px] font-semibold text-bw-green">{energieData.teruglevering_kwh.toLocaleString("nl-NL")} kWh</div>
                    </div>
                  )}
                  {energieData.meter_type && (
                    <div>
                      <div className="text-[11px] text-bw-text-light">Meter</div>
                      <div className="text-[13px] font-semibold text-bw-deep capitalize">{energieData.meter_type}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Personal info + EAN in collapsed detail row */}
          {!showEnergieEdit && (energieData.naam || energieData.adres || energieData.ean_stroom) && (
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] px-4 py-3 mb-5 animate-fadeUp" style={{ animationDelay: "0.15s" }}>
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
                {energieData.naam && (
                  <div><span className="text-bw-text-light">Naam:</span> <span className="font-semibold text-bw-deep">{energieData.naam}</span></div>
                )}
                {energieData.adres && (
                  <div><span className="text-bw-text-light">Adres:</span> <span className="font-semibold text-bw-deep">{energieData.adres}</span></div>
                )}
                {energieData.ean_stroom && (
                  <div><span className="text-bw-text-light">EAN:</span> <span className="font-mono font-semibold text-bw-deep text-[11px]">{energieData.ean_stroom}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Editable fields — shown when "Gegevens aanpassen" is clicked */}
          {showEnergieEdit && (
            <div className="bg-white rounded-xl border border-bw-border overflow-hidden mb-5 animate-fadeUp" style={{ animationDelay: "0.1s" }}>
              <div className="px-4 py-3 bg-[#F8FAFC] border-b border-bw-border">
                <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Contract</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <EditRow label="Leverancier" value={energieData.leverancier} onChange={(v) => updateEnergieField("leverancier", v)} />
                <EditRow label="Kosten/maand" value={energieData.kosten_maand} type="number" prefix="€" onChange={(v) => {
                  const num = parseFloat(v) || 0;
                  updateEnergieField("kosten_maand", num);
                  updateEnergieField("kosten_jaar", +(num * 12).toFixed(2));
                }} />
                <EditRow label="Contract type" value={energieData.contract_type ?? ""} onChange={(v) => updateEnergieField("contract_type", v)}
                  options={["Variabel", "Vast 1 jaar", "Vast 2 jaar", "Vast 3 jaar"]} />
              </div>

              <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
                <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Verbruik</span>
              </div>
              <div className="px-4 py-3 space-y-3">
                <EditRow label="Stroom (kWh/jaar)" value={energieData.stroom_kwh_jaar} type="number" onChange={(v) => updateEnergieField("stroom_kwh_jaar", parseFloat(v) || 0)} />
                <EditRow label="Gas (m³/jaar)" value={energieData.gas_m3_jaar ?? ""} type="number" onChange={(v) => updateEnergieField("gas_m3_jaar", v ? parseFloat(v) : null)} />
                <EditRow label="Teruglevering (kWh)" value={energieData.teruglevering_kwh ?? ""} type="number" onChange={(v) => updateEnergieField("teruglevering_kwh", v ? parseFloat(v) : null)} />
                <EditRow label="Meter type" value={energieData.meter_type ?? ""} onChange={(v) => updateEnergieField("meter_type", v)}
                  options={["Enkel", "Dubbel", "Slim"]} />
              </div>
            </div>
          )}

          {/* CTA — big, prominent, sticky-feeling */}
          <div className="animate-fadeUp" style={{ animationDelay: "0.2s" }}>
            <button
              onClick={handleEnergieConfirmAndAnalyze}
              className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-[16px] font-bold bg-bw-green text-white border-none cursor-pointer font-[inherit] hover:bg-bw-green-strong hover:shadow-[0_8px_24px_rgba(22,163,74,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Vergelijk 18+ leveranciers <ArrowRightIcon className="w-4.5 h-4.5" />
            </button>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-[11px] text-bw-text-light">
              <span className="inline-flex items-center gap-1"><LockIcon className="w-3 h-3 text-bw-green" /> Gratis &amp; vrijblijvend</span>
              <span className="hidden min-[340px]:inline">&middot;</span>
              <span>Resultaat in 2 sec</span>
              <span className="hidden min-[340px]:inline">&middot;</span>
              <span>100% onafhankelijk</span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-4">
              <button
                onClick={handleReset}
                className="text-[12px] font-semibold text-bw-text-mid hover:text-bw-deep cursor-pointer bg-transparent border-none font-[inherit] transition-colors hover:underline"
              >
                Ander bestand uploaden
              </button>
              <span className="text-bw-text-light text-[10px]">|</span>
              <button
                onClick={() => setShowEnergieEdit(!showEnergieEdit)}
                className="text-[12px] font-semibold text-bw-blue hover:text-bw-deep cursor-pointer bg-transparent border-none font-[inherit] transition-colors hover:underline"
              >
                {showEnergieEdit ? "Samenvatting tonen" : "Gegevens aanpassen"}
              </button>
            </div>
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

        {/* ── STEP 0: Huishouden (profiel schatting) ── */}
        {energieStep === 0 && (
          <div>
            <h2 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep mb-1">Vertel over je huishouden</h2>
            <p className="text-[13px] sm:text-[14px] text-bw-text-mid mb-6">We schatten je verbruik op basis van je situatie. Duurt maar 30 seconden.</p>

            {/* Aantal personen */}
            <div className="mb-5">
              <label className="text-[13px] font-semibold text-bw-deep mb-2.5 block">Hoeveel personen wonen er?</label>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => {
                      setAantalPersonen(n);
                      if (woningType) applyEstimation(n, woningType, heeftZonnepanelen);
                    }}
                    className={`flex flex-col items-center gap-1 py-3 rounded-xl border cursor-pointer font-[inherit] transition-all ${
                      aantalPersonen === n
                        ? "border-bw-green bg-bw-green-bg text-bw-green-strong shadow-[0_0_0_1px_#16A34A]"
                        : "border-bw-border bg-white text-bw-deep hover:border-[#94A3B8] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <span className="text-[20px]">{n === 1 ? "\uD83D\uDC64" : n === 2 ? "\uD83D\uDC6B" : n === 3 ? "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC66" : n === 4 ? "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC66\u200D\uD83D\uDC66" : "\uD83D\uDC68\u200D\uD83D\uDC69\u200D\uD83D\uDC67\u200D\uD83D\uDC66"}</span>
                    <span className="text-[13px] font-bold">{n}{n === 5 ? "+" : ""}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Woningtype */}
            <div className="mb-5">
              <label className="text-[13px] font-semibold text-bw-deep mb-2.5 block">Wat voor woning heb je?</label>
              <div className="grid grid-cols-2 min-[400px]:grid-cols-3 gap-2">
                {([
                  { key: "appartement", label: "Appartement", icon: "\uD83C\uDFE2" },
                  { key: "tussenwoning", label: "Tussenwoning", icon: "\uD83C\uDFE0" },
                  { key: "hoekwoning", label: "Hoekwoning", icon: "\uD83C\uDFE1" },
                  { key: "2-onder-1-kap", label: "2-onder-1-kap", icon: "\uD83C\uDFD8\uFE0F" },
                  { key: "vrijstaand", label: "Vrijstaand", icon: "\uD83C\uDFE1" },
                ] as const).map((w) => (
                  <button
                    key={w.key}
                    onClick={() => {
                      setWoningType(w.key);
                      if (aantalPersonen) applyEstimation(aantalPersonen, w.key, heeftZonnepanelen);
                    }}
                    className={`flex flex-col items-center gap-1 py-3 px-2 rounded-xl border cursor-pointer font-[inherit] transition-all ${
                      woningType === w.key
                        ? "border-bw-green bg-bw-green-bg text-bw-green-strong shadow-[0_0_0_1px_#16A34A]"
                        : "border-bw-border bg-white text-bw-deep hover:border-[#94A3B8] hover:bg-[#FAFAFA]"
                    }`}
                  >
                    <span className="text-[20px]">{w.icon}</span>
                    <span className="text-[12px] font-semibold text-center leading-tight">{w.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Zonnepanelen */}
            <div className="mb-5">
              <label className="text-[13px] font-semibold text-bw-deep mb-2.5 block">Heb je zonnepanelen?</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setHeeftZonnepanelen(false);
                    if (aantalPersonen && woningType) applyEstimation(aantalPersonen, woningType, false);
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border cursor-pointer font-[inherit] transition-all ${
                    !heeftZonnepanelen
                      ? "border-bw-green bg-bw-green-bg text-bw-green-strong shadow-[0_0_0_1px_#16A34A]"
                      : "border-bw-border bg-white text-bw-deep hover:border-[#94A3B8]"
                  }`}
                >
                  <span className="text-[18px]">{"\u274C"}</span>
                  <span className="text-[13px] font-semibold">Nee</span>
                </button>
                <button
                  onClick={() => {
                    setHeeftZonnepanelen(true);
                    if (aantalPersonen && woningType) applyEstimation(aantalPersonen, woningType, true);
                  }}
                  className={`flex items-center justify-center gap-2 py-3 rounded-xl border cursor-pointer font-[inherit] transition-all ${
                    heeftZonnepanelen
                      ? "border-bw-green bg-bw-green-bg text-bw-green-strong shadow-[0_0_0_1px_#16A34A]"
                      : "border-bw-border bg-white text-bw-deep hover:border-[#94A3B8]"
                  }`}
                >
                  <span className="text-[18px]">{"\u2600\uFE0F"}</span>
                  <span className="text-[13px] font-semibold">Ja</span>
                </button>
              </div>
            </div>

            {/* Geschat verbruik preview */}
            {aantalPersonen && woningType && energieData.stroom_kwh_jaar > 0 && (
              <div className="bg-gradient-to-br from-[#EFF6FF] to-[#DBEAFE] rounded-xl p-4 mb-5 border border-[#BFDBFE] animate-fadeUp">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4 text-bw-blue" />
                  <span className="text-[13px] font-bold text-bw-deep">Geschat verbruik</span>
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-[18px] font-bold text-bw-deep">{energieData.stroom_kwh_jaar.toLocaleString("nl-NL")}</div>
                    <div className="text-[10px] text-bw-text-mid font-semibold">kWh stroom/jaar</div>
                  </div>
                  <div>
                    <div className="text-[18px] font-bold text-bw-deep">{energieData.gas_m3_jaar ? energieData.gas_m3_jaar.toLocaleString("nl-NL") : "0"}</div>
                    <div className="text-[10px] text-bw-text-mid font-semibold">m&sup3; gas/jaar</div>
                  </div>
                  <div>
                    <div className="text-[18px] font-bold text-bw-deep">&euro; {energieData.kosten_maand || 0}</div>
                    <div className="text-[10px] text-bw-text-mid font-semibold">geschat/maand</div>
                  </div>
                </div>
                <button
                  onClick={() => setShowVerbruikDetails(!showVerbruikDetails)}
                  className="mt-2 w-full text-center text-[11px] font-semibold text-bw-blue cursor-pointer bg-transparent border-none font-[inherit] hover:underline"
                >
                  {showVerbruikDetails ? "Verberg details" : "Verbruik handmatig aanpassen"}
                </button>

                {showVerbruikDetails && (
                  <div className="mt-3 pt-3 border-t border-[#BFDBFE] space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-bw-deep mb-1 block">Stroom (kWh/jaar)</label>
                      <input
                        type="number"
                        value={energieData.stroom_kwh_jaar || ""}
                        onChange={(e) => { const num = parseFloat(e.target.value) || 0; updateEnergieField("stroom_kwh_jaar", num); updateEnergieField("stroom_normaal_kwh", num); }}
                        className="w-full px-3 py-2 rounded-lg border border-[#BFDBFE] text-[13px] text-bw-deep bg-white focus:outline-none focus:border-bw-green focus:ring-1 focus:ring-bw-green/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-bw-deep mb-1 block">Gas (m&sup3;/jaar)</label>
                      <input
                        type="number"
                        value={energieData.gas_m3_jaar ?? ""}
                        onChange={(e) => updateEnergieField("gas_m3_jaar", e.target.value ? parseFloat(e.target.value) : null)}
                        className="w-full px-3 py-2 rounded-lg border border-[#BFDBFE] text-[13px] text-bw-deep bg-white focus:outline-none focus:border-bw-green focus:ring-1 focus:ring-bw-green/20"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-bw-deep mb-1 block">Maandkosten (&euro;)</label>
                      <input
                        type="number"
                        value={energieData.kosten_maand || ""}
                        onChange={(e) => { const num = parseFloat(e.target.value) || 0; updateEnergieField("kosten_maand", num); updateEnergieField("kosten_jaar", +(num * 12).toFixed(2)); }}
                        className="w-full px-3 py-2 rounded-lg border border-[#BFDBFE] text-[13px] text-bw-deep bg-white focus:outline-none focus:border-bw-green focus:ring-1 focus:ring-bw-green/20"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={() => setEnergieStep(1)}
              disabled={!aantalPersonen || !woningType}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold bg-bw-blue text-white border-none cursor-pointer font-[inherit] hover:bg-[#1E40AF] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Volgende <ArrowRightIcon className="w-4 h-4" />
            </button>

            {!aantalPersonen && !woningType && (
              <p className="text-center text-[11px] text-bw-text-light mt-2">Selecteer je huishouden en woningtype om door te gaan</p>
            )}
          </div>
        )}

        {/* ── STEP 1: Leverancier & contract ── */}
        {energieStep === 1 && (
          <div>
            <h2 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep mb-1">Bij welke leverancier zit je?</h2>
            <p className="text-[13px] sm:text-[14px] text-bw-text-mid mb-6">Weet je het niet zeker? Kies dan &quot;Anders&quot; of &quot;Weet ik niet&quot;.</p>

            <div className="space-y-4">
              <div>
                <label className="text-[13px] font-semibold text-bw-deep mb-1.5 block">Huidige leverancier</label>
                <select
                  value={energieData.leverancier || ""}
                  onChange={(e) => updateEnergieField("leverancier", e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-bw-border text-[14px] text-bw-deep bg-white focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20"
                >
                  <option value="">Selecteer je leverancier...</option>
                  {["Budget Energie", "Eneco", "Essent", "Greenchoice", "Oxxio", "Vattenfall", "Vandebron", "Engie", "Nederlandse Energie Maatschappij", "Mega", "Frank Energie", "Tibber", "UnitedConsumers", "Coolblue Energie", "Pure Energie", "HEM", "NextEnergy", "Weet ik niet", "Anders"].map((l) => (
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
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-bw-text-mid">&euro;</span>
                  <input
                    type="number"
                    value={energieData.kosten_maand || ""}
                    onChange={(e) => { const num = parseFloat(e.target.value) || 0; updateEnergieField("kosten_maand", num); updateEnergieField("kosten_jaar", +(num * 12).toFixed(2)); }}
                    placeholder="bijv. 180"
                    className="w-full pl-9 pr-16 py-3 rounded-xl border border-bw-border text-[14px] text-bw-deep focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[12px] text-bw-text-light">per maand</span>
                </div>
                {energieData.kosten_maand > 0 && (
                  <div className="mt-1 text-[11px] text-bw-text-light">= &euro; {(energieData.kosten_maand * 12).toFixed(0)} per jaar</div>
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
                Volgende <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Bevestig & vergelijk ── */}
        {energieStep === 2 && (
          <div>
            <h2 className="font-heading text-[22px] sm:text-[26px] font-bold text-bw-deep mb-1">Klaar om te vergelijken!</h2>
            <p className="text-[13px] sm:text-[14px] text-bw-text-mid mb-5">Controleer je gegevens en vergelijk direct alle leveranciers.</p>

            {/* Summary cards — like PDF confirmation style */}
            <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 mb-4">
              <div className="bg-white rounded-xl border border-bw-border p-4">
                <div className="text-[10px] font-bold text-bw-text-light uppercase tracking-[0.5px] mb-2.5">Huishouden</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-bw-text-light">Personen</div>
                    <div className="text-[14px] font-bold text-bw-deep">{aantalPersonen || "?"}{aantalPersonen === 5 ? "+" : ""}</div>
                  </div>
                  <div>
                    <div className="text-[11px] text-bw-text-light">Woning</div>
                    <div className="text-[13px] font-semibold text-bw-deep capitalize">{woningType || "Onbekend"}</div>
                  </div>
                  {heeftZonnepanelen && (
                    <div>
                      <div className="text-[11px] text-bw-text-light">Zonnepanelen</div>
                      <div className="text-[13px] font-semibold text-bw-green">Ja</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-bw-border p-4">
                <div className="text-[10px] font-bold text-bw-text-light uppercase tracking-[0.5px] mb-2.5">Verbruik</div>
                <div className="space-y-2">
                  <div>
                    <div className="text-[11px] text-bw-text-light">Stroom</div>
                    <div className="text-[14px] font-bold text-bw-deep">{(energieData.stroom_kwh_jaar || 0).toLocaleString("nl-NL")} <span className="text-[11px] font-normal text-bw-text-light">kWh/jaar</span></div>
                  </div>
                  <div>
                    <div className="text-[11px] text-bw-text-light">Gas</div>
                    <div className="text-[13px] font-semibold text-bw-deep">{energieData.gas_m3_jaar ? `${energieData.gas_m3_jaar.toLocaleString("nl-NL")} m\u00B3/jaar` : "Geen gas"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Contract info bar */}
            <div className="bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] px-4 py-3 mb-5">
              <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-[12px]">
                <div><span className="text-bw-text-light">Leverancier:</span> <span className="font-semibold text-bw-deep">{energieData.leverancier || "Onbekend"}</span></div>
                <div><span className="text-bw-text-light">Contract:</span> <span className="font-semibold text-bw-deep capitalize">{energieData.contract_type}</span></div>
                <div><span className="text-bw-text-light">Kosten:</span> <span className="font-semibold text-bw-deep">&euro; {energieData.kosten_maand || 0}/mnd</span></div>
              </div>
            </div>

            {/* CTA */}
            <button
              onClick={handleEnergieConfirmAndAnalyze}
              className="w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-[16px] font-bold bg-bw-green text-white border-none cursor-pointer font-[inherit] hover:bg-bw-green-strong hover:shadow-[0_8px_24px_rgba(22,163,74,0.3)] hover:-translate-y-0.5 active:translate-y-0 transition-all"
            >
              Vergelijk 18+ leveranciers <ArrowRightIcon className="w-4.5 h-4.5" />
            </button>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-[11px] text-bw-text-light">
              <span className="inline-flex items-center gap-1"><LockIcon className="w-3 h-3 text-bw-green" /> Gratis &amp; vrijblijvend</span>
              <span className="hidden min-[340px]:inline">&middot;</span>
              <span>Resultaat in 2 sec</span>
              <span className="hidden min-[340px]:inline">&middot;</span>
              <span>100% onafhankelijk</span>
            </div>

            <div className="flex items-center justify-center gap-3 mt-3">
              <button
                onClick={() => setEnergieStep(1)}
                className="text-[12px] font-semibold text-bw-text-mid hover:text-bw-deep cursor-pointer bg-transparent border-none font-[inherit] transition-colors hover:underline"
              >
                Terug
              </button>
              <span className="text-bw-text-light text-[10px]">|</span>
              <button
                onClick={() => { setEnergieStep(0); setShowVerbruikDetails(false); }}
                className="text-[12px] font-semibold text-bw-blue hover:text-bw-deep cursor-pointer bg-transparent border-none font-[inherit] transition-colors hover:underline"
              >
                Gegevens aanpassen
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // === VERZEKERING CONFIRMATION VIEW ===
  if (parsedData) {
    return (
      <div className="max-w-[580px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Success header */}
        <div className="text-center mb-6 animate-fadeUp">
          {!isManualInputVerzekering && (
            <div className="inline-flex items-center gap-1.5 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-full text-[12px] font-bold mb-3">
              <CircleCheckBig className="w-3.5 h-3.5" /> Polis succesvol uitgelezen
            </div>
          )}
          <h2 className="font-heading text-[24px] sm:text-[30px] font-bold text-bw-deep mb-1">
            {isManualInputVerzekering ? "Vergelijk je verzekering" : "Controleer je gegevens"}
          </h2>
          <p className="text-[14px] text-bw-text-mid">
            {isManualInputVerzekering
              ? "Vul een paar gegevens in — vergelijk direct 12+ verzekeraars."
              : "Klopt alles? Dan vergelijken we direct 12+ verzekeraars."}
          </p>

          {/* Banner when document had no personal data */}
          {!!(parsedData as unknown as Record<string, unknown>)?._needsManualInput && (
            <div className="mt-4 flex items-start gap-2.5 px-4 py-3 rounded-xl bg-bw-orange-bg border border-[#FED7AA] text-[13px] text-[#9A3412]">
              <svg className="w-4 h-4 shrink-0 mt-0.5 text-bw-orange" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <span>{String((parsedData as unknown as Record<string, string>)?._reason || "We missen een paar gegevens. Vul ze hieronder in.")}</span>
            </div>
          )}
        </div>

        {/* Current premium highlight (if from PDF) */}
        {!isManualInputVerzekering && parsedData.maandpremie > 0 && (
          <div className="bg-gradient-to-br from-bw-deep to-bw-navy rounded-2xl p-5 sm:p-6 mb-5 text-white animate-fadeUp" style={{ animationDelay: "0.05s" }}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[12px] text-white/60 mb-0.5">Je betaalt nu</div>
                <div className="font-heading text-[32px] sm:text-[38px] font-bold leading-tight">
                  &euro;{parsedData.maandpremie.toFixed(2)}<span className="text-[16px] font-semibold text-white/50">/mnd</span>
                </div>
                <div className="text-[13px] text-white/50 mt-0.5">{parsedData.verzekeraar || "Je verzekeraar"} &middot; {parsedData.dekking} &middot; {parsedData.eigenRisico} eigen risico</div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                {PRODUCTS.find(p => p.type === detectedProduct)?.icon || <Home className="w-6 h-6" />}
              </div>
            </div>
          </div>
        )}

        {/* Product type selector */}
        <div className="mb-4 animate-fadeUp" style={{ animationDelay: "0.1s" }}>
          <div className="grid grid-cols-4 gap-1.5 p-1 bg-bw-bg rounded-xl border border-bw-border">
            {PRODUCTS.map((p) => (
              <button
                key={p.type}
                onClick={() => setDetectedProduct(p.type)}
                className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg text-center cursor-pointer border-none font-[inherit] transition-all ${
                  detectedProduct === p.type
                    ? "bg-white text-bw-deep shadow-sm"
                    : "bg-transparent text-bw-text-light hover:text-bw-deep"
                }`}
              >
                <span className={detectedProduct === p.type ? "text-bw-green" : ""}>{p.icon}</span>
                <span className="text-[10px] font-semibold leading-tight">{p.type === "aansprakelijkheid" ? "AVP" : p.label.replace("verzekering", "")}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary cards (compact, like energy) — only when NOT manual input */}
        {!isManualInputVerzekering && !showEditFields && (
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3 mb-5 animate-fadeUp" style={{ animationDelay: "0.15s" }}>
            <div className="bg-white rounded-xl border border-bw-border p-4">
              <div className="text-[10px] font-bold text-bw-text-light uppercase tracking-[0.5px] mb-2.5">Polis</div>
              <div className="space-y-2">
                <div>
                  <div className="text-[11px] text-bw-text-light">Verzekeraar</div>
                  <div className="text-[14px] font-bold text-bw-deep">{parsedData.verzekeraar || "Onbekend"}</div>
                </div>
                <div>
                  <div className="text-[11px] text-bw-text-light">Dekking</div>
                  <div className="text-[13px] font-semibold text-bw-deep">{parsedData.dekking}</div>
                </div>
                <div>
                  <div className="text-[11px] text-bw-text-light">Eigen risico</div>
                  <div className="text-[13px] font-semibold text-bw-deep">{parsedData.eigenRisico}</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-bw-border p-4">
              <div className="text-[10px] font-bold text-bw-text-light uppercase tracking-[0.5px] mb-2.5">Profiel</div>
              <div className="space-y-2">
                {parsedData.postcode && (
                  <div>
                    <div className="text-[11px] text-bw-text-light">Postcode</div>
                    <div className="text-[13px] font-semibold text-bw-deep">{parsedData.postcode}</div>
                  </div>
                )}
                {parsedData.woning && (detectedProduct === "inboedel" || detectedProduct === "opstal") && (
                  <div>
                    <div className="text-[11px] text-bw-text-light">Woning</div>
                    <div className="text-[13px] font-semibold text-bw-deep">{parsedData.woning}</div>
                  </div>
                )}
                <div>
                  <div className="text-[11px] text-bw-text-light">Gezin</div>
                  <div className="text-[13px] font-semibold text-bw-deep">{parsedData.gezin}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Editable fields — manual input: wizard-style with big fields */}
        {isManualInputVerzekering && parsedData && (
          <div className="space-y-4 mb-5 animate-fadeUp" style={{ animationDelay: "0.1s" }}>
            {/* Premium input — large, prominent */}
            <div>
              <label className="block text-[13px] font-semibold text-bw-deep mb-1.5">Wat betaal je per maand?</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[16px] font-bold text-bw-text-mid">&euro;</span>
                <input
                  type="number"
                  value={parsedData.maandpremie || ""}
                  onChange={(e) => {
                    const num = parseFloat(e.target.value) || 0;
                    updateField("maandpremie", num);
                    updateField("jaarpremie", +(num * 12).toFixed(2));
                  }}
                  placeholder="bv. 15"
                  className="w-full pl-9 pr-4 py-3.5 rounded-xl border border-bw-border text-[16px] font-semibold text-bw-deep bg-white focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20 placeholder:text-bw-text-light"
                />
              </div>
              <p className="text-[11px] text-bw-text-light mt-1">Weet je het niet precies? Een schatting is ook goed.</p>
            </div>

            {/* Postcode — only for inboedel/opstal */}
            {(detectedProduct === "inboedel" || detectedProduct === "opstal") && (
              <div>
                <label className="block text-[13px] font-semibold text-bw-deep mb-1.5">Postcode</label>
                <input
                  type="text"
                  value={parsedData.postcode}
                  onChange={(e) => updateField("postcode", e.target.value)}
                  placeholder="bv. 1016"
                  maxLength={6}
                  className="w-full px-4 py-3.5 rounded-xl border border-bw-border text-[16px] font-semibold text-bw-deep bg-white focus:outline-none focus:border-bw-green focus:ring-2 focus:ring-bw-green/20 placeholder:text-bw-text-light"
                />
              </div>
            )}

            {/* Dekking — visual toggle buttons instead of dropdown */}
            {(detectedProduct === "inboedel" || detectedProduct === "opstal") && (
              <div>
                <label className="block text-[13px] font-semibold text-bw-deep mb-1.5">Welke dekking heb je?</label>
                <div className="grid grid-cols-2 gap-2">
                  {DEKKING_OPTIONS_INBOEDEL.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => updateField("dekking", opt)}
                      className={`px-3 py-3 rounded-xl text-[13px] font-semibold border-2 cursor-pointer font-[inherit] transition-all ${
                        parsedData.dekking === opt
                          ? "border-bw-green bg-bw-green-bg text-bw-green-strong"
                          : "border-bw-border bg-white text-bw-text-mid hover:border-[#94A3B8]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-bw-text-light mt-1.5">Niet zeker? Kies &quot;Uitgebreid&quot; — dat is het meest gekozen.</p>
              </div>
            )}

            {/* Gezin — visual toggle for AVP and reis */}
            {(detectedProduct === "aansprakelijkheid" || detectedProduct === "reis") && (
              <div>
                <label className="block text-[13px] font-semibold text-bw-deep mb-1.5">Gezinssamenstelling</label>
                <div className="grid grid-cols-2 gap-2">
                  {GEZIN_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => updateField("gezin", opt)}
                      className={`px-3 py-3 rounded-xl text-[13px] font-semibold border-2 cursor-pointer font-[inherit] transition-all ${
                        parsedData.gezin === opt
                          ? "border-bw-green bg-bw-green-bg text-bw-green-strong"
                          : "border-bw-border bg-white text-bw-text-mid hover:border-[#94A3B8]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Reis dekking — visual toggle */}
            {detectedProduct === "reis" && (
              <div>
                <label className="block text-[13px] font-semibold text-bw-deep mb-1.5">Welke dekking?</label>
                <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-2">
                  {["Doorlopend Europa", "Doorlopend Wereld", "Kortlopend Europa", "Kortlopend Wereld"].map((opt) => (
                    <button
                      key={opt}
                      onClick={() => updateField("dekking", opt)}
                      className={`px-3 py-3 rounded-xl text-[13px] font-semibold border-2 cursor-pointer font-[inherit] transition-all ${
                        parsedData.dekking === opt
                          ? "border-bw-green bg-bw-green-bg text-bw-green-strong"
                          : "border-bw-border bg-white text-bw-text-mid hover:border-[#94A3B8]"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Editable fields — uploaded data: compact EditRow style */}
        {showEditFields && !isManualInputVerzekering && parsedData && (
          <div className="bg-white rounded-xl border border-bw-border overflow-hidden mb-5 animate-fadeUp" style={{ animationDelay: "0.1s" }}>
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

            {(detectedProduct === "inboedel" || detectedProduct === "opstal") && (
              <>
                <div className="px-4 py-3 bg-[#F8FAFC] border-t border-b border-bw-border">
                  <span className="text-[11px] font-bold text-bw-text-mid uppercase tracking-[0.5px]">Woning &amp; profiel</span>
                </div>
                <div className="px-4 py-3 space-y-3">
                  <EditRow label="Postcode" value={parsedData.postcode} onChange={(v) => updateField("postcode", v)} />
                  <EditRow label="Woningtype" value={parsedData.woning} onChange={(v) => updateField("woning", v)} options={WONINGTYPE_OPTIONS} />
                  <EditRow label="Oppervlakte" value={parsedData.oppervlakte} onChange={(v) => updateField("oppervlakte", v)} />
                  {detectedProduct === "opstal" && (
                    <EditRow label="Bouwjaar" value={parsedData.bouwaard} onChange={(v) => updateField("bouwaard", v)} />
                  )}
                  <EditRow label="Gezin" value={parsedData.gezin} onChange={(v) => updateField("gezin", v)} options={GEZIN_OPTIONS} />
                </div>
              </>
            )}
            {detectedProduct === "aansprakelijkheid" && (
              <div className="px-4 py-3 space-y-3 border-t border-bw-border">
                <EditRow label="Postcode" value={parsedData.postcode} onChange={(v) => updateField("postcode", v)} />
                <EditRow label="Gezin" value={parsedData.gezin} onChange={(v) => updateField("gezin", v)} options={GEZIN_OPTIONS} />
              </div>
            )}
            {detectedProduct === "reis" && (
              <div className="px-4 py-3 space-y-3 border-t border-bw-border">
                <EditRow label="Gezin" value={parsedData.gezin} onChange={(v) => updateField("gezin", v)} options={GEZIN_OPTIONS} />
                <EditRow label="Dekking" value={parsedData.dekking} onChange={(v) => updateField("dekking", v)}
                  options={["Doorlopend Europa", "Doorlopend Wereld", "Kortlopend Europa", "Kortlopend Wereld"]} />
              </div>
            )}
          </div>
        )}

        {/* Premium confirmation banner */}
        {parsedData._needsConfirmation && parsedData._confirmationQuestion && (
          <div className="bg-bw-orange-bg border border-[#FED7AA] rounded-xl px-4 py-4 mb-5 animate-fadeUp">
            <p className="text-[14px] font-semibold text-[#9A3412] mb-3">
              {parsedData._confirmationQuestion}
            </p>
            {parsedData._confirmationQuestion.includes("per maand of per jaar") ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setParsedData(applyPeriodChoice(parsedData, "maand"))}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
                >
                  Per maand
                </button>
                <button
                  onClick={() => setParsedData(applyPeriodChoice(parsedData, "jaar"))}
                  className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
                >
                  Per jaar
                </button>
              </div>
            ) : (
              <button
                onClick={() => setParsedData({ ...parsedData, _needsConfirmation: false })}
                className="px-4 py-2 rounded-lg text-[13px] font-semibold bg-white border border-bw-border cursor-pointer font-[inherit] hover:bg-bw-bg transition-colors"
              >
                Ja, dit klopt
              </button>
            )}
          </div>
        )}

        {/* CTA */}
        <div className="animate-fadeUp" style={{ animationDelay: "0.2s" }}>
          <button
            onClick={handleConfirmAndAnalyze}
            disabled={!!parsedData._needsConfirmation}
            className={`w-full inline-flex items-center justify-center gap-2.5 px-6 py-4 rounded-2xl text-[16px] font-bold bg-bw-green text-white border-none font-[inherit] transition-all ${parsedData._needsConfirmation ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-bw-green-strong hover:shadow-[0_8px_24px_rgba(22,163,74,0.3)] hover:-translate-y-0.5 active:translate-y-0"}`}
          >
            Vergelijk 12+ verzekeraars <ArrowRightIcon className="w-4.5 h-4.5" />
          </button>

          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 mt-3 text-[11px] text-bw-text-light">
            <span className="inline-flex items-center gap-1"><LockIcon className="w-3 h-3 text-bw-green" /> Gratis &amp; vrijblijvend</span>
            <span className="hidden min-[340px]:inline">&middot;</span>
            <span>Resultaat in 5 sec</span>
            <span className="hidden min-[340px]:inline">&middot;</span>
            <span>100% onafhankelijk</span>
          </div>

          <div className="flex items-center justify-center gap-3 mt-4">
            <button
              onClick={handleReset}
              className="text-[12px] font-semibold text-bw-text-mid hover:text-bw-deep cursor-pointer bg-transparent border-none font-[inherit] transition-colors hover:underline"
            >
              Ander bestand uploaden
            </button>
            {!isManualInputVerzekering && (
              <>
                <span className="text-bw-text-light text-[10px]">|</span>
                <button
                  onClick={() => setShowEditFields(!showEditFields)}
                  className="text-[12px] font-semibold text-bw-blue hover:text-bw-deep cursor-pointer bg-transparent border-none font-[inherit] transition-colors hover:underline"
                >
                  {showEditFields ? "Samenvatting tonen" : "Gegevens aanpassen"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // === UPLOAD VIEW ===
  return (
    <div className="max-w-[580px] mx-auto px-4 sm:px-6 py-8 sm:py-14">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 bg-bw-green-bg text-bw-green-strong px-3 py-1 rounded-full text-[11px] sm:text-[12px] font-bold mb-3">
          <CircleCheckBig className="w-3.5 h-3.5" /> Al 1.200+ polissen vergeleken
        </div>
        <h2 className="font-heading text-[clamp(22px,3.2vw,30px)] font-bold text-bw-deep mb-2 leading-tight">
          {docCategory === "energie"
            ? "Upload je energierekening — wij vinden de goedkoopste leverancier"
            : "Upload je polis — wij checken in 30 seconden of het goedkoper kan"}
        </h2>
        <p className="text-[14px] sm:text-[15px] text-bw-text-mid max-w-[460px] mx-auto">
          {docCategory === "energie"
            ? "Maak een foto of upload een PDF. Wij vergelijken direct 18+ leveranciers."
            : "Maak een foto of upload een PDF van je verzekeringspolis. Wij vergelijken direct 12+ verzekeraars."}
        </p>
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

      {/* Two options side by side on desktop, stacked on mobile */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
        {/* Option A: Upload */}
        <div
          className={`relative rounded-2xl px-4 sm:px-5 py-6 text-center cursor-pointer transition-all ${
            isUploading
              ? "border-2 border-bw-green bg-bw-green-bg/50 pointer-events-none"
              : isDragging
                ? "border-2 border-bw-green bg-bw-green-bg scale-[1.01]"
                : "border-2 border-bw-blue/30 bg-white hover:border-bw-blue hover:shadow-[var(--shadow-bw-card-hover)]"
          }`}
          onClick={() => !isUploading && fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,image/*" className="hidden" onChange={handleInputChange} />

          {isUploading ? (
            <UploadProcessing docCategory={docCategory} />
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-bw-blue-light to-[#DBEAFE] flex items-center justify-center mx-auto mb-3 shadow-[0_2px_8px_rgba(26,86,219,0.1)]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="#1A56DB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <div className="text-[14px] sm:text-[15px] font-bold text-bw-deep mb-1">
                <span className="sm:hidden">Maak een foto of kies bestand</span>
                <span className="hidden sm:inline">Upload je {docCategory === "energie" ? "rekening" : "polis"}</span>
              </div>
              <div className="text-[12px] sm:text-[13px] text-bw-text-mid mb-2">
                <span className="sm:hidden">Foto of PDF van je {docCategory === "energie" ? "energierekening" : "polisblad"}</span>
                <span className="hidden sm:inline">Sleep hierheen of <span className="text-bw-blue font-semibold underline underline-offset-2">klik om te kiezen</span></span>
              </div>
              <div className="text-[11px] text-bw-text-light">Foto of PDF &middot; max 10 MB</div>
              <div className="absolute top-2.5 right-2.5 bg-bw-blue text-white text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md">Snelste</div>
            </>
          )}
        </div>

        {/* Option B: Manual input */}
        <div
          className="relative rounded-2xl border-2 border-bw-border px-4 sm:px-5 py-6 text-center cursor-pointer transition-all hover:border-[#94A3B8] hover:shadow-[var(--shadow-bw-card-hover)] bg-white"
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
        >
          <div className="w-12 h-12 rounded-xl bg-bw-bg flex items-center justify-center mx-auto mb-3">
            <ClipboardList className="w-5 h-5 text-bw-text-mid" />
          </div>
          <div className="text-[14px] sm:text-[15px] font-bold text-bw-deep mb-1">
            Vul zelf in
          </div>
          <div className="text-[12px] sm:text-[13px] text-bw-text-mid mb-2">
            {docCategory === "energie"
              ? "Vul je verbruik en leverancier in"
              : "Geen polis bij de hand? Vul je gegevens in"}
          </div>
          <div className="text-[11px] text-bw-text-light">Duurt 2 minuten</div>
        </div>
      </div>

      {/* Manual input product picker (verzekering only, shown when manual is clicked) */}
      {showManualPicker && (
        <div className="mb-5 bg-white rounded-xl border border-bw-border p-4 animate-fadeUp">
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
                    premie_periode: "onbekend",
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
                    voorwaarden: "",
                    verlengingsdatum: "",
                    dekkingen: [],
                    woonplaats: "",
                  });
                  setDetectedProduct(p.type);
                }}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-bw-border bg-white text-left cursor-pointer font-[inherit] hover:border-bw-blue hover:bg-bw-blue-light transition-all"
              >
                <span className="text-bw-blue">{p.icon}</span>
                <span className="text-[13px] font-semibold text-bw-deep">{p.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Upload error */}
      {uploadError && (
        <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-[13px] text-[#991B1B]">
          {uploadError}
        </div>
      )}

      {/* Trust signals bar */}
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 py-3 text-[11px] sm:text-[12px] text-bw-text-mid">
        <span className="inline-flex items-center gap-1.5"><LockIcon className="w-3.5 h-3.5 text-bw-green" /> AVG-veilig</span>
        <span className="hidden min-[340px]:inline text-bw-border">&middot;</span>
        <span className="inline-flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-bw-text-light" /> Resultaat in 30 sec</span>
        <span className="hidden min-[340px]:inline text-bw-border">&middot;</span>
        <span>100% gratis</span>
      </div>

      {/* How it works — 3 steps */}
      <div className="mt-4 sm:mt-6 bg-bw-bg rounded-xl border border-bw-border p-4 sm:p-5">
        <div className="text-[12px] font-bold text-bw-text-light uppercase tracking-[0.5px] mb-3">Zo werkt het</div>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-bw-blue text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</div>
            <div>
              <div className="text-[13px] font-semibold text-bw-deep">Upload of vul in</div>
              <div className="text-[12px] text-bw-text-mid">
                {docCategory === "energie"
                  ? "Maak een foto van je energierekening of vul je verbruik in"
                  : "Maak een foto van je polisblad of vul je premie in. Je vindt je polis in de e-mail van je verzekeraar."}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-bw-blue text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</div>
            <div>
              <div className="text-[13px] font-semibold text-bw-deep">Wij vergelijken</div>
              <div className="text-[12px] text-bw-text-mid">
                {docCategory === "energie"
                  ? "18+ energieleveranciers worden doorgerekend op basis van jouw verbruik"
                  : "12+ verzekeraars worden vergeleken op dezelfde dekking en eigen risico"}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-bw-green text-white text-[11px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</div>
            <div>
              <div className="text-[13px] font-semibold text-bw-deep">Bespaar &amp; wij bewaken</div>
              <div className="text-[12px] text-bw-text-mid">Je ziet direct hoeveel je kunt besparen. Wij blijven je premie 24/7 bewaken via WhatsApp.</div>
            </div>
          </div>
        </div>
      </div>

      {/* Insurer logos for trust */}
      <div className="mt-5 text-center">
        <div className="text-[11px] text-bw-text-light mb-2.5">
          {docCategory === "energie" ? "Wij vergelijken o.a." : "Wij vergelijken o.a."}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 text-[12px] font-semibold text-bw-text-light/70">
          {docCategory === "energie" ? (
            <>
              <span>Vattenfall</span>
              <span>Eneco</span>
              <span>Essent</span>
              <span>Budget Energie</span>
              <span>Greenchoice</span>
              <span className="text-bw-text-light">+13 meer</span>
            </>
          ) : (
            <>
              <span>Centraal Beheer</span>
              <span>FBTO</span>
              <span>a.s.r.</span>
              <span>Interpolis</span>
              <span>OHRA</span>
              <span className="text-bw-text-light">+7 meer</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Inline editable row component ──
function EditRow({ label, value, onChange, type = "text", prefix, options, placeholder }: {
  label: string;
  value: string | number;
  onChange?: (v: string) => void;
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
        {!onChange ? (
          <span className="text-[13px] font-semibold text-bw-deep">{String(value)}</span>
        ) : options ? (
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

/* ── Upload Processing Animation ── */
function UploadProcessing({ docCategory }: { docCategory: string }) {
  const [step, setStep] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const isEnergie = docCategory === "energie";

  const steps = isEnergie
    ? [
        { label: "Document ontvangen", desc: "Je energierekening is veilig geupload" },
        { label: "Gegevens uitlezen", desc: "Verbruik, tarieven en kosten worden herkend" },
        { label: "Privacy beschermen", desc: "Persoonsgegevens worden versleuteld" },
      ]
    : [
        { label: "Document ontvangen", desc: "Je polis is veilig geupload" },
        { label: "Polis uitlezen", desc: "Dekking, premie en voorwaarden worden herkend" },
        { label: "Privacy beschermen", desc: "Naam, adres en IBAN worden versleuteld" },
      ];

  const trustMessages = isEnergie
    ? [
        "We vergelijken Vattenfall, Eneco, Essent, Budget Energie...",
        "Je persoonsgegevens verlaten nooit onze server",
        "Versleuteld met bankniveau-encryptie",
        "Verbruik en tarieven worden automatisch herkend",
      ]
    : [
        "We vergelijken Centraal Beheer, FBTO, ASR, Allianz...",
        "Je persoonsgegevens verlaten nooit onze server",
        "Versleuteld met bankniveau-encryptie",
        "Dekking, eigen risico en voorwaarden worden geanalyseerd",
      ];

  const currentTrust = trustMessages[Math.floor(elapsed / 2) % trustMessages.length];

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 800),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 3800),
    ];
    const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => { timers.forEach(clearTimeout); clearInterval(interval); };
  }, []);

  return (
    <div className="py-2">
      {/* Agent mini illustration */}
      <div className="flex items-center justify-center mb-4">
        <div className="relative">
          {/* Head */}
          <div className="w-12 h-12 rounded-full bg-[#FBBF24] mx-auto relative">
            <div className="absolute top-[14px] left-[12px] flex gap-[8px]">
              <div className="w-2 h-2 rounded-full bg-[#1E293B]" />
              <div className="w-2 h-2 rounded-full bg-[#1E293B]" />
            </div>
            <div className={`absolute bottom-[10px] left-1/2 -translate-x-1/2 transition-all duration-500 ${
              step >= 3 ? "w-4 h-2 rounded-b-full bg-[#1E293B]" : "w-3 h-0.5 bg-[#1E293B] rounded"
            }`} />
            {/* Hat */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-4 bg-bw-blue rounded-t-lg flex items-center justify-center">
              <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
          </div>
          {/* Magnifying glass animation */}
          <div className={`absolute -right-3 top-1 transition-all duration-700 ${step >= 2 ? "rotate-12 scale-110" : "rotate-0"}`}>
            <svg className="w-6 h-6 text-bw-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="max-w-[240px] mx-auto mb-4">
        <div className="h-1.5 bg-bw-border rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-bw-blue to-bw-green rounded-full transition-all duration-700 ease-out"
            style={{ width: step >= 3 ? "100%" : step >= 2 ? "66%" : step >= 1 ? "33%" : "5%" }}
          />
        </div>
      </div>

      {/* Current step */}
      <div className="text-[15px] sm:text-[16px] font-bold text-bw-deep mb-1 text-center">
        {step >= 3 ? "Bijna klaar!" : steps[Math.min(step, steps.length - 1)].label}
      </div>
      <div className="text-[13px] text-bw-text-mid mb-3 text-center">
        {step >= 3 ? "Je resultaat verschijnt zo..." : steps[Math.min(step, steps.length - 1)].desc}
      </div>

      {/* Steps checklist */}
      <div className="space-y-1.5 mb-4">
        {steps.map((s, i) => (
          <div key={i} className={`flex items-center gap-2 transition-all duration-400 ${step > i ? "opacity-100" : step === i ? "opacity-80" : "opacity-30"}`}>
            {step > i ? (
              <svg className="w-4 h-4 text-bw-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : step === i ? (
              <div className="w-4 h-4 border-2 border-bw-blue border-t-transparent rounded-full animate-spin shrink-0" />
            ) : (
              <div className="w-4 h-4 rounded-full border-2 border-bw-border shrink-0" />
            )}
            <span className={`text-[12px] ${step > i ? "text-bw-green-strong font-semibold" : step === i ? "text-bw-deep font-medium" : "text-bw-text-light"}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>

      {/* Trust message */}
      <div className="flex items-center justify-center gap-1.5 text-[11px] text-bw-green font-medium">
        <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/>
        </svg>
        <span>{currentTrust}</span>
      </div>
    </div>
  );
}
