# Roadmap: Kova

## Overview

Kova v1 delivers three interconnected capabilities: an authenticated canvas-based video recorder that bakes proof-of-capture overlays into the video stream, a judge interface where judges paste a YouTube URL and tap-count reps, and a live leaderboard showing all submitted scores by discipline. The build order follows the dependency chain — auth and DB scaffolding first, then the recorder (Kova's core differentiator), then judging, then the leaderboard that surfaces results. Competition management (organizer workflows, entry submission, competition creation) is v2.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - DB schema, DAL scaffolding, Clerk auth flow, athlete onboarding, remove next-pwa
- [x] **Phase 2: Athlete Video Recorder** - Full canvas recording pipeline with authenticated overlays, export, and YouTube instructions (completed 2026-03-24)
- [ ] **Phase 3: Judge Interface** - YouTube embed, tap counter, score submission to DB
- [ ] **Phase 4: Leaderboard** - Live scores filterable by discipline, completing the v1 loop
- [ ] **Phase 5: Complete Athlete Loop** - YouTube auto-upload, athlete profile/submissions, ghost replay, serial-based judge lookup

## Phase Details

### Phase 1: Foundation & Auth
**Goal**: Users can sign in and athletes can complete onboarding, with the DB schema and DAL in place to support all subsequent phases
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03
**Success Criteria** (what must be TRUE):
  1. A new user can sign up and sign in via Clerk (email/password) from the home page
  2. On first login, an athlete is redirected to onboarding and must enter their full name before proceeding (name saved to Clerk publicMetadata.name)
  3. After onboarding, the dashboard shows a mode switcher with "Record a Lift" and "Judge a Lift" options — no role gates
  4. The DB schema (scores table at minimum) exists with Drizzle migrations applied and a working DAL singleton
  5. next-pwa is removed from the project without breaking the build
**Plans**: TBD
**UI hint**: yes

### Phase 2: Athlete Video Recorder
**Goal**: Athletes can record an authenticated 10-minute kettlebell lift with overlays baked into the video, review the recording, export the file, and receive YouTube upload instructions
**Depends on**: Phase 1
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, REC-06, REC-07, REC-08, REC-09, REC-10, REC-11
**Success Criteria** (what must be TRUE):
  1. Athlete selects discipline and configures the lift (weight, countdown, beep toggle, auto-stop toggle, camera selection) before recording begins
  2. The live camera feed shows canvas overlays — timer counting up to 10:00, athlete name, discipline, kettlebell weight, KOVA branding, and UUID serial — on every frame
  3. Recording starts after the countdown completes and produces a downloadable WebM file with correct duration metadata (seekable, not Infinity)
  4. Athlete can review the recorded video before downloading; the exported filename follows the kova-[discipline]-[name]-[serial].[ext] convention
  5. On iOS or any browser without canvas.captureStream support, a clear "unsupported browser" message is shown instead of the recorder UI
  6. The YouTube instructions screen displays a pre-filled description with serial number and a working copy-to-clipboard button
**Plans**: TBD
**UI hint**: yes

### Phase 3: Judge Interface
**Goal**: Judges can watch a submitted lift video and submit a rep count score that is saved to the database
**Depends on**: Phase 2
**Requirements**: JUDGE-01, JUDGE-02, JUDGE-03, JUDGE-04
**Success Criteria** (what must be TRUE):
  1. Judge can start a judging session by pasting a YouTube URL and entering athlete name, discipline, and kettlebell weight
  2. The YouTube video embeds and plays within the judge interface
  3. A large tap target (mobile-optimized) increments the rep count on each tap; tapping undo removes the last rep
  4. Judge can submit the final rep count and the score is saved to the DB with all required metadata (athlete name, discipline, weight, YouTube URL, date)
**Plans**: TBD
**UI hint**: yes

### Phase 4: Leaderboard
**Goal**: Anyone can view all submitted scores on a live leaderboard filterable by discipline, completing the v1 competition loop
**Depends on**: Phase 3
**Requirements**: LB-01, LB-02
**Success Criteria** (what must be TRUE):
  1. A public leaderboard page displays all submitted scores, sortable and filterable by discipline (Long Cycle, Jerk, Snatch)
  2. Each leaderboard entry shows athlete name, rep count, kettlebell weight, discipline, and date submitted
  3. The leaderboard updates when a new score is submitted (no stale cache hiding fresh results)
**Plans**: TBD
**UI hint**: yes

### Phase 5: Complete Athlete Loop
**Goal**: Athletes can upload recordings directly to YouTube from the app, view their submission history with status tracking, see ghost replays of judge scoring, and judges look up entries by serial number alone — closing the full athlete-to-judge loop with zero manual friction
**Depends on**: Phase 3, Phase 4
**Requirements**: LOOP-01, LOOP-02, LOOP-03, LOOP-04, LOOP-05, LOOP-06, LOOP-07, LOOP-08
**Success Criteria** (what must be TRUE):
  1. After recording, athlete taps one button and the video uploads directly to their YouTube channel via YouTube Data API v3 with progress indicator
  2. Upload metadata (title, description, tags, category, privacy) is set automatically from session data — athlete configures nothing
  3. On upload complete, youtube_url and youtube_id are stored in DB against the entry with status 'pending'
  4. Athlete's PROFILE tab is unlocked and shows all their submissions ordered by date, each with serial, discipline, weight, status badge (PENDING/JUDGED), and rep count when judged
  5. Tapping a submission card opens Entry Detail with YouTube embed and ghost replay — judge rep taps animate over the video in real time as it plays
  6. Judge setup form no longer requires YouTube URL input — entering a serial auto-fetches the entry including video URL from DB
  7. If athlete hasn't uploaded yet, judge sees "Video not yet uploaded" error on serial lookup
  8. The full loop works end-to-end: record → upload → share serial → judge enters serial → judge scores → athlete sees JUDGED status with ghost replay
**Plans:** 1/4 plans executed

Plans:
- [x] 05-01-PLAN.md — DB schema migration + core server actions (createEntry, lookupEntryBySerial, getAthleteEntries, getEntryById, updated submitScore)
- [ ] 05-02-PLAN.md — YouTube auto-upload integration (token retrieval, resumable upload, progress bar, entry creation)
- [ ] 05-03-PLAN.md — Judge serial-only lookup (setup form rewrite, rep_taps submission)
- [ ] 05-04-PLAN.md — Profile page + entry detail with ghost replay (BottomNav unlock, submission history, ghost replay engine)

**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/TBD | Not started | - |
| 2. Athlete Video Recorder | 3/3 | Complete    | 2026-03-24 |
| 3. Judge Interface | 0/TBD | Not started | - |
| 4. Leaderboard | 0/TBD | Not started | - |
| 5. Complete Athlete Loop | 1/4 | In Progress|  |
