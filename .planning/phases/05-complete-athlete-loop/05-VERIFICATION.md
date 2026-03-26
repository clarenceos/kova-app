---
phase: 05-complete-athlete-loop
verified: 2026-03-26T00:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 05: Complete Athlete Loop — Verification Report

**Phase Goal:** Close the athlete→judge→result loop so an athlete can record, upload, get judged, and view scored results — all within Kova.
**Verified:** 2026-03-26
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | scores table has youtube_id, status, athlete_id, rep_taps columns | VERIFIED | `lib/schema.ts` lines 11-14: all 4 columns present; `drizzle/0001_phase5_columns.sql` has 4 ALTER TABLE statements |
| 2 | Athlete can create a pending entry via createEntry server action | VERIFIED | `lib/actions/entries.ts:9-52`: inserts with `status: 'pending'`, `athleteId: userId`, `reps: 0` |
| 3 | Judge can look up an entry by serial via lookupEntryBySerial server action | VERIFIED | `lib/actions/entries.ts:54-91`: normalizes serial, queries DB, returns entry or typed errors |
| 4 | submitScore updates an existing entry instead of inserting a new row | VERIFIED | `lib/actions/scores.ts:36-50`: `db.update(scores).set({reps, repTaps, status:'judged'})` on found serial |
| 5 | YouTube description template is shared between clipboard copy and upload metadata | VERIFIED | Both `app/record/playback/page.tsx:48` and `app/record/instructions/page.tsx:22` call `buildYouTubeDescription()` |
| 6 | After recording, athlete taps one button and video uploads to their YouTube channel with progress indicator | VERIFIED | `components/record/YouTubeUploader.tsx`: resumable upload via XHR with `xhr.upload.onprogress`, progress state 0-100 |
| 7 | Upload metadata (title, description, tags, category, privacy) is set automatically from session data | VERIFIED | `YouTubeUploader.tsx:80-92`: title/description/tags/categoryId:17/privacyStatus:unlisted all set from props |
| 8 | On upload complete, youtube_url and youtube_id are stored in DB with status pending | VERIFIED | `YouTubeUploader.tsx:162-169`: calls `createEntry({youtubeUrl, youtubeId})` after successful XHR upload |
| 9 | If Google account not connected, athlete sees a clear prompt to connect | VERIFIED | `YouTubeUploader.tsx:247-267`: renders "google_not_connected" state with "Connect Google Account" link and manual upload skip |
| 10 | Judge setup form has serial input only — no YouTube URL, athlete name, discipline, or weight inputs | VERIFIED | `components/judge/JudgeSetupForm.tsx`: single `serial` state variable; no youtubeUrl/athleteName/discipline/weightKg useState; only one input field rendered |
| 11 | Entering a serial auto-fetches entry data from DB including youtube_url | VERIFIED | `JudgeSetupForm.tsx:34`: calls `lookupEntryBySerial(serial.trim())`, populates full session from returned entry |
| 12 | If entry has no youtube_url, judge sees 'Video not yet uploaded by athlete' error | VERIFIED | `JudgeSetupForm.tsx:39-40`: `result.error === 'no_video'` → `setFormError('Video not yet uploaded by athlete')` |
| 13 | If no entry found for serial, judge sees 'No submission found for this serial' error | VERIFIED | `JudgeSetupForm.tsx:37-38`: `result.error === 'not_found'` → `setFormError('No submission found for this serial')` |
| 14 | Judge session submits rep_taps JSON along with rep count | VERIFIED | `app/judge/session/page.tsx:115`: `repTaps: JSON.stringify(reps)` in submitScore call |
| 15 | PROFILE tab in BottomNav is unlocked and navigates to /profile | VERIFIED | `components/ui/BottomNav.tsx:13`: `{ id: 'profile', label: 'PROFILE', icon: User, href: '/profile', locked: false }` |
| 16 | Profile page shows athlete submissions with serial, discipline, weight, status badge, rep count | VERIFIED | `app/(app)/profile/page.tsx`: calls `getAthleteEntries()`, renders `<EntryCard>` for each; EntryCard shows all required fields |
| 17 | Tapping a submission card navigates to entry detail at /profile/[id] | VERIFIED | `components/profile/EntryCard.tsx:25-27`: wrapped in `<Link href={\`/profile/${entry.id}\`}>` |
| 18 | Entry detail shows YouTube embed with ghost replay — judge rep taps animate as Check/X icons over video | VERIFIED | `app/(app)/profile/[id]/page.tsx:84`: renders `<GhostReplay videoId={entry.youtubeId} repTaps={repTaps} />`; GhostReplay renders Check/X icons on rAF polling loop |
| 19 | Ghost replay handles seek (forward and backward) correctly | VERIFIED | `components/profile/GhostReplay.tsx:35-51`: seek backward detected by comparing currentTime to last processed tap's time; resets `lastProcessedIndexRef` to correct position |

**Score:** 19/19 truths verified (all 8 requirement IDs covered)

---

### Required Artifacts

| Artifact | Plan | Status | Details |
|----------|------|--------|---------|
| `lib/schema.ts` | 05-01 | VERIFIED | 4 new columns present; reps still `notNull()` |
| `drizzle/0001_phase5_columns.sql` | 05-01 | VERIFIED | 4 ALTER TABLE statements |
| `lib/actions/entries.ts` | 05-01 | VERIFIED | `'use server'`; exports createEntry, lookupEntryBySerial, getAthleteEntries, getEntryById |
| `lib/actions/scores.ts` | 05-01 | VERIFIED | submitScore accepts repTaps, no youtubeUrl; updates existing entry by serial |
| `lib/youtube-description.ts` | 05-01 | VERIFIED | Exports `buildYouTubeDescription`; includes "Recorded with KOVA" |
| `lib/actions/youtube.ts` | 05-02 | VERIFIED | `'use server'`; exports `getYouTubeToken`; uses `getUserOauthAccessToken(userId, 'oauth_google')` |
| `components/record/YouTubeUploader.tsx` | 05-02 | VERIFIED | `'use client'`; resumable upload; XHR with progress; calls getYouTubeToken + createEntry |
| `app/record/playback/page.tsx` | 05-02 | VERIFIED | Imports YouTubeUploader + buildYouTubeDescription; renders uploader conditionally; discipline converted via `replace('-', '_')` |
| `app/record/instructions/page.tsx` | 05-02 | VERIFIED | Imports + uses `buildYouTubeDescription`; no inline template |
| `components/judge/JudgeSetupForm.tsx` | 05-03 | VERIFIED | Serial-only form; imports lookupEntryBySerial; sets entryId in session |
| `app/judge/session/page.tsx` | 05-03 | VERIFIED | `repTaps: JSON.stringify(reps)` in submitScore; no youtubeUrl param |
| `lib/judge-context.tsx` | 05-03 | VERIFIED | JudgeSession type has `entryId: string` |
| `components/ui/BottomNav.tsx` | 05-04 | VERIFIED | profile tab: `href: '/profile'`, `locked: false` |
| `app/(app)/profile/page.tsx` | 05-04 | VERIFIED | Server component; `export const dynamic = 'force-dynamic'`; calls getAthleteEntries; renders EntryCard list + empty state |
| `components/profile/EntryCard.tsx` | 05-04 | VERIFIED | `'use client'`; shows serial in font-mono; JUDGED/PENDING badges; links to /profile/${entry.id}; rep count conditional on isJudged && reps > 0 |
| `app/(app)/profile/[id]/page.tsx` | 05-04 | VERIFIED | Server component; calls getEntryById; notFound() when null; renders GhostReplay or "Video not yet uploaded"; rep log + "Awaiting judge review" |
| `components/profile/GhostReplay.tsx` | 05-04 | VERIFIED | `'use client'`; imports YouTubeEmbed + Rep type; rAF polling loop; Check/X icons; seek correction; pointer-events-none on overlay |

---

### Key Link Verification

| From | To | Via | Status | Detail |
|------|----|-----|--------|--------|
| `lib/actions/entries.ts` | `lib/schema.ts` | drizzle query using scores table | WIRED | `scores` referenced 9 times including insert/select/where |
| `lib/actions/scores.ts` | `lib/schema.ts` | `db.update(scores).where(eq(scores.serial,...))` | WIRED | `db.update(scores).set({...}).where(eq(scores.id,...))` on line 39 |
| `components/record/YouTubeUploader.tsx` | `lib/actions/youtube.ts` | getYouTubeToken server action call | WIRED | import line 4; called line 50 |
| `components/record/YouTubeUploader.tsx` | YouTube Data API v3 | fetch with resumable upload protocol | WIRED | `googleapis.com/upload/youtube/v3/videos?uploadType=resumable` line 71 |
| `components/record/YouTubeUploader.tsx` | `lib/actions/entries.ts` | createEntry server action call after upload | WIRED | import line 5; called line 162 |
| `components/judge/JudgeSetupForm.tsx` | `lib/actions/entries.ts` | lookupEntryBySerial server action call | WIRED | import line 6; called line 34 |
| `app/judge/session/page.tsx` | `lib/actions/scores.ts` | submitScore with repTaps parameter | WIRED | `repTaps: JSON.stringify(reps)` line 115 |
| `app/(app)/profile/page.tsx` | `lib/actions/entries.ts` | getAthleteEntries server action | WIRED | import line 4; called line 13 |
| `app/(app)/profile/[id]/page.tsx` | `lib/actions/entries.ts` | getEntryById server action | WIRED | import line 5; called line 32 |
| `components/profile/GhostReplay.tsx` | `components/judge/YouTubeEmbed.tsx` | Reuses YouTubeEmbed for video playback | WIRED | import line 5; rendered line 82 |
| `components/profile/GhostReplay.tsx` | `components/judge/RepCounter.tsx` | Uses Rep type for deserializing rep_taps | WIRED | `import type { Rep }` line 6; repTaps typed as `Rep[]` |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|-------------------|--------|
| `app/(app)/profile/page.tsx` | `entries` | `getAthleteEntries()` → `db.select().from(scores).where(eq(scores.athleteId, userId))` | Yes — DB query filtered by authenticated user | FLOWING |
| `app/(app)/profile/[id]/page.tsx` | `entry` | `getEntryById(id)` → `db.select().from(scores).where(and(eq(scores.id, id), eq(scores.athleteId, userId)))` | Yes — DB query with ownership check | FLOWING |
| `components/profile/GhostReplay.tsx` | `repTaps` | Passed as prop from server component; deserialized from `entry.repTaps` (JSON string from DB) | Yes — real DB data parsed at detail page | FLOWING |
| `components/record/YouTubeUploader.tsx` | `videoId` (response) | XHR PUT to YouTube resumable upload URI; `JSON.parse(xhr.responseText).id` | Yes — live YouTube API response | FLOWING |

---

### Behavioral Spot-Checks

Step 7b skipped: YouTube upload flow requires live Google OAuth tokens and an active YouTube API connection — cannot be tested without external services. Judge flow requires browser DOM and session state. All code paths are fully wired and substantive; deferring behavioral confirmation to human verification below.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| LOOP-01 | 05-02 | Athlete uploads video via YouTube Data API v3 resumable upload with progress bar, using Google OAuth token from Clerk | SATISFIED | YouTubeUploader.tsx: resumable upload + XHR progress + getYouTubeToken |
| LOOP-02 | 05-02 | Upload metadata (title, description, tags, category 17, privacyStatus unlisted) set automatically | SATISFIED | YouTubeUploader.tsx:80-92: all metadata set from props including categoryId:'17', privacyStatus:'unlisted' |
| LOOP-03 | 05-02 | On upload complete, youtube_url and youtube_id stored in DB; status 'pending', athlete_id linked | SATISFIED | YouTubeUploader.tsx calls createEntry; createEntry inserts with status:'pending' and athleteId:userId |
| LOOP-04 | 05-04 | Profile page shows submission history: serial, discipline, weight, date, status badge, rep count | SATISFIED | EntryCard renders all fields; profile page uses getAthleteEntries |
| LOOP-05 | 05-04 | Entry detail with YouTube embed and ghost replay — Check/X icons at each tap's timestamp | SATISFIED | GhostReplay.tsx: rAF polling loop with Check/X icons; /profile/[id]/page.tsx renders it |
| LOOP-06 | 05-03 | Judge setup form: serial lookup auto-fetches entry including youtube_url; URL input removed entirely | SATISFIED | JudgeSetupForm.tsx: serial-only form, lookupEntryBySerial call, no URL/name/discipline/weight inputs |
| LOOP-07 | 05-03 | If entry has no youtube_url, judge sees "Video not yet uploaded by athlete" error | SATISFIED | JudgeSetupForm.tsx:39-40: exact error message matches requirement |
| LOOP-08 | 05-01 | DB schema extended: youtube_id, status, athlete_id, rep_taps columns added | SATISFIED | schema.ts lines 11-14; migration SQL confirmed |

**All 8 LOOP requirements SATISFIED. No orphaned requirements.**

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `lib/actions/entries.ts` | 95, 106 | `return []` / `return null` on unauthenticated user | Info | Defensive guard — not a stub. Functions correctly return empty/null when userId is absent (no session). Not rendered as empty UI. |
| `components/record/YouTubeUploader.tsx` | 285 | `return null` | Info | Defensive guard — unreachable in normal flow (all status values have explicit branches above). Not a stub. |
| `app/record/playback/page.tsx` | 45 | `return null` | Info | Defensive guard — only fires if no recordedBlob (redirected away by useEffect before rendering). |
| `app/judge/session/page.tsx` | 84 | `return null` | Info | Defensive guard — same pattern; redirected by useEffect when no session. |

No blockers. No warnings. All `return null` patterns are defensive guards on already-redirected states, not stub implementations.

---

### Human Verification Required

#### 1. YouTube Upload End-to-End Flow

**Test:** On a device with a Google account connected to Clerk, record a lift, navigate to playback page, tap "Upload to YouTube", observe upload flow.
**Expected:** Progress bar increments from 0-100%, "Upload Complete" card appears with serial and "View on YouTube" link, entry appears in /profile with PENDING status.
**Why human:** Requires live Google OAuth token, YouTube Data API v3 enabled in Google Cloud Console, and actual network upload.

#### 2. Google Not Connected State

**Test:** On a device where no Google account is connected in Clerk, tap "Upload to YouTube" on playback page.
**Expected:** "Google account not connected" card appears with "Connect Google Account" link and "Skip — Upload Manually" fallback.
**Why human:** Requires Clerk OAuth state to be unconnected — cannot simulate programmatically.

#### 3. Judge Serial Lookup End-to-End

**Test:** After an athlete creates an entry (via upload or manually), have a judge navigate to /judge, enter the serial number in the form, tap "Look Up Entry".
**Expected:** Judge immediately proceeds to /judge/session with the YouTube video loaded and athlete metadata shown — no manual URL/name entry needed.
**Why human:** Requires real DB entry with a valid serial and YouTube URL.

#### 4. Ghost Replay Playback

**Test:** Open an entry in /profile/[id] that has been judged (status='judged', repTaps populated). Play the YouTube video.
**Expected:** Check (green) or X (grey) icons flash over the video at the exact timestamps where the judge tapped. Icons animate with ghost-fade (scale + opacity out over 600ms). Seeking backward and playing again shows the same icons in the correct positions.
**Why human:** Requires a judged entry with actual repTaps data; animation quality is a visual judgment; seek handling requires interactive playback.

#### 5. No YouTube Video State

**Test:** Open an entry in /profile/[id] where the athlete created the entry but no video was uploaded (youtubeId is null).
**Expected:** "Video not yet uploaded" message shown instead of GhostReplay embed.
**Why human:** Requires a specific DB state (entry with null youtubeId).

---

### Gaps Summary

No gaps. All 8 LOOP requirements are satisfied. All 17 artifacts exist, are substantive, and are fully wired. All 11 key links are confirmed. Data flows from real DB queries through to UI rendering. No blocker or warning anti-patterns found.

The phase fully closes the athlete→judge→result loop as specified.

---

_Verified: 2026-03-26_
_Verifier: Claude (gsd-verifier)_
