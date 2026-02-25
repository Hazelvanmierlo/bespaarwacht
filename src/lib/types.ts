export interface Alternative {
  id: string;
  naam: string;
  premie: number;        // exact maandbedrag
  dekking: string;
  eigenRisico: string;
  beoordeling: number;
  beoordelingBron: string;
  highlight: string;
  url: string;
  kleur: string;
}

export interface AnonField {
  veld: string;
  origineel: string;
  anon: string;
  status: "verwijderd" | "deels" | "bewaard";
}

export interface AnonResult {
  klantId: string;
  fields: AnonField[];
}

export interface PolisData {
  naam: string;
  adres: string;
  postcode: string;
  woonplaats: string;
  polisnummer: string;
  verzekeraar: string;
  type: string;
  dekking: string;
  voorwaarden: string;
  jaarpremie: number;
  maandpremie: number;
  eigenRisico: string;
  ingangsdatum: string;
  verlengingsdatum: string;
  opzegtermijn: string;
  gezin: string;
  woning: string;
  bouwaard: string;
  oppervlakte: string;
  dekkingen: Dekking[];
}

export interface Dekking {
  rubriek: string;
  diefstal: string;
  anders: string;
}

export interface SavedPolis {
  id: string;
  datum: string;
  verzekeraar: string;
  type: string;
  dekking: string;
  maandpremie: number;
  woning: string;
  oppervlakte: string;
  postcode: string;
  woonplaats: string;
  maxBesparing: number;
  monitoringActive: boolean;
}
