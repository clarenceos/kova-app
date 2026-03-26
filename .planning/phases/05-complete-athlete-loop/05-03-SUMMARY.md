---
phase: 05-complete-athlete-loop
plan: 03
subsystem: judge-interface
tags: [judge, serial-lookup, server-actions, typescript]

# Dependency graph
requires: [05-01]
provides:
  - Serial-only judge setup form (replaces manual multi-field form)
  - JudgeSession.entryId field for DB linkage
  - lookupEntryBySerial integrated into judge flow
affects: [05-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Judge setup: single serial input → server action lookup → session hydration from DB"
    - "Error discrimination: not_found vs no_video with distinct user messages"

key-files:
  created: []
  modified:
    - lib/judge-context.tsx
    - components/judge/JudgeSetupForm.tsx

key-decisions:
  - "Task 2 (repTaps session submission) was already completed by Plan 01 deviation fix — no duplicate work needed"
  - "JudgeSetupForm uses async handleSubmit (not sync) to await server action result"
  - "entryId added to JudgeSession for future DB linkage (e.g., marking entry as judged)"

patterns-established:
  - "Serial-only judge entry: zero manual data entry, all fields hydrated from DB via lookupEntryBySerial"
  - "Async form submit pattern: loading state + finally block to always clear loading"

requirements-completed: [LOOP-06, LOOP-07]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 05 Plan 03: Judge Flow — Serial Lookup and rep_taps Submission Summary

**Serial-only judge setup form replaces multi-field manual entry; judges enter only a serial number and all session data is auto-populated from DB via lookupEntryBySerial server action**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T04:38:29Z
- **Completed:** 2026-03-26T04:40:05Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Rewrote `JudgeSetupForm` from a 5-field manual form (YouTube URL, athlete name, discipline, weight, serial) to a single serial number input field
- Added `entryId: string` to `JudgeSession` type — carried through context for future DB linkage
- Integrated `lookupEntryBySerial` server action: handles `not_found` and `no_video` error discriminants with distinct user-facing messages
- Task 2 (repTaps JSON submission in session page) was already completed by Plan 01's deviation fix — verified and confirmed no additional changes needed

## Task Commits

Each task was committed atomically:

1. **Task 1: Add entryId to JudgeSession and rewrite setup form to serial-only lookup** - `b824a40` (feat)
2. **Task 2: Update judge session to submit rep_taps JSON with score** - Already done in Plan 01 (commit `bfbb27b`) — no new commit needed

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `lib/judge-context.tsx` - Added `entryId: string` to JudgeSession type
- `components/judge/JudgeSetupForm.tsx` - Rewritten from 5-field form to single serial input with DB lookup via lookupEntryBySerial

## Decisions Made

- Task 2 (repTaps session submission) was already completed by Plan 01's deviation fix — the auto-fix in 05-01 updated app/judge/session/page.tsx to pass `repTaps: JSON.stringify(reps)` instead of `youtubeUrl`, which exactly matches Plan 03 Task 2 acceptance criteria
- `entryId` added to JudgeSession type for future use (e.g., linking score submission back to original entry row)
- `handleSubmit` is async to await the `lookupEntryBySerial` server action, using a `finally` block to always clear the loading state

## Deviations from Plan

### Plan 01 Pre-completed Task 2

**Task 2 acceptance criteria were already satisfied by Plan 01's deviation fix:**
- Plan 01 fixed `app/judge/session/page.tsx` to pass `repTaps: JSON.stringify(reps)` (Rule 1 - Bug fix for TypeScript error TS2353)
- This matches exactly what Plan 03 Task 2 specifies
- No duplicate implementation needed; verified with grep and TypeScript compile check

No additional deviations. Plan executed as written for Task 1.

## Known Stubs

None — form submits to live server action that queries Turso DB. No hardcoded mock data.

## Self-Check: PASSED

- `lib/judge-context.tsx` modified: FOUND (entryId in JudgeSession)
- `components/judge/JudgeSetupForm.tsx` modified: FOUND (serial-only form with lookupEntryBySerial)
- Task 1 commit `b824a40`: FOUND
- Task 2 work (commit `bfbb27b` from Plan 01): FOUND
- TypeScript: compiles without errors
