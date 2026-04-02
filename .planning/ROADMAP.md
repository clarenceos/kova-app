# Roadmap: Kova

## Milestones

- 🚧 **v1.0 Core Platform** - Phases 1-5 (in progress)
- 🚧 **v2.0 Queue System** - Phases 6-10 (in progress)

## Phases

<details>
<summary>v1.0 Core Platform (Phases 1-5)</summary>

**Milestone Goal:** Authenticated canvas-based recording, judge interface, leaderboard, and complete athlete-to-judge loop with YouTube auto-upload and ghost replay.

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
**Plans:** 4/4 plans complete

Plans:
- [x] 05-01-PLAN.md — DB schema migration + core server actions (createEntry, lookupEntryBySerial, getAthleteEntries, getEntryById, updated submitScore)
- [x] 05-02-PLAN.md — YouTube auto-upload integration (token retrieval, resumable upload, progress bar, entry creation)
- [x] 05-03-PLAN.md — Judge serial-only lookup (setup form rewrite, rep_taps submission)
- [x] 05-04-PLAN.md — Profile page + entry detail with ghost replay (BottomNav unlock, submission history, ghost replay engine)

**UI hint**: yes

</details>

---

### v2.0 Queue System

**Milestone Goal:** Organizers create competitions, athletes self-register via public links, the system auto-generates timetables with conflict detection, and organizers manage registrations from a dashboard.

#### Phase 6: Schema & Foundation
**Goal**: The database is in a clean, migratable state with three new tables, a correct serial number generator, and the atomicity constraint enforced — giving every subsequent phase a trustworthy data layer to build on
**Depends on**: Phase 5
**Requirements**: DATA-01, DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. Running `drizzle-kit migrate` against dev produces no "table already exists" errors — migration journal is consistent with actual schema
  2. Three new tables (competitions, registrants, registration_entries) exist in the database with all columns, constraints, and cuid2 PKs as specified
  3. A serial number can be generated server-side in XXX-0000 format; generating two serials simultaneously does not produce a duplicate (UNIQUE constraint + retry loop prevents collision)
  4. All multi-table writes in the codebase use db.batch() — no db.transaction() calls exist in any server action
**Plans:** 3 plans

Plans:
- [x] 06-01-PLAN.md — Fix Drizzle migration journal, add three new tables to schema.ts, install cuid2, generate migration 0003
- [x] 06-02-PLAN.md — Competition-scoped serial number generator (deriveSerialPrefix + generateCompetitionSerial) with tests
- [ ] 06-03-PLAN.md — Gap closure: fix dead retry loop in generateCompetitionSerial, install vitest, add collision tests

#### Phase 7: Scheduling Pure Logic
**Goal**: The scheduling algorithm and weight class helper are implemented as zero-dependency pure functions that can be unit-tested with fixture data before any UI or DB integration
**Depends on**: Phase 6
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06
**Success Criteria** (what must be TRUE):
  1. Given a fixture array of entries, the scheduler returns time blocks with athletes assigned to platforms in KB sport sort order (LC before Jerk before Snatch, 10min before 5min, Female before Male, weight class alphabetically)
  2. A REST conflict is flagged when and only when the gap between two blocks for the same athlete is strictly less than minRestBlocks (a gap of exactly minRestBlocks is not flagged)
  3. A COACH conflict is flagged when an athlete's listed coach name matches another athlete's name and they share a block
  4. Weight class is correctly derived from body weight at render time for both male and female divisions — the function is never called with a stored weight_class value
  5. The scheduler produces no output when called with an empty entries array (no crash, no conflict false-positives)
**Plans:** 2/2 plans complete

Plans:
- [x] 07-01-PLAN.md — Scheduler type contracts + weight class derivation helper (TDD)
- [x] 07-02-PLAN.md — Core scheduling algorithm: sort, block assignment, REST/COACH conflict detection (TDD)

#### Phase 8: Competition Creation
**Goal**: An organizer can create a competition with all configurable rules and immediately receive a shareable registration link — establishing the competition record that gates all downstream registration and scheduling
**Depends on**: Phase 6
**Requirements**: COMP-01, COMP-02, COMP-03
**Success Criteria** (what must be TRUE):
  1. Organizer fills out the competition form (name, date, platform count, duration rule, allowed bell weights, status, optional max/deadline) and submits — a competition row is created in the database
  2. The serial prefix is auto-derived from the competition name without any manual input (e.g. "Girya Pilipinas Cup" derives "GPC")
  3. After creation, organizer is redirected to the dashboard and sees a copyable registration link for the new competition
**Plans:** 2 plans

Plans:
- [ ] 08-01-PLAN.md — Install shadcn form components, create organizer layout, build createCompetition server action
- [ ] 08-02-PLAN.md — Competition creation form with live serial prefix preview, competition list page with copyable registration links

**UI hint**: yes

#### Phase 9: Public Registration
**Goal**: Athletes can self-register for a competition via a public link, select their events with bell weights and durations, and receive confirmed serial numbers — with all guard states enforced and multi-event entries created atomically
**Depends on**: Phase 8
**Requirements**: REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, REG-07, REG-08
**Success Criteria** (what must be TRUE):
  1. Visiting a registration link shows the competition name and date at the top; attempting to register for a closed, deadline-passed, or full competition shows a clear message with no form
  2. Athlete fills in personal details (last name, first name, gender, body weight, country via searchable dropdown) and selects at least one event
  3. Each selected event reveals a bell weight dropdown and duration selector populated from the competition's allowed values; unchecking an event clears its selections
  4. Submitting creates one registrant row and one registration_entries row per event, with serials assigned atomically — partial registrations (athlete row with no events) cannot occur
  5. Success page shows the athlete's name, competition name, and a table of assigned serials per event, with instruction to screenshot or save the serials
  6. "Register another athlete" button returns to the blank form — allowing a coach to register their full team in sequence
  7. An athlete selecting two events (biathlon) receives two separate serial numbers on the success page
**Plans**: TBD
**UI hint**: yes

#### Phase 10: Organizer Dashboard & Timetable
**Goal**: Organizers can review registrations with analytics and filtering, import registrations via CSV, and generate a print-ready timetable with conflict warnings — completing the full competition management workflow
**Depends on**: Phase 9, Phase 7
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04, DASH-05, DASH-06, SCHED-07, SCHED-08, SCHED-09
**Success Criteria** (what must be TRUE):
  1. Organizer can switch between competitions using a selector dropdown and see an analytics bar showing total registrations, per-event counts, gender split, spots remaining, and deadline countdown for the selected competition
  2. Registrations table shows all registrants sortable by name, bodyweight, and registered-at, and filterable by event and gender; organizer can remove a registrant and all their entries in one action
  3. Organizer can import a CSV file, see a validation summary with any row-level errors reported before committing, and bulk-create registrations without re-entering data
  4. Clicking "Generate Queue" opens a modal for start time input; confirming redirects to a timetable page that displays a grid with time, block number, and platform columns filled with athlete/event data
  5. Conflict warnings are visible in a dedicated panel: REST conflicts shown in red with athlete names and block numbers, COACH conflicts shown in amber
  6. Printing the timetable page hides navigation and buttons, preserves event-tinted row colors, and fits the table to paper width
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation & Auth | v1.0 | 0/TBD | Not started | - |
| 2. Athlete Video Recorder | v1.0 | 3/3 | Complete | 2026-03-24 |
| 3. Judge Interface | v1.0 | 0/TBD | Not started | - |
| 4. Leaderboard | v1.0 | 0/TBD | Not started | - |
| 5. Complete Athlete Loop | v1.0 | 4/4 | Complete | 2026-03-26 |
| 6. Schema & Foundation | v2.0 | 2/3 | Gap closure | - |
| 7. Scheduling Pure Logic | v2.0 | 2/2 | Complete   | 2026-04-02 |
| 8. Competition Creation | v2.0 | 0/2 | Planning complete | - |
| 9. Public Registration | v2.0 | 0/TBD | Not started | - |
| 10. Organizer Dashboard & Timetable | v2.0 | 0/TBD | Not started | - |
