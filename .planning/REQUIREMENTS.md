# Requirements: Kova

**Defined:** 2026-03-24 (v1.0), 2026-04-02 (v2.0)
**Core Value:** Authenticated video — every submission carries a verified timer, name, discipline, and serial baked in via canvas, making async kettlebell competition results trustworthy without a referee present.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up and sign in via Clerk (email/password)
- [ ] **AUTH-02**: Athlete is redirected to onboarding on first login to enter their full name (saved to `publicMetadata.name`)
- [ ] **AUTH-03**: Dashboard shows mode switcher ("Record a Lift" / "Judge a Lift") — no Clerk role gates in v1

### Recorder

- [x] **REC-01**: Athlete selects discipline (Long Cycle, Jerk, Snatch — 10 min)
- [x] **REC-02**: Athlete configures lift: kettlebell weight (kg), countdown duration (5–60s), beep-every-minute toggle, auto-stop-at-10:10 toggle, front/rear camera selection (locked after setup)
- [x] **REC-03**: Canvas overlays (timer 0:00→10:00, athlete name, discipline, kettlebell weight, KOVA brand + icon, UUID serial number) drawn onto every frame via `requestAnimationFrame`
- [x] **REC-04**: Recording starts after countdown completes; `MediaRecorder` records the canvas stream at 30fps
- [x] **REC-05**: Beep-every-minute plays via `AudioContext` at each minute mark when enabled
- [x] **REC-06**: Auto-stop ends recording 10 seconds after timer reaches 10:00 when enabled
- [x] **REC-07**: Screen Wake Lock is active during recording to prevent screen dimming killing the session
- [x] **REC-08**: Playback screen shows the recorded video for athlete review before export
- [x] **REC-09**: Export downloads the recording with correct duration metadata (post-processed via `webm-fix-duration`); filename: `kova-[discipline-slug]-[athlete-name-slug]-[serial].[ext]` where ext reflects actual MIME type (webm or mp4)
- [x] **REC-10**: YouTube instructions screen shows step-by-step upload guide + pre-filled description (athlete name, discipline, weight, date, serial, KOVA tagline) with copy-to-clipboard
- [x] **REC-11**: Browser capability check on recorder entry — if `canvas.captureStream` is unsupported (iOS Safari), displays a clear "unsupported browser" message instead of proceeding

### Judge Interface

- [ ] **JUDGE-01**: Judge starts a judging session by pasting a YouTube URL and entering athlete name, discipline, and kettlebell weight
- [ ] **JUDGE-02**: YouTube video embeds and plays in the judge interface
- [ ] **JUDGE-03**: Tap counter with large mobile-optimized tap target increments rep count; undo last tap supported
- [ ] **JUDGE-04**: Judge submits score (rep count saved to DB with athlete name, discipline, weight, YouTube URL, date)

### Leaderboard

- [ ] **LB-01**: Live leaderboard displays all submitted scores filterable by discipline
- [ ] **LB-02**: Each leaderboard entry shows athlete name, rep count, kettlebell weight, discipline, and date submitted

### Complete Athlete Loop

- [x] **LOOP-01**: After recording, athlete uploads video to YouTube via YouTube Data API v3 resumable upload with progress bar, using Google OAuth token from Clerk
- [x] **LOOP-02**: Upload metadata (title, description, tags, category 17, privacyStatus unlisted) set automatically from session data (discipline, weight, athlete name, serial)
- [x] **LOOP-03**: On upload complete, youtube_url and youtube_id stored in DB; entry created with status 'pending' and athlete_id linked to Clerk user
- [x] **LOOP-04**: Profile page (/profile) shows athlete's submission history: serial, discipline, weight, date, status badge (PENDING/JUDGED), rep count when judged
- [x] **LOOP-05**: Entry Detail screen with YouTube embed and ghost replay — judge rep_taps animate over video in real time (Check/X icons at each tap's timestamp)
- [x] **LOOP-06**: Judge setup form: serial lookup auto-fetches entry including youtube_url; YouTube URL input removed entirely
- [x] **LOOP-07**: If entry has no youtube_url, judge sees "Video not yet uploaded by athlete" error
- [x] **LOOP-08**: DB schema extended: youtube_id, status, athlete_id, rep_taps columns added; reps made nullable for pending entries

## v2.0 Requirements

Requirements for the Queue System milestone. Each maps to roadmap phases 6+.

### Data & Infrastructure

- [x] **DATA-01**: Three new Drizzle tables (competitions, registrants, registration_entries) added to lib/schema.ts with cuid2 IDs, no existing tables modified
- [x] **DATA-02**: Serial numbers generated server-side in XXX-0000 format with UNIQUE constraint and retry loop on collision
- [x] **DATA-03**: All multi-table writes use db.batch() for atomicity (never db.transaction() over Turso HTTP)

### Competition Management

- [x] **COMP-01**: Organizer can create a competition with name, date, platform count, duration rules, allowed bell weights, status, and optional max registrants/deadline
- [x] **COMP-02**: Serial prefix auto-derived from competition name (first letter of each word, uppercased, max 3 chars)
- [ ] **COMP-03**: Copyable registration link shown on redirect after competition creation

### Registration

- [x] **REG-01**: Public registration form displays competition name and date at top
- [x] **REG-02**: Guard states prevent registration when competition not found (404), not open, deadline passed, or capacity reached
- [x] **REG-03**: Athlete enters last name, first name, gender, body weight (kg), and country (searchable dropdown)
- [x] **REG-04**: Each selected event reveals bell weight dropdown and duration selector based on competition's allowed values
- [x] **REG-05**: Submitting creates 1 registrant + N entry rows with serials assigned atomically via db.batch()
- [x] **REG-06**: Success page shows registrant name, competition name, and table of assigned serials per event
- [x] **REG-07**: Multi-event submissions (biathlon/triathlon) create separate entries with separate serials
- [x] **REG-08**: "Register another athlete" button on success page returns to form

### Organizer Dashboard

- [ ] **DASH-01**: Competition selector dropdown showing name, date, and status badge with "New Competition" button
- [ ] **DASH-02**: Analytics bar showing total registrations, per-event counts, gender split, spots remaining, deadline countdown
- [ ] **DASH-03**: Registrations table sortable by name, bodyweight, registered at — filterable by event and gender
- [ ] **DASH-04**: Remove action deletes registrant and all their entries
- [ ] **DASH-05**: CSV import parses file client-side, shows validation summary with error reporting, bulk-creates registrations via server action
- [ ] **DASH-06**: Generate Queue button opens modal with start time input, redirects to timetable view

### Scheduling & Queue

- [x] **SCHED-01**: Pure scheduling function in lib/queue/scheduler.ts with no DB calls — receives typed array, returns time blocks + conflicts
- [x] **SCHED-02**: Entries sorted by KB sport protocol: LC → Jerk → Snatch, 10min before 5min, Female first, weight class alphabetically
- [x] **SCHED-03**: Block assignment fills platform slots sequentially (greedy)
- [x] **SCHED-04**: REST conflict detection: same athlete in blocks where gap < minRestBlocks (strict less-than)
- [x] **SCHED-05**: COACH conflict detection: athlete who is also a listed coach sharing a block with their student
- [x] **SCHED-06**: Weight class derived from body weight at render time (never stored in DB)
- [x] **SCHED-07**: Timetable grid with time, block number, and platform columns showing athlete name, event, bell weight, weight class, club
- [x] **SCHED-08**: Conflict panel showing REST (red) and COACH (amber) warnings with athlete names and block numbers
- [x] **SCHED-09**: Print-friendly layout: nav/buttons hidden, background colors preserved, table fits paper width

## Future Requirements

Deferred to post-v2.0. Tracked but not in current roadmap.

### Role-Based Access

- **ROLE-01**: Clerk `publicMetadata.role` gates athlete / judge / organizer routes
- **ROLE-02**: Judge assignment — organizer assigns judges to specific entries
- **AUTH-Q01**: Clerk auth gate on organizer routes (R1 defers intentionally; code structured for retrofit)
- **AUTH-Q02**: Multi-organizer access per competition

### Multi-Judge

- **MJ-01**: Multiple judges can score the same entry
- **MJ-02**: Head judge can override individual scores
- **MJ-03**: Organizer reviews and publishes official results (unofficial → official transition)

### PWA & Notifications

- **PWA-01**: App installable via PWA manifest + service worker (`next-pwa` removed, Serwist added)
- **PWA-02**: Push notification at each minute mark during judging (upcoming)
- **PWA-03**: Notification when score is published

### Athlete Experience

- **ATH-Q01**: Public queue view for athletes (read-only start list)
- **ATH-Q02**: Email confirmation sent to athletes after registration
- **ATH-Q03**: Age divisions (Junior/Open/Masters/Veterans)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side video storage | Athletes self-host on YouTube — no storage infrastructure needed |
| Native iOS/Android apps | PWA covers mobile; canvas recording unsupported on iOS Safari anyway |
| Third-party recording libraries | Native browser APIs only — bundle size and licensing |
| AI rep counting | Out of scope for authenticated human judging platform |
| Real-time WebSocket updates | Polling or server-sent events sufficient for async competitions |
| Payment collection | PCI compliance scope; not needed for v2.0 |
| Drag-and-drop schedule editing | High complexity; greedy algorithm is sufficient for v2.0 |
| Registration editing after serial assignment | Breaks serial trust model — serials are immutable once assigned |
| weight_class stored in DB | QUEUE_SPEC explicitly: "display only, never stored" |
| db.transaction() for multi-table writes | Unreliable over Turso HTTP — use db.batch() |
| Mobile-specific layouts for organizer pages | R2: desktop/PC browser first |

## Traceability

### v1.0

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Pending |
| AUTH-02 | Phase 1 | Pending |
| AUTH-03 | Phase 1 | Pending |
| REC-01 | Phase 2 | Complete |
| REC-02 | Phase 2 | Complete |
| REC-03 | Phase 2 | Complete |
| REC-04 | Phase 2 | Complete |
| REC-05 | Phase 2 | Complete |
| REC-06 | Phase 2 | Complete |
| REC-07 | Phase 2 | Complete |
| REC-08 | Phase 2 | Complete |
| REC-09 | Phase 2 | Complete |
| REC-10 | Phase 2 | Complete |
| REC-11 | Phase 2 | Complete |
| JUDGE-01 | Phase 3 | Pending |
| JUDGE-02 | Phase 3 | Pending |
| JUDGE-03 | Phase 3 | Pending |
| JUDGE-04 | Phase 3 | Pending |
| LB-01 | Phase 4 | Pending |
| LB-02 | Phase 4 | Pending |
| LOOP-01 | Phase 5 | Complete |
| LOOP-02 | Phase 5 | Complete |
| LOOP-03 | Phase 5 | Complete |
| LOOP-04 | Phase 5 | Complete |
| LOOP-05 | Phase 5 | Complete |
| LOOP-06 | Phase 5 | Complete |
| LOOP-07 | Phase 5 | Complete |
| LOOP-08 | Phase 5 | Complete |

### v2.0

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 6 | Complete |
| DATA-02 | Phase 6 | Complete |
| DATA-03 | Phase 6 | Complete |
| COMP-01 | Phase 8 | Complete |
| COMP-02 | Phase 8 | Complete |
| COMP-03 | Phase 8 | Pending |
| REG-01 | Phase 9 | Complete |
| REG-02 | Phase 9 | Complete |
| REG-03 | Phase 9 | Complete |
| REG-04 | Phase 9 | Complete |
| REG-05 | Phase 9 | Complete |
| REG-06 | Phase 9 | Complete |
| REG-07 | Phase 9 | Complete |
| REG-08 | Phase 9 | Complete |
| DASH-01 | Phase 10 | Pending |
| DASH-02 | Phase 10 | Pending |
| DASH-03 | Phase 10 | Pending |
| DASH-04 | Phase 10 | Pending |
| DASH-05 | Phase 10 | Pending |
| DASH-06 | Phase 10 | Pending |
| SCHED-01 | Phase 7 | Complete |
| SCHED-02 | Phase 7 | Complete |
| SCHED-03 | Phase 7 | Complete |
| SCHED-04 | Phase 7 | Complete |
| SCHED-05 | Phase 7 | Complete |
| SCHED-06 | Phase 7 | Complete |
| SCHED-07 | Phase 10 | Complete |
| SCHED-08 | Phase 10 | Complete |
| SCHED-09 | Phase 10 | Complete |

**Coverage:**
- v1.0 requirements: 28 total, 28 mapped, 0 unmapped ✓
- v2.0 requirements: 29 total, 29 mapped, 0 unmapped ✓

---
*Requirements defined: 2026-03-24 (v1.0), 2026-04-02 (v2.0)*
*Last updated: 2026-04-02 after v2.0 roadmap creation*
