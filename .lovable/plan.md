
# BioCalc AI — Implementation Plan

A polished, AI-powered biotech lab companion. Per-user accounts via Lovable Cloud, threaded AI chat, 15 working calculators, AI tooling, history, exports, and PWA install.

## Stack mapping (vs your prompt)

| You asked for | We'll use | Why |
|---|---|---|
| Next.js 15 App Router | TanStack Start (React 19 + Vite) | Project framework |
| Prisma + SQLite | Lovable Cloud (Postgres + RLS) | Edge-compatible, multi-user |
| Anthropic Claude direct | Lovable AI Gateway (default Gemini, swappable) | No key required; abstracted provider module |
| Next API routes | TanStack server functions + `/api/chat` server route | Same boundaries |
| Vercel | Lovable Publish | One-click |

All features in your spec are implemented — only the plumbing changes.

## Branding & design

- Name: **BioCalc AI** — tagline "Your AI-Powered Biotechnology Laboratory Companion"
- Palette: white + deep blue + teal accents + subtle gradient backgrounds, defined as semantic tokens in `src/styles.css` (no hardcoded colors in components)
- Typography: distinctive pair — `Space Grotesk` (display) + `Inter` (body)
- Generated DNA/molecule logo (no Sparkles icon)
- Dark/light mode with localStorage persistence
- Framer Motion micro-animations, rounded cards, soft shadows

## Routes (TanStack file-based)

Public:
- `/` — landing (hero, features, stat cards, calculator quick-access, AI preview, why-us, testimonials, FAQ, footer)
- `/auth` — email/password + Google sign-in
- `/about`
- `/calculators` — index/grid of all 15

Authenticated (`_authenticated/`):
- `/_authenticated/calculators/$slug` — each calculator
- `/_authenticated/assistant` — thread list redirect / new chat
- `/_authenticated/assistant/$threadId` — threaded chat (dedicated URL per thread)
- `/_authenticated/protocols` — summarizer + saved protocols
- `/_authenticated/planner` — experiment planner + saved plans
- `/_authenticated/reagents` — reagent/buffer helper
- `/_authenticated/history` — calculation history + favorites + global search results

API:
- `/api/chat` — streaming AI SDK chat endpoint

## Calculators (15, all real math)

Molarity · Dilution (C1V1=C2V2) · PCR Primer Tm (Wallace + GC%) · Agarose Gel · DNA/RNA Concentration (ds/ss/RNA factors) · Loading Dye · Media Prep (LB broth/agar, nutrient broth/agar, TSB, custom) · Serial Dilution (full table) · RPM↔RCF · pH (strong acid/base + Henderson-Hasselbalch) · OD600 Culture Dilution · Unit Converter · Buffer Prep (PBS/TAE/TBE/Tris) · CFU · Restriction Digest Reaction.

Per-calculator UI: validated inputs, formula display, live result, copy/export/save-to-history/reset, explanation panel. Shared `<CalculatorShell>` component.

## AI features (Lovable AI Gateway, default `google/gemini-3-flash-preview`)

Provider abstraction in `src/lib/ai-gateway.server.ts` so swapping to Claude (when user adds `ANTHROPIC_API_KEY`) or OpenAI is one line.

1. **Lab Assistant** — threaded chat via AI Elements (`conversation`, `message`, `prompt-input`, `shimmer`), `useChat` + `DefaultChatTransport` pointed at `/api/chat`, streaming, markdown + code rendering, per-thread route, sidebar of threads, new chat, regenerate, copy. System prompt: biotech lab expert.
2. **Protocol Summarizer** — paste text or upload `.txt`/`.pdf`/`.docx`; parsed client-side (pdfjs-dist + mammoth); server fn calls AI with structured output (summary, steps, materials, reagents, safety, time, common mistakes); export PDF/MD/TXT.
3. **Experiment Planner** — form (goal/equipment/sample/budget/time) → server fn → structured plan (workflow, materials, reagents, timeline, controls, expected outputs, troubleshooting, safety); save to DB.
4. **Reagent Helper** — natural-language query → ingredients/quantities/steps/storage/safety; quick-prompt chips for common buffers.

## Data model (Lovable Cloud / Postgres + RLS, scoped to `auth.uid()`)

- `profiles` (id, display_name, prefs jsonb)
- `chat_threads` (id, user_id, title, updated_at)
- `chat_messages` (id, thread_id, role, parts jsonb, created_at) — UUID PK, never reuse AI SDK `msg_*` IDs as UUIDs
- `calculation_history` (id, user_id, calculator_slug, inputs jsonb, outputs jsonb, favorite, created_at)
- `saved_protocols` (id, user_id, title, source_text, summary jsonb, created_at)
- `experiment_plans` (id, user_id, inputs jsonb, plan jsonb, created_at)
- `user_settings` (id, user_id, theme, defaults jsonb)

Every table: RLS enabled + explicit GRANTs to `authenticated` and `service_role`. Threaded chat uses dedicated `/_authenticated/assistant/$threadId` route; messages persisted in `onFinish` of `toUIMessageStreamResponse`.

## Exports

- PDF — `jspdf` (calculation result, protocol summary, experiment plan)
- Markdown — chat thread export
- CSV — calculation history export
- TXT — protocol summary
- Copy-to-clipboard everywhere

## Global features

- Global smart search (cmd/ctrl-K) across calculators, history, threads, protocols, FAQs
- Toast notifications (`sonner`)
- Loading skeletons, keyboard shortcuts
- Mobile-first responsive, hamburger nav
- Accessibility (ARIA, keyboard nav, focus management on chat composer)
- **PWA**: manifest + service worker via `vite-plugin-pwa` (NetworkFirst HTML, CacheFirst hashed assets, registration guarded against preview/iframe/dev, `?sw=off` kill switch)

## Auth

- Lovable Cloud auth: email/password + Google (via Lovable broker)
- `profiles` table + auto-create trigger on signup
- Protected subtree under `_authenticated/` (integration-managed gate)
- `/reset-password` page included

## Technical details

- Server fns in `src/lib/*.functions.ts`; admin client lazy-imported inside handlers only
- `LOVABLE_API_KEY` ensured via `ai_gateway--create`
- AI Elements installed for chat surface (`conversation message prompt-input shimmer`)
- `react-markdown` + `remark-gfm` for rendered AI output
- Strict TS, semantic tokens only, no hardcoded `text-white`/`bg-black`
- File parsing libs: `pdfjs-dist`, `mammoth` (client-side, dynamic import)

## Build order

1. Enable Lovable Cloud + AI Gateway key + DB schema (migration with GRANTs/RLS)
2. Design tokens, fonts, logo, layout shell (navbar/footer/sidebar)
3. Landing page + auth + profile
4. Calculator shell + all 15 calculators + history wiring
5. AI provider module + `/api/chat` + threaded assistant UI (AI Elements)
6. Protocol summarizer (with file upload/parsing)
7. Experiment planner
8. Reagent helper
9. Exports (PDF/MD/CSV/TXT) + global search + shortcuts
10. PWA setup + polish + QA pass

## Out of scope (call out)

- No Anthropic Claude unless you later add `ANTHROPIC_API_KEY` — code path is ready for it
- No Next.js / Prisma / SQLite files (stack is different)
- Fictional testimonials are clearly marked as illustrative

Ready to switch to build mode and start executing? This will span several build turns given the scope (15 calculators + 4 AI tools + auth + PWA).
