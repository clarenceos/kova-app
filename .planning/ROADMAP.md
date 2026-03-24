# Roadmap: Kova

## Overview

Kova v1 delivers three interconnected capabilities: an authenticated canvas-based video recorder that bakes proof-of-capture overlays into the video stream, a judge interface where judges paste a YouTube URL and tap-count reps, and a live leaderboard showing all submitted scores by discipline. The build order follows the dependency chain — auth and DB scaffolding first, then the recorder (Kova's core differentiator), then judging, then the leaderboard that surfaces results. Competition management (organizer workflows, entry submission, competition creation) is v2.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation & Auth** - DB schema, DAL scaffolding, Clerk auth flow, athlete onboarding, remove next-pwa
- [ ] **Phase 2: Athlete Video Recorder** - Full canvas recording pipeline with authenticated overlays, export, and YouTube instructions
- [ ] **Phase 3: Judge Interface** - YouTube embed, tap counter, score submission to DB
- [ ] **Phase 4: Leaderboard** - Live scores filterable by discipline, completing the v1 loop

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

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation & Auth | 0/TBD | Not started | - |
| 2. Athlete Video Recorder | 1/3 | In Progress|  |
| 3. Judge Interface | 0/TBD | Not started | - |
| 4. Leaderboard | 0/TBD | Not started | - |
