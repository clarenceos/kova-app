# Phase 8: Competition Creation - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

An organizer can create a competition with all configurable rules (name, date, platforms, durations, bell weights, status, optional max registrants/deadline) and immediately receive a shareable registration link. This phase also builds a minimal competition list page at `/organizerdb` that Phase 10 evolves into the full dashboard.

Deliverables:
1. Competition creation form at `/organizerdb/create`
2. Server action to insert competition into DB
3. Competition list page at `/organizerdb` with cards showing name, date, status, and copyable registration link
4. Serial prefix auto-derivation with live preview on the form

</domain>

<decisions>
## Implementation Decisions

### Post-Creation Landing (D-01)
- **D-01:** Phase 8 builds a competition list page at `/organizerdb` — not a full dashboard. Shows all competitions as cards with name, date, status badge, and copyable registration link. Includes a "New Competition" button linking to `/organizerdb/create`. Phase 10 evolves this into the full dashboard with analytics, registrations table, CSV import, and queue generation.

### Serial Prefix Preview (D-02)
- **D-02:** The competition creation form shows a live preview of the derived serial prefix below the name field as the user types. Uses `deriveSerialPrefix` from `lib/queue/serial.ts` client-side. E.g. typing "Girya Pilipinas Cup" shows "Serial prefix: GPC". Prefix is still auto-derived — organizer cannot override it (per COMP-02).

### Registration Link Format (D-03)
- **D-03:** Registration link uses full URL with origin: `window.location.origin + '/registration/' + compId`. Displayed on competition cards with a "Copy Link" button. Full URL ensures the link works when shared externally (WhatsApp, email, social media).

### Form Validation (D-04)
- **D-04:** Inline per-field validation errors shown on submit. Red text below each invalid field. Standard pattern for a single-column form.
- **D-05:** At least one bell weight must be selected — validation error "Select at least one bell weight" if all are unchecked. A competition with no allowed weights is nonsensical.

### Form Fields (from QUEUE_SPEC — locked)
- **D-06:** Single-column form, desktop centered, standard Kova layout. Fields per QUEUE_SPEC:
  - Competition Name (text, required)
  - Date (date picker, required)
  - Number of Platforms (number, min 1 max 10, default 3)
  - Status (radio: Draft / Open, default Draft)
  - Max Registrants (number, optional)
  - Registration Deadline (datetime picker, optional)
  - Duration Rule (radio: "Both 5 and 10 min" / "10 min only" / "5 min only")
  - Bell weights — two checkbox sections, all checked by default, Select All / Deselect All per section:
    - Double Bell (LC & Jerk): 2x8, 2x12, 2x16, 2x20, 2x24, 2x28, 2x32, 2x36, 2x40
    - Single Bell (Snatch): 1x8, 1x12, 1x16, 1x20, 1x24, 1x28, 1x32

### Submit Flow (from QUEUE_SPEC — locked)
- **D-07:** On submit: derive serial_prefix server-side (validate matches client preview), save competition to DB via server action, redirect to `/organizerdb` where the new competition appears in the list with its copyable registration link.

### Claude's Discretion
- Form component architecture (single component vs split into sections)
- Whether to use shadcn/ui form primitives (RadioGroup, Checkbox, Input) or custom
- Server action error handling patterns (try/catch, revalidatePath)
- Whether "New Competition" button on list page is at top or in an empty state
- Competition card design details (padding, badge styling, hover states)
- Whether to show serial prefix on competition cards

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Competition Creation Spec
- `QUEUE_SPEC.md` §/organizerdb/create — Complete form field spec, layout requirements, submit behavior
- `QUEUE_SPEC.md` §Serial Number Format — Prefix derivation rules and examples
- `QUEUE_SPEC.md` §Routes — Route structure for organizer pages

### Requirements
- `.planning/REQUIREMENTS.md` §v2.0 — COMP-01, COMP-02, COMP-03 requirements for this phase

### Schema & Data Layer
- `lib/schema.ts` — `competitions` table definition with all columns, types, and defaults (lines 39-54)
- `lib/queue/serial.ts` — `deriveSerialPrefix` function for serial prefix derivation from competition name

### Existing Patterns
- `lib/actions/` — Server action patterns (entries.ts, scores.ts) for DB writes
- `lib/db.ts` — Database client singleton

### Phase 6 Context
- `.planning/phases/06-schema-foundation/06-CONTEXT.md` — Schema decisions (D-06 timestamp columns, D-07 text dates, D-08 db.batch() convention)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/queue/serial.ts` — `deriveSerialPrefix(name: string)` already implemented and tested. Import client-side for live preview, server-side for validation on submit.
- `lib/schema.ts` — `competitions` table fully defined with `Competition` and `NewCompetition` types exported. No schema work needed.
- `lib/db.ts` — Database singleton, reuse for server action.
- shadcn/ui components already installed (Radix primitives).

### Established Patterns
- Server actions in `lib/actions/*.ts` — async functions with `"use server"` directive, used via form actions or direct calls
- `integer("created_at", { mode: "timestamp" })` for timestamps — set `new Date()` on insert
- cuid2 PKs auto-generated via `$defaultFn(() => createId())` — no manual ID generation needed
- No existing organizer routes — `/organizerdb/` is a new top-level route group outside `app/(app)/`

### Integration Points
- New route: `app/organizerdb/create/page.tsx` — competition creation form (`'use client'` for live prefix preview)
- New route: `app/organizerdb/page.tsx` — competition list page (server component fetching all competitions)
- New layout: `app/organizerdb/layout.tsx` — standard layout for organizer pages (desktop-first, no auth gate)
- New server action: `lib/actions/competitions.ts` — `createCompetition` server action

</code_context>

<specifics>
## Specific Ideas

- `deriveSerialPrefix` already handles all edge cases per Phase 6 D-04: first letter of each word, max 3 chars, padded from first word if < 3 words
- Competition list page is intentionally minimal — Phase 10 replaces it with the full dashboard featuring the competition dropdown selector pattern from QUEUE_SPEC
- Bell weight JSON storage: `allowedBellWeights` stored as JSON string e.g. `'["2x8","2x12","2x16"]'`. Parse on read, stringify on write.
- Status default is "draft" — organizer can set to "open" during creation to immediately enable registration
- `/organizerdb/` routes are outside `app/(app)/` to avoid mobile-first auth-guarded layout (per v2.0 roadmap decision)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-competition-creation*
*Context gathered: 2026-04-02*
