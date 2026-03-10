import type {
  IDaisyconClient,
  LeverancierMapping,
  SyncResult,
  DaisyconStatus,
} from './types';
import { DaisyconClient } from './client';
import { MockDaisyconClient } from './mock-client';
import leveranciersData from '@/data/leveranciers.json';

// ═══ MAPPING: Daisycon campagnenaam → onze leveranciersnaam ═══
const NAAM_MAPPING: Record<string, string> = {
  'Frank Energie BV': 'Frank Energie',
  'Zonneplan BV': 'Zonneplan',
  'Budget Energie BV': 'Budget Energie',
  'Tibber Nederland BV': 'Tibber',
  'Greenchoice BV': 'Greenchoice',
  'Vattenfall Nederland NV': 'Vattenfall',
  'Eneco Energie BV': 'Eneco',
  'Essent Retail Energie BV': 'Essent',
  'Powerpeers BV': 'Powerpeers',
  'DELTA Energie BV': 'Delta',
  'Pure Energie BV': 'Pure Energie',
  'ENGIE Energie Nederland NV': 'Engie',
  'Oxxio Nederland BV': 'Oxxio',
  'Coolblue Energie BV': 'Coolblue Energie',
  'United Consumers BV': 'United Consumers',
  'Vandebron Energie BV': 'Vandebron',
  'NLE BV': 'NLE',
  'ANWB Energie BV': 'ANWB Energie',
};

// Cached state
let cachedSync: SyncResult | null = null;

/** Retourneert mock of echte client op basis van env vars */
export function getDaisyconClient(): IDaisyconClient {
  if (process.env.DAISYCON_CLIENT_ID) {
    return new DaisyconClient();
  }
  return new MockDaisyconClient();
}

/** Bepaalt of we in mock-modus draaien */
export function isMockMode(): boolean {
  return !process.env.DAISYCON_CLIENT_ID;
}

/** Haalt alle campagnes op en mapt naar onze leveranciers */
export async function syncAffiliateProgrammas(): Promise<SyncResult> {
  const client = getDaisyconClient();
  const publisherId = parseInt(process.env.DAISYCON_PUBLISHER_ID || '99999', 10);
  const programs = await client.getPrograms(publisherId);
  const onzeLeveranciers = Object.keys(leveranciersData.leveranciers);

  const mappings: LeverancierMapping[] = [];
  const gemaptSet = new Set<string>();

  for (const program of programs) {
    const onzeNaam = NAAM_MAPPING[program.name];
    if (onzeNaam && onzeLeveranciers.includes(onzeNaam)) {
      gemaptSet.add(onzeNaam);
      mappings.push({
        leverancierNaam: onzeNaam,
        daisyconProgramId: program.id,
        daisyconProgramNaam: program.name,
        commissie: program.commission_amount,
        commissieType: program.commission_type,
        trackingUrl: program.tracking_url,
        status: program.status,
      });
    }
  }

  // Voeg ongemapte leveranciers toe
  for (const naam of onzeLeveranciers) {
    if (!gemaptSet.has(naam)) {
      mappings.push({
        leverancierNaam: naam,
        daisyconProgramId: 0,
        daisyconProgramNaam: '',
        commissie: 0,
        commissieType: 'cpl',
        trackingUrl: '',
        status: 'unmapped',
      });
    }
  }

  const result: SyncResult = {
    mode: isMockMode() ? 'mock' : 'live',
    timestamp: new Date().toISOString(),
    leveranciers: mappings.sort((a, b) => a.leverancierNaam.localeCompare(b.leverancierNaam)),
    totaalGemapt: gemaptSet.size,
    totaalNietGemapt: onzeLeveranciers.length - gemaptSet.size,
  };

  cachedSync = result;
  return result;
}

/** Retourneert tracking URL voor een leverancier met optioneel sub-ID */
export async function getTrackingUrl(leverancierNaam: string, subId?: string): Promise<string | null> {
  if (!cachedSync) {
    await syncAffiliateProgrammas();
  }

  const mapping = cachedSync!.leveranciers.find(
    m => m.leverancierNaam === leverancierNaam && m.status !== 'unmapped',
  );

  if (!mapping?.trackingUrl) {
    // Fallback naar placeholder URL uit leveranciers.json
    const lev = (leveranciersData.leveranciers as unknown as Record<string, { affiliate?: { url?: string } | null }>)[leverancierNaam];
    return lev?.affiliate?.url || null;
  }

  let url = mapping.trackingUrl;
  if (subId) {
    url += `&s1=${encodeURIComponent(subId)}`;
  }
  return url;
}

/** Retourneert commissiebedrag voor een leverancier */
export async function getCommissie(leverancierNaam: string): Promise<number> {
  if (!cachedSync) {
    await syncAffiliateProgrammas();
  }

  const mapping = cachedSync!.leveranciers.find(
    m => m.leverancierNaam === leverancierNaam && m.status !== 'unmapped',
  );

  return mapping?.commissie || 0;
}

/** Retourneert huidige status */
export function getDaisyconStatus(): DaisyconStatus {
  return {
    mode: isMockMode() ? 'mock' : 'live',
    configured: !!process.env.DAISYCON_CLIENT_ID,
    publisherId: process.env.DAISYCON_PUBLISHER_ID || null,
    sandbox: process.env.DAISYCON_USE_SANDBOX !== 'false',
    totaalLeveranciers: Object.keys(leveranciersData.leveranciers).length,
    totaalGemapt: cachedSync?.totaalGemapt || 0,
    laatstGesynchroniseerd: cachedSync?.timestamp || null,
  };
}
