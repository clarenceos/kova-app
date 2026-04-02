# Phase 6: Schema & Foundation - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix the Drizzle migration journal, add three new tables (competitions, registrants, registration_entries) with cuid2 IDs, build a competition-scoped serial number generator, and enforce db.batch() for all new multi-table writes. This phase delivers a trustworthy data layer that every subsequent phase (7-10) builds on.

No UI, no routes, no scheduling logic. Pure data infrastructure.

</domain>

<decisions>
## Implementation Decisions

### Migration Journal Fix
- **D-01:** Add manual journal entries for 0001_phase5_columns and 0002_profiles to `drizzle/meta/_journal.json` so Drizzle Kit recognizes all 3 existing SQL files. Do not delete or regenerate existing migrations.
- **D-02:** After journal fix, `drizzle-kit generate` should produce migration 0003 for the new tables cleanly without "table already exists" errors.

### Serial Number Generator
- **D-03:** Create `lib/queue/serial.ts` as a new file for competition-scoped serial generation. Do NOT modify `lib/serial.ts` — that file remains the recorder flow's random-prefix serial generator.
- **D-04:** Competition serial format: prefix derived from competition name (first letter of each word, uppercased, max 3 chars, padded from first word if < 3 words) + sequential 4-digit number scoped to competition_id. Example: "Girya Pilipinas Cup" → GPC-0001, GPC-0002.
- **D-05:** Sequential number = count of existing registration_entries for this competition_id + 1, zero-padded to 4 digits. UNIQUE constraint on serial column prevents duplicates; retry loop on collision.

### Schema Column Types
- **D-06:** `created_at` columns on all three new tables use `integer("created_at", { mode: "timestamp" })` — matching the existing scores and profiles convention. Drizzle handles Date<->integer conversion automatically.
- **D-07:** `date` (competition date) and `registration_deadline` columns use `text` type with ISO string values — these are user-facing dates, not system audit timestamps. This overrides QUEUE_SPEC's `created_at: text` but preserves its `date: text` and `registration_deadline: text`.

### db.batch() Enforcement
- **D-08:** All new multi-table writes (Phase 6 onward) must use `db.batch()`. No `db.transaction()` calls against Turso HTTP.
- **D-09:** Do NOT audit or rewrite existing server actions — they are all single-table operations that don't need batch. The convention applies to new code only.

### Claude's Discretion
- Exact cuid2 import/generation approach (createId from @paralleldrive/cuid2 or similar)
- Whether to add a comment/docstring in schema.ts documenting the db.batch() convention
- Migration file naming (Drizzle Kit auto-generates the tag)
- Whether to export TypeScript types for the new tables (following existing Score/NewScore pattern)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Data Model Spec
- `QUEUE_SPEC.md` — Complete data model spec with exact column definitions, serial format rules, and scheduling algorithm spec. Phase 6 uses the Data Model and Serial Number Format sections. Note: `created_at` type overridden from text to integer per D-06.

### Existing Schema & DB
- `lib/schema.ts` — Current Drizzle schema (scores, profiles tables) — new tables added here
- `lib/db.ts` — Database client singleton (libsql/client HTTP driver)
- `drizzle.config.ts` — Drizzle Kit configuration (schema path, output dir, turso dialect)
- `drizzle/meta/_journal.json` — Migration journal (currently missing 0001 and 0002 entries)
- `drizzle/0000_strong_punisher.sql` — Initial migration (scores table)
- `drizzle/0001_phase5_columns.sql` — Phase 5 column additions
- `drizzle/0002_profiles.sql` — Profiles table migration

### Serial Generation
- `lib/serial.ts` — Existing random-prefix serial generator (DO NOT MODIFY)

### Requirements
- `.planning/REQUIREMENTS.md` §v2.0 — DATA-01, DATA-02, DATA-03 requirements for this phase

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/schema.ts` pattern: `sqliteTable()` with typed exports (`Score/NewScore`) — follow same pattern for new tables
- `lib/db.ts` singleton: `drizzle(client)` from libsql/client HTTP — reuse, don't create a second client
- `lib/serial.ts` structure: `randomSerial()` private + `generateSerial()` exported async — similar pattern for competition serial

### Established Patterns
- Drizzle column types: `text()` for strings, `integer()` for ints, `real()` for floats, `integer({ mode: "timestamp" })` for timestamps
- Primary keys: `text("id").primaryKey()` with no auto-generation at DB level (app generates IDs)
- Server actions in `lib/actions/*.ts` — single-table operations, no batch/transaction needed so far
- No foreign key constraints defined at Drizzle level in existing schema (scores has no FK references)

### Integration Points
- New tables defined in `lib/schema.ts` alongside existing tables
- New server actions will go in `lib/actions/` (e.g., competitions.ts, registrations.ts) in later phases
- `lib/queue/serial.ts` — new directory `lib/queue/` for all queue-system utilities (serial, scheduler, weightClass)

</code_context>

<specifics>
## Specific Ideas

- QUEUE_SPEC.md prefix derivation examples: "Manila Open" → MAN (pad with first 3 letters of first word if fewer than 3 words)
- Biathlon/triathlon athletes create separate registration_entries with separate serials — not a single entry
- `registration_entries.status` has values: 'registered' | 'scratched' | 'dns' — not the same as scores.status
- QUEUE_SPEC says "Assigned server-side in a DB transaction" but per D-08 this means db.batch(), not db.transaction()
- Serial numbers are NOT displayed on the timetable/queue view (per QUEUE_SPEC)
- `registrants.club` and `registrants.coach` are nullable text fields

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-schema-foundation*
*Context gathered: 2026-04-02*
