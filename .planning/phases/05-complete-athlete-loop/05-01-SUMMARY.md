---
phase: 05-complete-athlete-loop
plan: 01
subsystem: database
tags: [drizzle, turso, sqlite, server-actions, clerk, schema-migration]

# Dependency graph
requires: []
provides:
  - Extended scores table with youtube_id, status, athlete_id, rep_taps columns
  - createEntry server action (athlete submits YouTube link after upload)
  - lookupEntryBySerial server action (judge lookup by serial)
  - getAthleteEntries server action (profile page athlete history)
  - getEntryById server action (entry detail with ownership check)
  - submitScore updated to UPDATE existing entry by serial (or INSERT fallback)
  - buildYouTubeDescription shared utility for description template
affects: [05-02, 05-03, 05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Server actions in lib/actions/ with 'use server' directive"
    - "submitScore: UPDATE-first pattern — look up by serial, update if found, insert as fallback"
    - "Discipline format: recorder uses long-cycle (hyphenated), DB uses long_cycle (underscored)"

key-files:
  created:
    - lib/actions/entries.ts
    - lib/youtube-description.ts
    - drizzle/0001_phase5_columns.sql
  modified:
    - lib/schema.ts
    - lib/actions/scores.ts
    - app/judge/session/page.tsx

key-decisions:
  - "reps column stays NOT NULL — pending entries use reps: 0 to avoid ALTER TABLE constraint complexity"
  - "submitScore uses UPDATE-first pattern: updates existing entry by serial, inserts only as backward-compat fallback"
  - "lookupEntryBySerial normalizes serial (strip whitespace, uppercase) before querying"
  - "repTaps stored as JSON string in TEXT column — avoids separate table for v1"

patterns-established:
  - "Server actions: always validate auth() first, return { id } on success or { error: string } on failure"
  - "Shared utilities in lib/ (not components/) for logic reused across server and client"

requirements-completed: [LOOP-08]

# Metrics
duration: 3min
completed: 2026-03-26
---

# Phase 05 Plan 01: DB Schema Extension and Core Server Actions Summary

**Drizzle scores table extended with youtube_id/status/athlete_id/rep_taps columns, four entry server actions created, submitScore updated to UPDATE-first pattern, YouTube description extracted as shared utility**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-26T04:32:57Z
- **Completed:** 2026-03-26T04:35:57Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Extended scores table schema with 4 new columns (youtubeId, status, athleteId, repTaps) and applied ALTER TABLE migration to Turso via drizzle-kit push
- Created lib/actions/entries.ts with createEntry, lookupEntryBySerial, getAthleteEntries, getEntryById server actions
- Updated submitScore to UPDATE-first (find by serial, update with reps/repTaps/status='judged') with INSERT fallback for backward compatibility
- Extracted YouTube description template into lib/youtube-description.ts shared utility

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend DB schema and create migration** - `92f0f84` (feat)
2. **Task 2: Create entry server actions and update submitScore** - `bfbb27b` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `lib/schema.ts` - Added youtubeId, status, athleteId, repTaps columns to scores table
- `drizzle/0001_phase5_columns.sql` - 4 ALTER TABLE statements for new columns
- `lib/actions/entries.ts` - Four new server actions: createEntry, lookupEntryBySerial, getAthleteEntries, getEntryById
- `lib/actions/scores.ts` - submitScore now does UPDATE for existing entry or INSERT fallback; repTaps added; youtubeUrl removed
- `lib/youtube-description.ts` - Shared buildYouTubeDescription utility with exact template from instructions page
- `app/judge/session/page.tsx` - Updated handleSubmit caller to pass repTaps instead of youtubeUrl

## Decisions Made

- reps column stays NOT NULL — pending entries use `reps: 0` to avoid SQLite ALTER TABLE constraint complexity
- submitScore uses UPDATE-first: look up existing entry by serial, update if found, insert as backward-compat fallback for judge scoring without prior athlete upload
- lookupEntryBySerial normalizes serial (strip whitespace, uppercase) before querying
- repTaps stored as JSON string in TEXT column — avoids separate junction table for v1

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed judge session page caller after submitScore signature change**
- **Found during:** Task 2 (Create entry server actions and update submitScore)
- **Issue:** app/judge/session/page.tsx still passed `youtubeUrl` to submitScore (which was removed) and did not pass `repTaps` (which was added) — TypeScript error TS2353
- **Fix:** Updated handleSubmit to pass `repTaps: JSON.stringify(reps)` instead of `youtubeUrl`
- **Files modified:** app/judge/session/page.tsx
- **Verification:** `npx tsc --noEmit` passes with zero errors
- **Committed in:** bfbb27b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Required fix — the caller would have produced a TypeScript compile error and runtime failure. No scope creep.

## Issues Encountered

- drizzle-kit push requires TURSO_DATABASE_URL from .env.local — sourced via `set -a && source .env.local && set +a` before running. Migration applied successfully.

## Known Stubs

None — all server actions query the live Turso database. No hardcoded empty values flow to UI in this plan (UI pages are built in subsequent plans).

## Next Phase Readiness

- Schema foundation is complete — all subsequent phase 05 plans can import from lib/actions/entries.ts
- Discipline format mismatch documented: recorder uses `long-cycle` (hyphenated), DB expects `long_cycle` (underscored) — upload page (05-02) must convert before calling createEntry
- TypeScript compiles cleanly, Turso migration applied

---
*Phase: 05-complete-athlete-loop*
*Completed: 2026-03-26*
