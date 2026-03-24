---
phase: 02-athlete-video-recorder
plan: 02
subsystem: ui
tags: [react, next.js, canvas, mediarecorder, audicontext, wakelock, recording]

# Dependency graph
requires:
  - phase: 02-01
    provides: RecordContext shared state (serial, discipline, weight, blob, MIME type), /record layout with auth guard and athleteName injection, webm-fix-duration installed

provides:
  - Full recording screen at /record/recording with setup modal + countdown + canvas recorder
  - Canvas-based authenticated overlay compositing: timer, athlete name, discipline, weight, KOVA branding, serial
  - MediaRecorder pipeline from canvas.captureStream(30) → webmFixDuration post-processing → RecordContext blob
  - Screen Wake Lock (acquired on record start, released on stop, re-acquired on visibility restore)
  - AudioContext beep at each minute mark when enabled
  - Auto-stop at 10:10 when enabled

affects:
  - 02-03 (playback/export page reads recordedBlob and mimeType from RecordContext)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single persistent canvas DOM node pattern: canvas stays mounted across all page states (setup/countdown/recording) with CSS visibility toggle — required so captureStream() captures the same DOM element throughout recording
    - rAF timer using timestamp delta accumulation: timerMsRef += ts - lastTimestamp avoids drift from setInterval; stale closure avoided by reading from ref not state
    - MediaRecorder start-at-countdown-3 pattern: recorder.start() called when countdown reaches 3 seconds to eliminate dead footage at start of recording

key-files:
  created:
    - app/record/recording/page.tsx
  modified: []

key-decisions:
  - "webmFixDuration (not fixWebmDuration) is the correct export name from webm-fix-duration package — plan spec had wrong name, auto-fixed"
  - "Canvas element stays mounted throughout all page states via CSS hidden class — prevents captureStream losing the DOM node on state transition"
  - "MediaRecorder.start() called at countdown=3 rather than countdown=0 — recording begins before user-visible countdown ends, eliminating dead footage"
  - "navigator.wakeLock typed as (navigator as any).wakeLock — WakeLockSentinel is in browser DOM types but wakeLock property on Navigator requires lib=DOM.Iterable; cast avoids needing tsconfig change"

patterns-established:
  - "Always-mounted recording elements: canvas and video elements rendered outside conditional blocks so refs persist across page state transitions"

requirements-completed: [REC-03, REC-04, REC-06, REC-07, REC-08, REC-09, REC-10]

# Metrics
duration: 4min
completed: 2026-03-24
---

# Phase 2 Plan 02: Recording Screen Summary

**Canvas-based authenticated recording pipeline with setup modal (camera enumeration, weight/countdown/toggles), countdown, rAF overlay compositing (timer/name/discipline/weight/KOVA/serial), MediaRecorder from captureStream(30), webmFixDuration post-processing, Wake Lock, and AudioContext minute-marker beeps**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-24T11:48:26Z
- **Completed:** 2026-03-24T11:52:26Z
- **Tasks:** 4
- **Files modified:** 1

## Accomplishments
- Created app/record/recording/page.tsx (532 lines) — the complete recording screen in a single client component
- Canvas rAF loop composites camera video frame + 6 overlay elements (timer, name, discipline, weight, KOVA, serial) at 30fps baked into the video stream
- MediaRecorder starts at countdown=3 (not 0) to avoid dead footage; blob post-processed by webmFixDuration before storing in RecordContext
- Screen Wake Lock acquired when recording starts, released on stop, and re-acquired on page visibility restore during recording
- npm build passes with /record/recording appearing as a dynamic server-rendered route

## Task Commits

1. **Prerequisite: bring forward plan 01 artifacts** - `27de0a7` (chore) — lib/record-context.tsx, app/record/layout.tsx, app/record/page.tsx, package.json
2. **Tasks 1-3: recording screen implementation** - `8ac39fa` (feat) — app/record/recording/page.tsx

**Plan metadata:** see final commit

## Files Created/Modified
- `app/record/recording/page.tsx` - Complete recording screen: setup modal with camera enumeration, countdown display, canvas rAF loop with overlay compositing, MediaRecorder pipeline, Wake Lock, AudioContext beep, auto-stop

## Decisions Made
- Canvas element kept always-mounted via CSS `hidden` class toggle rather than conditional rendering — ensures `captureStream()` references the same DOM node throughout setup→countdown→recording state transitions
- `MediaRecorder.start()` called at countdown=3 to begin recording before countdown ends — eliminates dead footage at the start of each recording
- `(navigator as any).wakeLock` cast used to avoid TypeScript Navigator type extension — minimal impact, avoids tsconfig changes
- webmFixDuration is the actual export name from the webm-fix-duration package (plan spec named it `fixWebmDuration`) — auto-corrected

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Corrected webm-fix-duration export name**
- **Found during:** Task 2 (MediaRecorder blob post-processing)
- **Issue:** Plan spec referenced `fixWebmDuration` but the actual export from webm-fix-duration package is `webmFixDuration`
- **Fix:** Used `webmFixDuration` — verified against package type definitions at `node_modules/webm-fix-duration/lib/index.d.ts`
- **Files modified:** app/record/recording/page.tsx
- **Verification:** TypeScript passes with no errors — `fixWebmDuration` would have been a compile error
- **Committed in:** 8ac39fa (Task 1-3 commit)

---

**Total deviations:** 1 auto-fixed (1 bug — wrong function name)
**Impact on plan:** Essential correction — using the wrong export name would have caused a runtime crash when recording stops.

## Issues Encountered
- Worktree was behind main — plan 01 artifacts (record-context, layout, page, package.json with webm-fix-duration) had been merged to main but not present in this worktree. Copied files from main repo and ran npm install before starting plan 02 work.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- `app/record/recording/page.tsx` navigates to `/record/playback` (via `router.push`) after recording stops, but `/record/playback` does not exist yet — will be built in plan 02-03. The navigation is intentional and functional; the destination route is the stub.

## Next Phase Readiness
- Recording pipeline is complete and the blob is stored in RecordContext after stop
- mimeType is stored alongside blob (video/webm;codecs=vp9, video/webm, or video/mp4 depending on browser)
- Plan 02-03 (playback/export screen) can immediately read `recordedBlob` and `mimeType` from context
- No blockers

## Self-Check: PASSED

- app/record/recording/page.tsx: FOUND
- 02-02-SUMMARY.md: FOUND
- Commit 27de0a7 (chore: plan 01 artifacts): FOUND
- Commit 8ac39fa (feat: recording screen): FOUND
- grep captureStream: FOUND
- grep MediaRecorder: FOUND
- grep wakeLock: FOUND
- grep AudioContext: FOUND
- npm run build: PASSED

---
*Phase: 02-athlete-video-recorder*
*Completed: 2026-03-24*
