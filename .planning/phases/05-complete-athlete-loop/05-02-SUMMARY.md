---
phase: 05-complete-athlete-loop
plan: 02
subsystem: ui
tags: [youtube, oauth, clerk, resumable-upload, react, typescript]

# Dependency graph
requires:
  - phase: 05-01
    provides: createEntry server action, buildYouTubeDescription utility, DB schema with youtubeUrl/youtubeId/serial/status columns

provides:
  - getYouTubeToken server action (retrieves Google OAuth token from Clerk)
  - YouTubeUploader client component with resumable upload, progress bar, error handling, retry, google_not_connected state
  - Playback page updated with Upload to YouTube button and Upload Manually fallback
  - Instructions page uses shared buildYouTubeDescription utility

affects: [05-03, 05-04, judge-interface]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Resumable YouTube upload using XMLHttpRequest for progress tracking via xhr.upload.onprogress"
    - "Clerk OAuth token retrieval via getUserOauthAccessToken(userId, 'oauth_google')"
    - "Two-phase upload: initiate resumable session (POST → Location header), then PUT blob with XHR"

key-files:
  created:
    - lib/actions/youtube.ts
    - components/record/YouTubeUploader.tsx
  modified:
    - app/record/playback/page.tsx
    - app/record/instructions/page.tsx

key-decisions:
  - "XHR used for blob upload (not fetch) to enable xhr.upload.onprogress for real progress tracking"
  - "google_not_connected state shows connect link + skip-to-manual-upload option, not a hard error"
  - "discipline converted from hyphenated (long-cycle) to underscored (long_cycle) in playback page before passing to YouTubeUploader and createEntry"
  - "Upload and export buttons both always visible — athletes may want to download AND upload"

patterns-established:
  - "Server action retrieves OAuth token, client component drives upload directly to third-party API — no server proxying needed"
  - "showUploader state gate prevents uploader from mounting until user explicitly requests it"

requirements-completed: [LOOP-01, LOOP-02, LOOP-03]

# Metrics
duration: 2min
completed: 2026-03-26
---

# Phase 05 Plan 02: YouTube Auto-Upload Summary

**Browser-native resumable YouTube upload with progress bar — athlete taps one button, video uploads directly from browser to their YouTube channel with discipline/weight/serial metadata, then createEntry saves the DB record**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-26T04:37:04Z
- **Completed:** 2026-03-26T04:39:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- getYouTubeToken server action retrieves Google OAuth token from Clerk with proper not-connected handling
- YouTubeUploader component drives two-phase resumable upload: POST to initiate session, XHR PUT with onprogress for real tracking
- Playback page now offers Upload to YouTube (auto) and Upload Manually (manual fallback) as distinct CTAs
- Instructions page uses shared buildYouTubeDescription, eliminating the inline template duplication

## Task Commits

Each task was committed atomically:

1. **Task 1: Create YouTube token server action and uploader component** - `a344df8` (feat)
2. **Task 2: Integrate uploader into playback page and update instructions page** - `8faacbd` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `lib/actions/youtube.ts` - getYouTubeToken server action using Clerk getUserOauthAccessToken
- `components/record/YouTubeUploader.tsx` - Full upload component: idle/authenticating/uploading/saving/complete/error/google_not_connected states
- `app/record/playback/page.tsx` - Added Upload to YouTube + Upload Manually buttons, YouTubeUploader integration, post-upload Done links
- `app/record/instructions/page.tsx` - Replaced inline description template with buildYouTubeDescription import

## Decisions Made
- XHR used for upload (not fetch) — fetch has no progress event, XHR xhr.upload.onprogress is the only native browser API for upload progress
- google_not_connected shows a connect link to /user-profile plus a skip option — not an error, just a setup prompt
- discipline format converted from 'long-cycle' (RecordContext) to 'long_cycle' (DB/createEntry) at the playback page level

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**External services require manual configuration before the YouTube upload flow works in production:**

1. **Clerk Dashboard** — Enable Google social connection:
   - Clerk Dashboard -> User & Authentication -> Social Connections -> Google -> Enable
   - Add scope: `https://www.googleapis.com/auth/youtube.upload`

2. **Google Cloud Console** — Enable YouTube Data API v3:
   - APIs & Services -> Library -> YouTube Data API v3 -> Enable

Without these steps, getYouTubeToken will return `google_not_connected` and the upload button will show the connect prompt.

## Next Phase Readiness
- YouTube upload complete; next plan (05-03) can build the athlete submission/entry confirmation flow
- DB record is saved with status='pending' after upload — ready for judge assignment

---
*Phase: 05-complete-athlete-loop*
*Completed: 2026-03-26*
