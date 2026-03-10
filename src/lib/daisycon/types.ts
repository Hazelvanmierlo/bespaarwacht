// ═══ DAISYCON API TYPES ═══

export interface DaisyconProgram {
  id: number;
  name: string;
  status: 'active' | 'paused' | 'pending';
  category: string;
  commission_type: 'cpl' | 'cps' | 'cpc'; // cost per lead / sale / click
  commission_amount: number; // in EUR
  currency: string;
  tracking_url: string;
  logo_url?: string;
}

export interface DaisyconMaterial {
  id: number;
  program_id: number;
  name: string;
  type: 'textlink' | 'banner' | 'deeplink';
  url: string;
  tracking_url: string;
}

export interface DaisyconTransaction {
  id: string;
  program_id: number;
  sub_id: string;
  status: 'open' | 'approved' | 'declined';
  commission: number;
  currency: string;
  created_at: string;
}

export interface DaisyconPublisher {
  id: number;
  name: string;
  status: 'active' | 'paused';
}

export interface DaisyconTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

// ═══ INTERNAL MAPPING TYPES ═══

export interface LeverancierMapping {
  leverancierNaam: string;       // Onze naam (bijv. "Frank Energie")
  daisyconProgramId: number;     // Daisycon campaign ID
  daisyconProgramNaam: string;   // Daisycon campaign naam
  commissie: number;             // Commissie in EUR
  commissieType: 'cpl' | 'cps' | 'cpc';
  trackingUrl: string;           // Volledige tracking URL
  status: 'active' | 'paused' | 'pending' | 'unmapped';
}

export interface SyncResult {
  mode: 'mock' | 'live';
  timestamp: string;
  leveranciers: LeverancierMapping[];
  totaalGemapt: number;
  totaalNietGemapt: number;
}

export interface DaisyconStatus {
  mode: 'mock' | 'live';
  configured: boolean;
  publisherId: string | null;
  sandbox: boolean;
  totaalLeveranciers: number;
  totaalGemapt: number;
  laatstGesynchroniseerd: string | null;
}

// ═══ CLIENT INTERFACE ═══

export interface IDaisyconClient {
  getPublishers(): Promise<DaisyconPublisher[]>;
  getPrograms(publisherId: number): Promise<DaisyconProgram[]>;
  getMaterials(publisherId: number, programId: number): Promise<DaisyconMaterial[]>;
  getTransactions(publisherId: number, params?: { startDate?: string; endDate?: string }): Promise<DaisyconTransaction[]>;
}
