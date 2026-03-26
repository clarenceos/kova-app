---
phase: quick
plan: 260326-umx
subsystem: recording-playback
tags: [audio, ux, beep, discard, upload, playback]
dependency_graph:
  requires: []
  provides: [resume-then-play-beep, discard-flow, conditional-upload-manually, webm-only-save]
  affects: [app/record/recording/page.tsx, app/record/playback/page.tsx, components/record/YouTubeUploader.tsx]
tech_stack:
  added: []
  patterns: [resume-then-play AudioContext pattern, onUploadError callback prop]
key_files:
  created: []
  modified:
    - app/record/recording/page.tsx
    - app/record/playback/page.tsx
    - components/record/YouTubeUploader.tsx
decisions:
  - "playBeep/playStartTone use ctx.resume().then(doPlay) instead of early-exit on suspended state — handles iOS AudioContext suspension silently"
  - "Upload Manually surfaces only on upload failure, not as initial option — reduces cognitive load and removes false impression that manual upload is equivalent"
  - "Save video file gated on mimeType.includes('webm') — iOS records MP4 and YouTube has it; no point offering a download athletes can't use"
  - "Discard clears recordedBlob via setRecordedBlob(null) then navigates — clean context reset avoids stale blob guard redirect loop"
metrics:
  duration: 8m
  completed: 2026-03-26
  tasks: 3
  files: 3
---

# Quick Task 260326-umx: Fix beep resume-then-play, add discard, clean up playback buttons

**One-liner:** Resume-then-play AudioContext beep pattern replaces silent-drop guard; discard flow with red confirmation dialog; Upload Manually and Save video file now appear only in contextually correct states.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix beep resume-then-play pattern and default beep to ON | 462a7c2 | app/record/recording/page.tsx |
| 2 | Add discard button with AlertDialog on playback page | 76b3a9c | app/record/playback/page.tsx |
| 3 | Clean up playback buttons and add onUploadError prop to YouTubeUploader | 3ccb73b | app/record/playback/page.tsx, components/record/YouTubeUploader.tsx |

## Changes Made

### Task 1 — Recording page

- `playBeep`: removed `ctx.state !== 'running'` early-exit guard. Now calls `ctx.resume().then(doPlay)` when suspended, falls through to `doPlay()` directly when already running.
- `playStartTone`: same pattern applied (1320Hz start tone).
- `beep` useState default changed from `false` to `true` — beep toggle now on by default.

### Task 2 — Playback page: Discard flow

- Added `setRecordedBlob` to `useRecord()` destructure.
- Added `showDiscardDialog` state.
- Replaced "Upload Manually" button (in initial pre-upload state) with "Discard recording" button (red styling, destructive intent).
- Added discard `AlertDialog`: warns recording will be permanently deleted, confirm action calls `setRecordedBlob(null)` then `router.push('/record')`.

### Task 3 — Playback page + YouTubeUploader: button cleanup

- `YouTubeUploader`: added `onUploadError?: () => void` prop; calls `onUploadError?.()` after each `setStatus('error')` (6 error paths, excluding the `google_not_connected` path which is not a real error).
- Playback page: added `uploadFailed` state; passes `onUploadError={() => setUploadFailed(true)}` to uploader.
- "Upload Manually" button now renders only in `{uploadFailed && !uploadComplete}` block — not shown initially.
- "Save video file" button wrapped in `{mimeType.includes('webm') && ...}` — hidden on iOS MP4 recordings.

## Deviations from Plan

None - plan executed exactly as written.

## Build Verification

TypeScript compiles cleanly (`npx tsc --noEmit` — no output = no errors). The `npx next build` command fails with a pre-existing DB connection error during static page collection (`generateSerial()` attempts a DB query at build time without env vars set). This error exists on the prior commit (76b3a9c, before Task 3) and is unrelated to this quick task's changes.

## Self-Check: PASSED

Files exist:
- app/record/recording/page.tsx — modified
- app/record/playback/page.tsx — modified
- components/record/YouTubeUploader.tsx — modified

Commits exist:
- 462a7c2 fix(260326-umx): resume-then-play beep pattern, default beep ON
- 76b3a9c feat(260326-umx): add discard recording button and confirmation dialog on playback
- 3ccb73b feat(260326-umx): conditional Upload Manually, onUploadError prop, webm-only Save button
