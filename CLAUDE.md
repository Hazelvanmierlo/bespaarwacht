# CLAUDE.md — DeVerzekeringsAgent (bespaarwacht-app)

## Project Overview

Dutch insurance and energy comparison platform. Users upload policies/energy bills (PDF or manual input), get price comparisons, and receive 24/7 monitoring via WhatsApp.

## Tech Stack

- **Framework**: Next.js 16 (App Router), React 19, TypeScript 5
- **Database**: Supabase (PostgreSQL with RLS) — no ORM, raw SQL + Supabase JS client
- **Auth**: NextAuth v5 (beta) — Google OAuth + email/password, JWT sessions
- **Styling**: Tailwind CSS v4 (`@theme` directive in `globals.css`)
- **State**: React hooks (no Redux/Zustand); Vercel KV for WhatsApp conversation state
- **Scraping**: Playwright for live scrapers, calculated formulas for daily cron
- **AI**: Anthropic SDK for policy parsing and energy tips
- **Messaging**: WhatsApp via Twilio (sandbox) or Meta Cloud API (production)
- **Affiliate**: Daisycon integration for insurance switch tracking
- **Email**: Resend
- **Deploy**: Vercel with cron jobs

## Commands

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run lint` — ESLint
- `npm run scrape:live` — Run Playwright scrapers manually

## Project Structure

```
src/
├── app/                    # Next.js App Router pages + API routes
│   ├── api/                # REST endpoints (route.ts files)
│   ├── admin/              # Admin dashboard (role: admin)
│   ├── account/            # Authenticated user portal
│   └── ...                 # Public pages (upload, analyse, energie-analyse)
├── components/             # React components (PascalCase)
├── lib/
│   ├── scrapers/           # Insurance scrapers (base class + per-product)
│   │   └── playwright/     # Live browser scrapers
│   ├── whatsapp/           # WhatsApp bot (client, conversation state machine)
│   ├── energie/            # Energy PDF parsing + comparison
│   ├── energy/             # Energy tariff detection + calculations
│   ├── daisycon/           # Affiliate tracking
│   ├── supabase.ts         # Browser client (anon key)
│   ├── supabase-server.ts  # Server client (service role)
│   ├── types.ts            # Global TypeScript interfaces
│   └── queries.ts          # Supabase query functions
├── data/                   # Static data (leveranciers.json)
├── auth.ts                 # NextAuth configuration
└── middleware.ts           # Route protection (account, admin, api/scrape)
```

## Coding Conventions

- **Imports**: Always use `@/*` path alias for `src/` imports
- **Components**: PascalCase filenames, default export for pages/layouts, named exports elsewhere
- **API routes**: `route.ts` with exported GET/POST/PUT/DELETE functions
- **Server components** by default; add `"use client"` only when needed (hooks, interactivity)
- **Database**: Use `getSupabaseAdmin()` from `supabase-server.ts` for server-side queries
- **Auth**: Use `auth()` in server components, `useSession()` in client components
- **Styling**: Tailwind utilities inline; custom tokens defined in `globals.css`
- **No dark mode** — light-only design
- **UI text is Dutch**, code/comments in English

## Auth & Route Protection

Middleware protects routes:
- `/account/*` — requires authentication
- `/admin/*` — requires admin role
- `/api/scrape/*` — requires admin role

## Scraper Architecture

Two types of scrapers inheriting from `BaseScraper`:
1. **Calculated** (`lib/scrapers/[product]/[company].ts`) — hardcoded formulas, fast, used in cron
2. **Live** (`lib/scrapers/playwright/*-live.ts`) — Playwright browser automation, slow, manual only

Product types: `inboedel`, `opstal`, `aansprakelijkheid`, `reis`

## Cron Jobs (vercel.json)

- `/api/cron/scrape` — 06:00 daily (insurance premiums)
- `/api/cron/energy-update` — 03:00 daily (energy tariffs)

## Database

Schema in `supabase/schema.sql`, migrations in `supabase/migration-*.sql`.
Key tables: `users`, `verzekeraars`, `premies`, `scraper_runs`, `saved_analyses`, `energy_tariffs`, `whatsapp_conversations`, `daisycon_leads`

## Important Notes

- Never commit `.env.local` — contains Supabase keys, auth secrets, API keys
- `market-data.ts` provides fallback data when database is unavailable
- WhatsApp webhook handles both Twilio and Meta formats via abstraction in `lib/whatsapp/client.ts`
- PDF fonts must be copied to `public/standard_fonts/` (handled by postinstall script)
- No test framework is set up — no unit/integration tests exist yet
