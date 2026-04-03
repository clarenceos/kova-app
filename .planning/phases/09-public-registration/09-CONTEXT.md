# Phase 9: Public Registration - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Athletes can self-register for a competition via a public link at `/registration/[compId]`, select their events with bell weights and durations, and receive confirmed serial numbers on a success page. Guard states prevent registration when the competition is not found, not open, deadline passed, or full. Multi-event entries (biathlon/triathlon) create separate entries with separate serials, all assigned atomically via `db.batch()`.

Deliverables:
1. Registration form page at `/registration/[compId]` with personal details + event selection
2. Server action to create registrant + N entry rows with serials atomically
3. Success page at `/registration/[compId]/success?registrantId=xxx` showing assigned serials
4. Guard states for closed, full, deadline-passed, and not-found competitions

</domain>

<decisions>
## Implementation Decisions

### Country Dropdown (D-01, D-02, D-03)
- **D-01:** Searchable combobox for country selection using shadcn/ui Combobox pattern (Popover + Command). Type-to-filter, keyboard navigable.
- **D-02:** Full ISO 3166-1 country list (~249 countries/territories). Hardcoded array in a constants file — no runtime dependency.
- **D-03:** Countries display with flag emoji + name in the dropdown (e.g. "Philippines"). Stored value is the country name string only.

### Event Config Reveal (D-04, D-05, D-06)
- **D-04:** Inline expand pattern — checking an event checkbox reveals bell weight + duration selectors directly below that checkbox. Unchecking collapses them and clears selections.
- **D-05:** Bell weight dropdown has no default — shows "Select bell weight" placeholder. Athlete must explicitly select. Validation catches unselected state.
- **D-06:** When competition allows only one duration (e.g. '10 min only'), show as static text "Duration: 10 min" — visible but non-interactive. When 'both', show radio buttons for 10min/5min.

### Success Page Data Flow (D-07, D-08)
- **D-07:** Server action returns `{ registrantId }` on success. Client redirects to `/registration/[compId]/success?registrantId=xxx`. Success page is a server component that fetches registrant + entries from DB. Refreshable, bookmarkable.
- **D-08:** Success page works for any valid registrant ID — no session scoping. Acts as a receipt/bookmark. Useful for coaches registering multiple athletes.

### Guard State Presentation (D-09, D-10)
- **D-09:** Guard states (closed, full, deadline passed) display as a branded card with the same max-width layout as the form. Shows competition name and date at top, clear status message below, no form rendered.
- **D-10:** Invalid compId (not found in DB) uses Next.js `notFound()` — standard 404 with correct HTTP status. No competition name available to show anyway.

### From Prior Phases (carried forward)
- Multi-table writes use `db.batch()` exclusively — no `db.transaction()` (Phase 6 D-08)
- Serial generation via `generateCompetitionSerial(competitionId, serialPrefix)` from `lib/queue/serial.ts` (Phase 6)
- Registration link format: `/registration/[compId]` (Phase 8 D-03)
- No auth gate on any page (QUEUE_SPEC R1)
- Desktop-first layout (QUEUE_SPEC R2)

### Claude's Discretion
- Whether to animate the event config expand/collapse (CSS transition) or instant show/hide
- Combobox component internals (whether to install shadcn Command component or build lighter)
- Form validation approach (inline per-field vs toast vs summary)
- Loading/submitting state indicator style
- Whether country constants file includes ISO codes or just names
- Success page visual design (table styling, screenshot instruction placement)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Registration Spec
- `QUEUE_SPEC.md` §/registration/[compId] — Complete form field spec, field order, guard states, event/bell weight filtering rules, submit behavior
- `QUEUE_SPEC.md` §/registration/[compId]/success — Success page content spec (serial table, "Register another" button)
- `QUEUE_SPEC.md` §Serial Number Format — Serial assignment rules (server-side, XXX-0000, sequential per competition)

### Requirements
- `.planning/REQUIREMENTS.md` §v2.0 — REG-01 through REG-08 requirements for this phase

### Schema & Data Layer
- `lib/schema.ts` — `registrants` table (lines 56-67) and `registrationEntries` table (lines 72-85) with all columns and types
- `lib/queue/serial.ts` — `generateCompetitionSerial(competitionId, serialPrefix)` for serial assignment with collision retry
- `lib/queue/serial-prefix.ts` — `deriveSerialPrefix(name)` re-exported from serial.ts

### Existing Patterns
- `lib/actions/competitions.ts` — Server action pattern: `"use server"`, try/catch, `revalidatePath`, return `{ id }` or `{ error }`
- `app/organizerdb/create/page.tsx` — Form component pattern: useState for each field, inline validation, shadcn components + native inputs with inputClass

### Prior Phase Context
- `.planning/phases/06-schema-foundation/06-CONTEXT.md` — Schema decisions (D-06 timestamps, D-07 text dates, D-08 db.batch())
- `.planning/phases/08-competition-creation/08-CONTEXT.md` — Competition creation decisions (D-03 registration link format, D-06 form fields)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/queue/serial.ts` — `generateCompetitionSerial(competitionId, serialPrefix)` already implemented with retry loop and fallback. Call once per event entry.
- `lib/schema.ts` — `registrants` and `registrationEntries` tables fully defined with types exported (`Registrant`, `NewRegistrant`, `RegistrationEntry`, `NewRegistrationEntry`).
- `lib/actions/competitions.ts` — Pattern for server actions with validation, DB insert, and revalidation.
- `lib/db.ts` — Database singleton with `db.batch()` support.
- shadcn/ui components installed: Input, Label, RadioGroup, RadioGroupItem, Checkbox. Combobox (Popover + Command) may need to be added.
- `app/organizerdb/create/page.tsx` — inputClass and labelClass constants for consistent form styling.

### Established Patterns
- Server actions: `"use server"` directive, try/catch, return `{ success_field }` or `{ error: string }`
- Form components: `'use client'`, useState per field, inline error display, native inputs with Kova design tokens (charcoal bg, raw-steel border, patina-bronze focus)
- cuid2 PKs auto-generated via `$defaultFn(() => createId())` — no manual ID needed
- `integer("created_at", { mode: "timestamp" })` set to `new Date()` on insert

### Integration Points
- New route: `app/registration/[compId]/page.tsx` — registration form (client component for interactive event selection)
- New route: `app/registration/[compId]/success/page.tsx` — success page (server component fetching by registrantId)
- New server action: `lib/actions/registrations.ts` — `registerAthlete` action using `db.batch()` for atomic insert
- New constants: `lib/constants/countries.ts` — ISO 3166-1 country list with flag emojis

</code_context>

<specifics>
## Specific Ideas

- QUEUE_SPEC field order is locked: Last Name, First Name, Gender, Body Weight, Country, Events (with per-event config), Club, Coach
- Helper text for First Name: "If you go by a single name (e.g. Suharto), enter it in both fields."
- Helper text for Coach: "Only fill in if your coach will be present on competition day."
- LC and Jerk use double bell options filtered from competition's `allowedBellWeights`; Snatch uses single bell options
- Success page message: "Screenshot or save your serial numbers. These are your competition identifiers."
- "Register another athlete" button on success page returns to the blank form — useful for coaches registering a full team
- Guard state messages per QUEUE_SPEC: "Registration is closed" (status/deadline), "This competition is full" (capacity)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-public-registration*
*Context gathered: 2026-04-03*
