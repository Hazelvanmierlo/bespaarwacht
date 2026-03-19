# Design: Robuuste prijsvergelijking en overstapadvies

**Datum:** 2026-03-19
**Scope:** Fase 1 — upload-parsing, appels-met-appels vergelijking, overstapadvies
**Fase 2 (later):** Voogd & Voogd API, digitale ondertekening, automatische opzegbrief

---

## Probleem

1. Uploads worden soms fout uitgelezen (premie = 0, jaar/maand verwisseld)
2. De vergelijking vergelijkt appels met peren (verschillende dekking/eigen risico)
3. Na de vergelijking weet de klant niet wat te doen (geen overstapadvies)

## Aanpak

Upload-first met wizard als fallback. De upload blijft het unique selling point. Vergelijking altijd op gelijke voorwaarden (zelfde dekking + eigen risico).

---

## 1. Robuuste upload-parsing

### 1.1 Nieuw veld: `premie_periode`

Claude-prompt uitbreiden met een extra veld:

```
"premie_periode": "maand" | "jaar" | "kwartaal" | "onbekend"
```

Dit geeft aan hoe Claude het bedrag interpreteert, zodat de validatielaag correct kan omrekenen.

### 1.2 Validatielaag: `validatePolisData()`

Nieuwe functie in `src/lib/polis-validation.ts` die na Claude-parsing draait:

| Situatie | Actie |
|----------|-------|
| `maandpremie > 0`, `jaarpremie === 0` | `jaarpremie = maandpremie * 12` |
| `jaarpremie > 0`, `maandpremie === 0` | `maandpremie = jaarpremie / 12` |
| `premie_periode === "kwartaal"` | `maandpremie = bedrag / 3` |
| `maandpremie > 500` | Waarschijnlijk jaarbedrag, corrigeer + markeer voor bevestiging |
| `maandpremie < 1` en `jaarpremie < 1` | Markeer als `_needsManualInput` |
| `maandpremie > 100` | Markeer als `_needsConfirmation` met vraag "per maand of per jaar?" |

### 1.3 Bevestigingsscherm verbeteren

Bij `_needsConfirmation`:
- Oranje banner: "We lazen **EUR X**. Is dit per maand of per jaar?"
- Twee knoppen: "Per maand" / "Per jaar"
- Na keuze wordt de premie correct omgerekend

Bij `_needsManualInput`:
- Wizard opent met premie-invoer als eerste (verplicht) veld
- Niet als optioneel veld onderaan

### 1.4 Betere Claude-prompt

Toevoegingen aan de parse-prompt:
- Expliciet vragen om `premie_periode` aan te geven
- Instructie om gecombineerde polissen (inboedel + opstal) te herkennen en te splitsen
- Bij geen premie gevonden: `maandpremie: 0, jaarpremie: 0, premie_periode: "onbekend"`

---

## 2. Appels-met-appels vergelijking

### 2.1 Vergelijkingsprofiel

De dekking en eigen risico uit de geuploadde polis worden het vergelijkingsprofiel. Alle alternatieven worden berekend met exact die parameters.

Velden die het profiel bepalen:
- `dekking` (Basis / Uitgebreid / Extra Uitgebreid / All Risk)
- `eigenRisico` (EUR 0 / EUR 50 / EUR 100 / EUR 150 / EUR 250 / EUR 500)
- `productType` (inboedel / opstal / aansprakelijkheid / reis)
- `postcode`, `woningtype`, `oppervlakte`, `gezin` (voor premium-berekening)

### 2.2 Scraper-aanpassingen

- `polisToScraperInput()` mappt dekking + eigen risico correct naar scraper-input
- On-demand scrape endpoint neemt dekking + eigen risico verplicht mee
- Alternatieven die de gevraagde dekking niet aanbieden worden gefilterd
- De factor-berekening in `premium-model.ts` ondersteunt dit al (dekkingsfactor, eigen-risico-korting)

### 2.3 Resultaatkaarten

Elke alternatief toont:
- **Premie per maand** (berekend met zelfde dekking + eigen risico)
- **Besparing per jaar** t.o.v. huidige premie
- **Dekking + eigen risico** (bevestiging dat het gelijk is)
- **Beoordeling** (Consumentenbond / MoneyView score + bron)

### 2.4 "Tip van je agent" upgrade-suggestie

Alleen tonen als:
- Klant heeft Basis of Uitgebreid dekking
- Upgrade naar het volgende niveau kost < EUR 5/mnd extra bij minstens 1 verzekeraar
- Getoond als subtiele kaart onder de top 3
- Voorbeeld: "Voor EUR 3/mnd meer krijg je bij Centraal Beheer ook dekking tegen eigen schuld-schade"

---

## 3. Concreet overstapadvies

### 3.1 Opzeginfo uit de polis

De Claude-prompt haalt al op: `opzegtermijn`, `ingangsdatum`, `verlengingsdatum`. We berekenen:
- Vroegste opzegdatum
- Of de klant maandelijks kan opzeggen of in een jaarcontract zit
- Waarschuwing als opzegtermijn bijna verloopt

### 3.2 Overstapadvies-blok

Per aanbevolen alternatief, onder de vergelijkingsresultaten:

```
Overstappen naar [Verzekeraar X]

Stap 1: Sluit je nieuwe polis af bij [X]
        [Button: Bekijk bij X →] (Daisycon affiliate link)

Stap 2: Zeg je huidige polis op bij [huidige verzekeraar]
        Opzegtermijn: [X maanden] voor [einddatum]
        Je kunt opzeggen per: [datum]

Stap 3: Je nieuwe polis gaat in op [datum]

⚠ Zorg dat er geen gat zit tussen je oude en nieuwe polis.
```

### 3.3 WhatsApp monitoring

Onderaan het advies:
- "Wil je dat we je premie blijven bewaken?"
- Link naar WhatsApp-flow
- Koppelt aan bestaande `saved_analyses` tabel voor monitoring

---

## 4. Edge cases

| Case | Detectie | Actie |
|------|----------|-------|
| **Premie = 0** | `maandpremie < 1 && jaarpremie < 1` | Wizard opent met premie als eerste veld |
| **Kwartaalpremie** | `premie_periode === "kwartaal"` | `maandpremie = bedrag / 3` |
| **Gecombineerde polis** | Claude detecteert meerdere producttypes | Splitsen of markeren voor handmatige invoer |
| **Oude polis (>2 jaar)** | `ingangsdatum` ouder dan 2 jaar | Waarschuwing: "Deze polis is van [jaar]" |
| **Niet-ondersteund product** | `type === "auto" \| "zorg" \| "rechtsbijstand"` | Eerlijke melding: "Dit vergelijken we nog niet" |
| **Onlogisch hoog bedrag** | `maandpremie > 500` | Automatisch corrigeren naar jaarbedrag |
| **Twijfelgeval** | `maandpremie > 100` | Bevestigingsvraag aan gebruiker |

---

## Bestanden die aangepast worden

| Bestand | Wijziging |
|---------|-----------|
| `src/app/api/parse-pdf/route.ts` | `premie_periode` veld in prompt, validatielaag aanroepen |
| `src/lib/polis-validation.ts` | **Nieuw** — `validatePolisData()` functie |
| `src/lib/polis-to-input.ts` | Dekking + eigen risico correct mappen |
| `src/app/upload/page.tsx` | Bevestigingsscherm voor twijfelgevallen, wizard verbeteren |
| `src/app/analyse/demo/page.tsx` | Resultaatkaarten verrijken, overstapadvies-blok, upgrade-tip |
| `src/app/api/scrape/ondemand/route.ts` | Dekking + eigen risico verplicht meenemen |
| `src/lib/scrapers/premium-model.ts` | Eigen-risico-factor toevoegen aan berekening |
| `src/lib/market-data.ts` | Eigen risico toevoegen aan fallback data |
| `src/lib/types.ts` | `premie_periode`, `_needsConfirmation` types toevoegen |

---

## Niet in scope (Fase 2)

- Voogd & Voogd API-integratie voor direct afsluiten
- Digitale ondertekening
- Automatische opzegbrief genereren + versturen
- Provisie-tracking buiten Daisycon
- OCR-anonimisering voor image uploads
