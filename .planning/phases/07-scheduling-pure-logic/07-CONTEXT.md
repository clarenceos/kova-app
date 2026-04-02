# Phase 7: Scheduling Pure Logic - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement the scheduling algorithm and weight class helper as zero-dependency pure functions in `lib/queue/`. The scheduler receives a typed array of entries, assigns them to time blocks across platforms in KB sport sort order, and returns blocks plus REST/COACH conflict warnings. Weight class is derived from body weight at render time. No DB calls, no UI, no routes — unit-testable with fixture data only.

Deliverables:
1. `lib/queue/scheduler.ts` — pure scheduling function
2. `lib/queue/weightClass.ts` — weight class derivation helper
3. Unit tests for both with fixture data covering sort order, conflicts, edge cases

</domain>

<decisions>
## Implementation Decisions

### Coach Conflict Matching
- **D-01:** Case-insensitive trimmed exact match. Normalize both sides with `toLowerCase().trim()` before comparing. `"regine sulit"` matches `"Regine Sulit"` matches `"REGINE SULIT"`.
- **D-02:** No fuzzy or partial matching — normalization only. If the coach field doesn't exactly match an athlete's full name (after normalization), no conflict is flagged.
- **D-03:** Coach field is `registrant.coach` (nullable text). Match against `firstName + " " + lastName` of other registrants in the same block.

### Entry Filtering Semantics
- **D-04:** Caller filters — scheduler receives only active ('registered') entries. The scheduler function does not import or reference entry status values. The caller (server action in Phase 10) handles the `WHERE status = 'registered'` clause before passing entries to the scheduler.

### Conflict Object Richness
- **D-05:** Rich conflict objects. Each conflict includes:
  - `type`: `'REST'` | `'COACH'`
  - `athleteName`: full name of the affected athlete
  - `blockNumbers`: the two conflicting block numbers
  - For REST: `gap` (number of blocks between), `minRequired` (the minRestBlocks param)
  - For COACH: `coachName`, `studentName`, `blockNumber` (the shared block)
  - For both: `event` and `bellWeight` of the affected entries
- **D-06:** Phase 10 UI consumes conflict objects directly for the conflict panel — no re-computation needed downstream.

### Sort Order & Tiebreakers
- **D-07:** Sort order per QUEUE_SPEC: event group (LC → Jerk → Snatch) → duration (10min before 5min) → gender (Female first) → weight category alphabetically.
- **D-08:** Final tiebreaker within the same weight class: lighter body weight first (ascending sort on `body_weight_kg`). Body weight is stored as `real` so numeric comparison applies.

### REST Conflict Definition
- **D-09:** REST conflict uses strict less-than: flagged when `gap < minRestBlocks`. A gap of exactly `minRestBlocks` is NOT flagged. This follows SCHED-04 and roadmap success criteria, overriding QUEUE_SPEC's `<=` wording.

### Claude's Discretion
- TypeScript interface shapes for `TimeBlock`, `Conflict`, `ScheduleResult`, `SchedulerInput` (follow QUEUE_SPEC's input/output spec)
- Internal helper organization within scheduler.ts (sort function, block assignment, conflict detection as separate internal functions or inline)
- Test fixture design — number of fixtures, edge case coverage strategy
- Whether to export the sort comparator separately for independent testing
- `RegistrationEntryWithRegistrant` composite type definition (join of RegistrationEntry + Registrant fields the scheduler needs)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Scheduling Algorithm Spec
- `QUEUE_SPEC.md` §Scheduling Algorithm — Complete algorithm spec: input/output types, sort order, block assignment, conflict detection rules. Note: REST conflict threshold overridden by SCHED-04 (strict less-than, not `<=`).
- `QUEUE_SPEC.md` §Weight class derivation — Exact bracket boundaries for Male and Female divisions.

### Requirements
- `.planning/REQUIREMENTS.md` §v2.0 — SCHED-01 through SCHED-06 requirements for this phase.

### Schema Types
- `lib/schema.ts` — `RegistrationEntry`, `Registrant` types and table definitions. The scheduler's input type is derived from these (joined fields).

### Existing Queue Code
- `lib/queue/serial.ts` — Existing file in the queue directory. DO NOT MODIFY. Shows the established pattern for `lib/queue/` utilities.
- `lib/queue/serial.test.ts` — Existing test file. Shows vitest testing pattern for queue utilities.

### Phase 6 Context
- `.planning/phases/06-schema-foundation/06-CONTEXT.md` — Schema decisions (D-06 timestamp columns, D-08 db.batch() convention) that shaped the data layer this phase builds on.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/queue/serial.ts` — Established pattern for queue utility functions (exported async function + internal helpers)
- `lib/queue/serial.test.ts` — vitest test pattern with vi.mock for DB dependencies (not needed here since scheduler is pure)
- `lib/schema.ts` — TypeScript types `RegistrationEntry` and `Registrant` available for building the composite input type

### Established Patterns
- vitest configured with `@/` path alias resolution (`vitest.config.ts`)
- Pure function tests don't need vi.mock — simpler test setup than serial.test.ts
- Type exports follow `Type` / `NewType` naming convention (e.g., `Score` / `NewScore`)

### Integration Points
- New files: `lib/queue/scheduler.ts` and `lib/queue/weightClass.ts` — same directory as existing serial utilities
- Phase 10 (Organizer Dashboard & Timetable) will call the scheduler with entries from a DB query and render the returned `timeBlocks` and `conflicts` in the timetable UI
- Weight class helper will also be used by Phase 10 for timetable cell rendering

</code_context>

<specifics>
## Specific Ideas

- QUEUE_SPEC input uses `startTimeMinutes` (minutes since midnight, 9am = 540) — not a Date object
- Block duration defaults to 10 minutes, transition duration defaults to 5 minutes
- `estimatedFinishTime` in output is also minutes since midnight
- Biathlon/triathlon athletes register as separate entries (e.g., JERK + SNATCH) — scheduler treats them independently but REST conflict detection catches the same athlete in adjacent blocks
- Weight class brackets from QUEUE_SPEC:
  - Female: ≤52→52kg, ≤57→57kg, ≤61→61kg, ≤66→66kg, ≤70→70kg, ≤74→74kg, ≤80→80kg, >80→80+kg
  - Male: ≤61→61kg, ≤66→66kg, ≤70→70kg, ≤74→74kg, ≤80→80kg, ≤89→89kg, ≤95→95kg, >95→95+kg

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 07-scheduling-pure-logic*
*Context gathered: 2026-04-02*
