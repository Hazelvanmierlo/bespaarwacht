// ═══ ENERGY DATA (uit PDF parser) ═══
export interface EnergyData {
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
  stroom_vorig_jaar_kwh: number | null;
  ean_stroom: string | null;
  ean_gas: string | null;
  contract_type: 'vast' | 'variabel' | 'dynamisch';
  adres: string | null;
  naam: string | null;
  meter_type: 'enkel' | 'dubbel';
  contract_einddatum: string | null;
}

// ═══ LEVERANCIER DATABASE (uit modelcontracten) ═══
export interface Contract {
  type: 'Variabel' | '1jaar' | '3jaar' | 'Dynamisch';
  normaal: number;
  dal: number;
  gas: number;
  vastrecht_stroom: number;
  vastrecht_gas: number;
}

export interface Affiliate {
  welkomstbonus: number;
  cashback_per_maand: number;
  korting_stroom: number;
  korting_gas: number;
  duur_maanden: number;
  code: string;
  url: string;
}

export interface Leverancier {
  naam: string;
  modelcontract_url: string;
  laatst_gescand: string;
  rating: number;
  contracten: Contract[];
  affiliate?: Affiliate;
}

// ═══ VERGELIJKINGSRESULTAAT ═══
export interface VergelijkingRegel {
  naam: string;
  contract_type: string;
  basis_jaarkosten: number;
  jaar1_kosten: number;
  besparing_basis: number;
  besparing_jaar1: number;
  rating: number;
  affiliate_url?: string;
}

export interface ComparisonResult {
  huidig: { naam: string; jaarkosten: number };
  resultaten: VergelijkingRegel[];
  top3: VergelijkingRegel[];
  besparingPerMaand: number;
  besparingPerJaar: number;
  meter_type: 'enkel' | 'dubbel';
}

// ═══ CONVERSATION STATE ═══
export interface ConversationState {
  state: 'WELCOME' | 'AWAITING_PDF' | 'PARSING' | 'CONFIRM_DATA' | 'SHOW_RESULTS' | 'CHOOSE_ACTION' | 'COLLECT_INFO' | 'CONFIRM_SWITCH' | 'SWITCH_DONE';
  data: Partial<EnergyData>;
  comparison?: ComparisonResult;
  chosenProvider?: string;
  personalInfo?: { iban?: string; email?: string; ibanBank?: string };
  affiliateUrl?: string;
  affiliateBron?: 'mock' | 'daisycon';
  timestamp: number;
}

export interface DetectedProfile {
  zonnepanelen: boolean;
  elektrischeAuto: boolean;
  warmtepomp: boolean;
  stadsverwarming: boolean;
  reasons: string[];
}
