import { EnergyData, ComparisonResult, VergelijkingRegel } from './types';
import { getLeveranciers, berekenBasisKosten, berekenJaar1Kosten } from '../energy/tariffs';

export function vergelijk(data: EnergyData): ComparisonResult {
  const leveranciers = getLeveranciers();
  const huidigeKosten = data.kosten_jaar || data.kosten_maand * 12;

  const normaal_kwh = data.stroom_normaal_kwh || data.stroom_kwh_jaar;
  const dal_kwh = data.stroom_dal_kwh || 0;
  const gas_m3 = data.gas_m3_jaar || 0;

  const resultaten: VergelijkingRegel[] = [];

  for (const [naam, lev] of Object.entries(leveranciers)) {
    for (const contract of lev.contracten) {
      const basis = berekenBasisKosten(normaal_kwh, dal_kwh, gas_m3, contract);
      const jaar1 = berekenJaar1Kosten(normaal_kwh, dal_kwh, gas_m3, contract, lev.affiliate);

      resultaten.push({
        naam,
        contract_type: contract.type,
        basis_jaarkosten: Math.round(basis),
        jaar1_kosten: Math.round(jaar1),
        besparing_basis: Math.round(huidigeKosten - basis),
        besparing_jaar1: Math.round(huidigeKosten - jaar1),
        rating: lev.rating,
        affiliate_url: lev.affiliate?.url,
      });
    }
  }

  resultaten.sort((a, b) => a.jaar1_kosten - b.jaar1_kosten);

  const top3 = resultaten.slice(0, 3);
  const goedkoopste = top3[0];

  return {
    huidig: { naam: data.leverancier, jaarkosten: Math.round(huidigeKosten) },
    resultaten,
    top3,
    besparingPerJaar: goedkoopste.besparing_jaar1,
    besparingPerMaand: Math.round(goedkoopste.besparing_jaar1 / 12),
    meter_type: data.meter_type || 'enkel',
  };
}
