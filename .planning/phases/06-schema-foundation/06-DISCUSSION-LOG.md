# Phase 6: Schema & Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 06-schema-foundation
**Areas discussed:** Migration journal fix strategy, Serial number transition, Schema column types, db.batch() enforcement

---

## Migration Journal Fix Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Add missing journal entries | Manually add entries for 0001 and 0002 to _journal.json so Drizzle knows they exist. Safest — preserves history, doesn't touch SQL files, and drizzle-kit generate will produce 0003 cleanly. | ✓ |
| Snapshot reset | Delete all migration files, run drizzle-kit generate fresh from current schema.ts. Produces a single clean 0000. Simpler but loses migration history and requires marking as applied on live DB. | |
| Let Claude decide | Claude picks the approach based on what works best technically. | |

**User's choice:** Add missing journal entries (Recommended)
**Notes:** User noted this needs a clear strategy or GSD will guess and may break the existing migration history.

---

## Serial Number Transition

| Option | Description | Selected |
|--------|-------------|----------|
| Separate file | Create lib/queue/serial.ts for competition-scoped serials. Leave lib/serial.ts untouched for the recorder flow. Two generators, two concerns, no risk of breaking existing recording serials. | ✓ |
| Extend lib/serial.ts | Add a second exported function (e.g. generateCompetitionSerial) to the existing file. One file for all serial logic, but mixes two different patterns in one module. | |
| Let Claude decide | Claude picks the approach based on codebase conventions. | |

**User's choice:** Separate file (Recommended)
**Notes:** User noted the old lib/serial.ts is random-prefix and the new one is name-derived sequential — GSD needs to know whether to extend or create new.

---

## Schema Column Types

| Option | Description | Selected |
|--------|-------------|----------|
| Integer timestamps | Match existing schema convention: integer('created_at', { mode: 'timestamp' }). Consistent with scores and profiles tables. Drizzle handles Date <-> integer conversion automatically. QUEUE_SPEC's 'text' was a spec choice, not a hard constraint. | ✓ |
| Text ISO strings | Follow QUEUE_SPEC literally: text columns with ISO date strings. Readable in raw DB queries but inconsistent with existing tables. Drizzle won't auto-convert to Date objects. | |
| Let Claude decide | Claude picks based on what's most consistent and maintainable. | |

**User's choice:** Integer timestamps (Recommended)
**Notes:** Applies to created_at only. Follow-up question resolved: user-facing dates (competition date, registration_deadline) stay as text ISO strings.

### Follow-up: User-Facing Date Columns

| Option | Description | Selected |
|--------|-------------|----------|
| Text ISO strings | Keep date and registration_deadline as text. These represent user-chosen dates, not system timestamps. Text is more natural for display and form binding. | ✓ |
| Integer for everything | All date/time columns use integer timestamps for full consistency. Convert to display strings at render time. | |
| Let Claude decide | Claude picks the most practical approach. | |

**User's choice:** Text ISO strings (Recommended)

---

## db.batch() Enforcement

| Option | Description | Selected |
|--------|-------------|----------|
| New code only | Enforce db.batch() for all new multi-table writes (Phase 6+). Don't audit or rewrite existing single-table actions — they don't need batch because they're single operations. Document the convention in schema.ts or a comment. | ✓ |
| Audit everything now | Review all existing server actions too. If any future multi-table scenario is possible, preemptively convert. More thorough but touches code that works fine today. | |
| Let Claude decide | Claude determines the right enforcement scope. | |

**User's choice:** New code only (Recommended)
**Notes:** Existing server actions are all single-table operations and don't need batch.

---

## Claude's Discretion

- cuid2 import/generation approach
- Comment/docstring for db.batch() convention
- Migration file naming (Drizzle Kit auto-generates)
- TypeScript type exports for new tables

## Deferred Ideas

None — discussion stayed within phase scope.
