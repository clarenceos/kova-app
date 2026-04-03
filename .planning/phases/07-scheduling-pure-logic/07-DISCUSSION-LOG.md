# Phase 7: Scheduling Pure Logic - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 07-scheduling-pure-logic
**Areas discussed:** Coach conflict matching, Entry filtering semantics, Conflict object richness

---

## Coach Conflict Matching

| Option | Description | Selected |
|--------|-------------|----------|
| Case-insensitive trimmed exact match | Normalize both sides to lowercase and trim whitespace. No fuzzy or partial matching. | ✓ |
| Fuzzy/partial matching | Allow partial name matches or Levenshtein distance | |
| Exact case-sensitive match | Strict string equality without normalization | |

**User's choice:** Case-insensitive trimmed exact match
**Notes:** User specified directly: "Normalize both sides to lowercase and trim whitespace before comparing. 'regine sulit' matches 'Regine Sulit' matches 'REGINE SULIT'. No fuzzy or partial matching — normalization only."

---

## Entry Filtering Semantics

| Option | Description | Selected |
|--------|-------------|----------|
| Caller filters (Recommended) | Scheduler receives only active entries — simpler pure function, caller handles WHERE clause | ✓ |
| Scheduler filters internally | Scheduler accepts all entries and skips scratched/dns internally | |

**User's choice:** Caller filters (Recommended)
**Notes:** None — straightforward selection.

---

## Conflict Object Richness

| Option | Description | Selected |
|--------|-------------|----------|
| Rich (Recommended) | Conflict includes type, athlete name, block numbers, AND context (gap size, coach/student names, event/bell weight) | ✓ |
| Minimal | Type, athlete name, block numbers only — Phase 10 would need to cross-reference | |
| You decide | Claude picks the right balance | |

**User's choice:** Rich (Recommended)
**Notes:** None — straightforward selection.

---

## Sort Tiebreakers (answered via notes on area selection)

| Option | Description | Selected |
|--------|-------------|----------|
| Lighter body weight first | Ascending sort on body_weight_kg as final tiebreaker within same weight class | ✓ |
| Registration order | Earlier registration goes first | |
| Alphabetical by name | Sort by last name within weight class | |

**User's choice:** Lighter body weight first
**Notes:** User specified directly during area selection: "Within the same weight class, tiebreaker is lighter body weight goes first. Body weight is already stored as a real number so sort ascending on body_weight_kg as the final tiebreaker after weight category."

---

## Claude's Discretion

- TypeScript interface shapes (TimeBlock, Conflict, ScheduleResult, SchedulerInput)
- Internal helper organization within scheduler.ts
- Test fixture design and edge case coverage strategy
- Whether to export sort comparator separately
- RegistrationEntryWithRegistrant composite type definition

## Deferred Ideas

None — discussion stayed within phase scope
