import leveranciersData from '@/data/leveranciers.json';
import { Contract, Affiliate, Leverancier } from '../whatsapp/types';

interface LeverancierJSON {
  modelcontract_url: string;
  laatst_gescand: string;
  rating: number;
  contracten: Contract[];
  affiliate: Affiliate | null;
}

export function getLeveranciers(): Record<string, Leverancier> {
  const db = leveranciersData as { leveranciers: Record<string, LeverancierJSON> };
  const result: Record<string, Leverancier> = {};

  for (const [naam, info] of Object.entries(db.leveranciers)) {
    result[naam] = {
      naam,
      modelcontract_url: info.modelcontract_url,
      laatst_gescand: info.laatst_gescand,
      rating: info.rating || 7.0,
      contracten: info.contracten.map((c) => ({
        type: c.type,
        normaal: c.normaal,
        dal: c.dal,
        gas: c.gas,
        vastrecht_stroom: c.vastrecht_stroom || 5,
        vastrecht_gas: c.vastrecht_gas || 5,
      })),
      affiliate: info.affiliate || undefined,
    };
  }
  return result;
}

export function berekenBasisKosten(
  normaal_kwh: number,
  dal_kwh: number,
  gas_m3: number,
  contract: Contract,
): number {
  return (
    normaal_kwh * contract.normaal +
    dal_kwh * contract.dal +
    gas_m3 * contract.gas +
    (contract.vastrecht_stroom + contract.vastrecht_gas) * 12
  );
}

export function berekenJaar1Kosten(
  normaal_kwh: number,
  dal_kwh: number,
  gas_m3: number,
  contract: Contract,
  affiliate?: Affiliate,
): number {
  let kosten = berekenBasisKosten(normaal_kwh, dal_kwh, gas_m3, contract);

  if (affiliate) {
    kosten -= affiliate.welkomstbonus;
    kosten -= affiliate.cashback_per_maand * Math.min(affiliate.duur_maanden, 12);
    kosten -= normaal_kwh * affiliate.korting_stroom;
    kosten -= dal_kwh * affiliate.korting_stroom;
    kosten -= gas_m3 * affiliate.korting_gas;
  }

  return kosten;
}
