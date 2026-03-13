# Account Portal Redesign — "Mijn Agent"

## Problem

The current `/account` portal is a basic 3-tab layout (polissen, energie, overstappen) that shows saved analyses as a list. It lacks:

- Contract end dates (einddatum) — crucial for knowing when to switch
- Visual dashboard cards with status badges
- Alert system for when cheaper options are found after initial scan
- Energy contract overview (currently placeholder)
- Insurer contact info for questions/claims (redirect, not handle)
- WhatsApp integration display

## Positioning

DeVerzekeringsAgent is a **watchdog/agent**, not an insurer. The portal:

- Shows what the consumer pays and whether cheaper options exist
- Alerts when a better deal is found (even if first scan found nothing)
- Facilitates switching via affiliate links + cancellation letter generator
- Redirects questions/claims to the actual insurer (phone + website)
- Does NOT handle claims, disputes, or policy management

## Design

### Database Migration

Add columns to `saved_analyses`:

```sql
ALTER TABLE saved_analyses ADD COLUMN einddatum DATE;
ALTER TABLE saved_analyses ADD COLUMN polisnummer TEXT;
ALTER TABLE saved_analyses ADD COLUMN verzekeraar_telefoon TEXT;
ALTER TABLE saved_analyses ADD COLUMN verzekeraar_website TEXT;
ALTER TABLE saved_analyses ADD COLUMN alert_gevonden BOOLEAN DEFAULT false;
ALTER TABLE saved_analyses ADD COLUMN alert_alternatief TEXT;
ALTER TABLE saved_analyses ADD COLUMN alert_besparing NUMERIC(8,2);
ALTER TABLE saved_analyses ADD COLUMN alert_datum TIMESTAMPTZ;
ALTER TABLE saved_analyses ADD COLUMN notified BOOLEAN DEFAULT false;
```

Fields explained:
- `einddatum` — contract end date, drives "opzeggen voor" warnings
- `polisnummer` — optional, for cancellation letter
- `verzekeraar_telefoon/website` — pre-filled from verzekeraar-meta, editable per analysis
- `alert_gevonden` — set to `true` by daily cron when cheaper option found
- `alert_alternatief/besparing/datum` — details of the cheaper option
- `notified` — whether user has been notified (WhatsApp/email)

### Verzekeraar Contact Data

Extend `verzekeraar-meta.ts` with contact info:

```ts
export const VERZEKERAAR_CONTACT: Record<string, {
  telefoon: string;
  website: string;
  openingstijden: string;
}> = {
  "a.s.r.": { telefoon: "030 257 91 11", website: "https://www.asr.nl/contact", openingstijden: "Ma-Vr 8:00-17:00" },
  "Centraal Beheer": { telefoon: "055 579 81 00", website: "https://www.centraalbeheer.nl/contact", openingstijden: "Ma-Vr 8:00-18:00" },
  // ... all insurers
};
```

### Page Layout — Single Scrollable Dashboard

No more tabs. One page with clear sections:

#### Header: Status Summary

```
Hoi [naam], wij bewaken je polissen 24/7

[X polissen]    [€Y besparing mogelijk]    [Z alerts]
  bewaakt           per jaar                 gevonden
```

Three stat cards in a row. Green/orange coloring based on whether alerts exist.

#### Section: Mijn verzekeringen

Cards per policy (not table rows):

```
┌─────────────────────────────────────────────────────────────┐
│ [icon] Opstalverzekering                    ● Je zit goed  │
│                                                             │
│ ABN AMRO                    € 18,50/mnd                     │
│ Uitgebreid                  Einddatum: 1 juni 2026          │
│                                                             │
│ ▸ Vragen of schade?                                         │
└─────────────────────────────────────────────────────────────┘
```

When alert found:

```
┌─────────────────────────────────────────────────────────────┐
│ [icon] Inboedelverzekering      ● Goedkoper gevonden!       │
│                                                             │
│ Interpolis                  € 14,20/mnd                     │
│ Basis                       Einddatum: 1 maart 2027         │
│                                                             │
│ ┌─ BESPARING ─────────────────────────────────────────────┐ │
│ │ a.s.r. biedt dezelfde dekking voor € 9,50/mnd          │ │
│ │ Bespaar € 56,40/jaar    [Bekijk alternatief]            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ ▸ Vragen of schade?                                         │
└─────────────────────────────────────────────────────────────┘
```

Einddatum warning (< 3 months):

```
│ ⚠ Let op: je kunt opzeggen voor 1 april 2026               │
```

Expandable "Vragen of schade?" section per card:

```
│ ▾ Vragen of schade?                                         │
│   Neem contact op met ABN AMRO:                             │
│   ☎ 030 257 91 11  ·  Ma-Vr 8:00-17:00                     │
│   🌐 asr.nl/contact                                         │
│   ────────────────────────────────────────                   │
│   [Opzegbrief maken]                                        │
```

Bottom of section: "+ Polis toevoegen" button → links to /upload

#### Section: Mijn energie

Same card concept for energy contract:

```
┌─────────────────────────────────────────────────────────────┐
│ [⚡] Energiecontract                    ● Goedkoper gevonden │
│                                                             │
│ Stedin — Variabel           € 195/mnd                       │
│ 3.500 kWh + 1.200 m³       Einddatum: doorlopend            │
│                                                             │
│ ┌─ BESPARING ─────────────────────────────────────────────┐ │
│ │ Vattenfall — Vast biedt € 163/mnd                       │ │
│ │ Bespaar € 390/jaar      [Overstappen]                   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Uses data from `energie_leads` table (matched by user email) + `saved_analyses` with `product_type = 'energie'`.

#### Section: WhatsApp koppeling

Compact CTA card:

```
┌─────────────────────────────────────────────────────────────┐
│ 💬 Ontvang alerts via WhatsApp                              │
│                                                             │
│ We sturen je een bericht zodra we een goedkopere            │
│ verzekering of energieleverancier vinden.                    │
│                                                             │
│ [Start op WhatsApp]                                         │
└─────────────────────────────────────────────────────────────┘
```

### Alert System (Cron Extension)

The existing daily cron `/api/cron/scrape` already calculates premiums per insurer. Extension:

1. After scraping: query all `saved_analyses` where `monitoring_active = true`
2. For each: compare `premie_huidig` against latest scraped premiums for same `product_type`
3. If cheaper option found (> €1/mnd savings threshold):
   - Set `alert_gevonden = true`
   - Set `alert_alternatief`, `alert_besparing`, `alert_datum`
4. If `notified = false` and alert just set: queue WhatsApp notification
5. Mark `notified = true` after sending

### API Changes

**New endpoint: `PATCH /api/analyses/[id]`**
- Update `einddatum`, `polisnummer`, `monitoring_active`
- Used by inline edit in dashboard cards

**Extend `POST /api/analyses`**
- Accept additional fields: `einddatum`, `polisnummer`

**Extend `GET /api/analyses`**
- Return new alert fields in response

### Save Flow Integration

When user completes analysis on `/analyse/demo` or `/energie-analyse`:
- If logged in: auto-save to `saved_analyses` (currently manual)
- Pre-fill `verzekeraar_telefoon/website` from `VERZEKERAAR_CONTACT`
- Prompt for `einddatum` (optional, can add later in dashboard)

### Mobile Layout

- Stat cards: horizontal scroll on mobile
- Policy cards: full width, stacked
- Expandable sections collapse by default
- "Polis toevoegen" as sticky bottom button on mobile

## Files to Create/Modify

### New files:
- `supabase/migration-account-portal.sql` — database migration
- `src/app/account/dashboard.tsx` — new dashboard client component

### Modified files:
- `src/app/account/page.tsx` — replace tabs with dashboard layout
- `src/lib/verzekeraar-meta.ts` — add VERZEKERAAR_CONTACT
- `src/lib/queries.ts` — extend saveAnalysis, getUserAnalyses
- `src/app/api/analyses/route.ts` — accept new fields
- `src/app/api/analyses/[id]/route.ts` — add PATCH handler
- `src/app/api/cron/scrape/route.ts` — add alert checking after scrape

### Unchanged:
- Auth flow, middleware, upload page, comparison pages
- WhatsApp bot (notification integration is future scope)

## Out of Scope

- Email notifications (future)
- WhatsApp alert sending (future — infrastructure exists)
- PDF policy storage/viewing
- Multi-user household accounts
- Automatic cancellation submission
