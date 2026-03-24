---
phase: 02-athlete-video-recorder
plan: 03
subsystem: ui
tags: [react, next.js, blob-url, clipboard-api, mediarecorder, pwa]

# Dependency graph
requires:
  - phase: 02-athlete-video-recorder
    plan: 01
    provides: RecordContext with recordedBlob, serial, discipline, mimeType, athleteName, weightKg
provides:
  - /record/playback page with video preview, serial display, export download, and navigation to instructions
  - /record/instructions page with YouTube upload guide, pre-filled description, copy-to-clipboard, Done to /dashboard
affects:
  - 02-02 (recording page navigates to /record/playback after stop)
  - Completes the athlete recording flow end-to-end

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Blob URL lifecycle pattern: URL.createObjectURL in useEffect with URL.revokeObjectURL cleanup on unmount
    - Direct-navigation guard: check recordedBlob (not serial) — serial is always set via crypto.randomUUID at provider init
    - Dynamic filename from MIME type: mimeType.includes('mp4') ? 'mp4' : 'webm' for cross-browser compatibility

key-files:
  created:
    - app/record/playback/page.tsx
    - app/record/instructions/page.tsx
  modified: []

key-decisions:
  - "Navigation guard in instructions screen uses recordedBlob (not serial) — serial is always a UUID string, never falsy"
  - "Export filename extension determined dynamically from mimeType to handle Safari MP4 vs Chrome WebM"

patterns-established:
  - "Blob URL created in useEffect, stored in state, revoked on unmount — prevents memory leaks"
  - "Copy-to-clipboard with 2-second reset timeout for UX feedback without persistent state"

requirements-completed: [REC-11]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 2 Plan 03: Playback and YouTube Instructions Summary

**Playback screen with blob URL video preview and dynamic-extension export, plus YouTube upload instructions with pre-filled description and copy-to-clipboard — completes the athlete recording flow**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T11:48:19Z
- **Completed:** 2026-03-24T11:50:12Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Built /record/playback with video element, serial display, Render and Export button (kova-[discipline]-[name]-[serial].[ext] filename), and Next: Upload to YouTube navigation
- Built /record/instructions with 6-step YouTube upload guide, pre-filled description textarea (athlete, discipline, weight, date, serial, Competition: TBD, KOVA tagline), copy-to-clipboard with 2s feedback, Done link to /dashboard
- npm run build passes clean with all routes in output

## Task Commits

Each task was committed atomically:

1. **Task 1: Build playback screen** - `9b79185` (feat)
2. **Task 2: Build YouTube instructions screen** - `9cd2bb8` (feat)
3. **Task 2 (auto-fix): Fix direct-nav guard to use recordedBlob** - `81d0da9` (fix)
4. **Task 3: Verify build passes** - verified, no new files committed

**Plan metadata:** see final commit

## Files Created/Modified
- `app/record/playback/page.tsx` - Video review screen: blob URL lifecycle, export download with dynamic extension, next-step navigation
- `app/record/instructions/page.tsx` - YouTube upload guide: 6-step list, pre-filled description, clipboard copy, Done link

## Decisions Made
- Export extension determined from `mimeType.includes('mp4')` — produces correct `.mp4` on iOS Safari and `.webm` on Chrome/Firefox
- Direct-navigation guard uses `recordedBlob` instead of `serial` — serial is always a non-empty UUID string (crypto.randomUUID), so it can never be the guard condition

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed navigation guard: !serial never triggers**
- **Found during:** Task 2 review after writing instructions page
- **Issue:** Plan spec said "if serial is not set, redirect to /record". serial is initialized with `crypto.randomUUID()` in RecordProvider — it is never null or empty. The redirect would never fire on direct navigation.
- **Fix:** Changed guard to check `!recordedBlob` instead. recordedBlob is null until a recording completes — correctly identifies direct navigation.
- **Files modified:** app/record/instructions/page.tsx
- **Verification:** TypeScript passes, acceptance criteria all still met
- **Committed in:** 81d0da9

---

**Total deviations:** 1 auto-fixed (1 bug — incorrect guard condition)
**Impact on plan:** Essential correctness fix. Without it, /record/instructions would be accessible via direct URL navigation with no recorded video, displaying an empty description with no blob to export from playback.

## Issues Encountered
- Worktree was behind main branch at start — merged main to get 02-01 work (record-context.tsx, layout.tsx, page.tsx). Fast-forward merge, no conflicts.
- app/record/recording/page.tsx not yet present (plan 02-02 not yet executed) — build passes without it; route simply absent from output. Not a blocker.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `app/record/instructions/page.tsx` and `app/record/playback/page.tsx` depend on `recordedBlob` being set by the recording page (plan 02-02). Until 02-02 is executed, direct navigation to these routes redirects back to /record. This is intentional — the stub resolves when plan 02-02 is complete.

## Next Phase Readiness
- Playback and instructions screens are complete and ready
- Plan 02-02 (recording page: camera, canvas overlay, MediaRecorder) is the missing piece
- Once 02-02 delivers recordedBlob via setRecordedBlob, the full athlete flow is end-to-end functional

## Self-Check: PASSED

- app/record/playback/page.tsx: FOUND
- app/record/instructions/page.tsx: FOUND
- Commit 9b79185 (feat: playback screen): FOUND
- Commit 9cd2bb8 (feat: instructions screen): FOUND
- Commit 81d0da9 (fix: recordedBlob guard): FOUND
- npm run build: PASSED (verified above)

---
*Phase: 02-athlete-video-recorder*
*Completed: 2026-03-24*
