# Requirements: Kova

**Defined:** 2026-03-24
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

- [ ] **LOOP-01**: After recording, athlete uploads video to YouTube via YouTube Data API v3 resumable upload with progress bar, using Google OAuth token from Clerk
- [ ] **LOOP-02**: Upload metadata (title, description, tags, category 17, privacyStatus unlisted) set automatically from session data (discipline, weight, athlete name, serial)
- [ ] **LOOP-03**: On upload complete, youtube_url and youtube_id stored in DB; entry created with status 'pending' and athlete_id linked to Clerk user
- [ ] **LOOP-04**: Profile page (/profile) shows athlete's submission history: serial, discipline, weight, date, status badge (PENDING/JUDGED), rep count when judged
- [ ] **LOOP-05**: Entry Detail screen with YouTube embed and ghost replay — judge rep_taps animate over video in real time (Check/X icons at each tap's timestamp)
- [ ] **LOOP-06**: Judge setup form: serial lookup auto-fetches entry including youtube_url; YouTube URL input removed entirely
- [ ] **LOOP-07**: If entry has no youtube_url, judge sees "Video not yet uploaded by athlete" error
- [x] **LOOP-08**: DB schema extended: youtube_id, status, athlete_id, rep_taps columns added; reps made nullable for pending entries

## v2 Requirements

### Role-Based Access

- **ROLE-01**: Clerk `publicMetadata.role` gates athlete / judge / organizer routes
- **ROLE-02**: Judge assignment — organizer assigns judges to specific entries

### Competition Management

- **COMP-01**: Organizer creates competition with name, date, disciplines, and weight/gender divisions
- **COMP-02**: Organizer manually adds athlete entries or athlete self-registers
- **COMP-03**: Athlete submits YouTube URL as part of a structured competition entry
- **COMP-04**: Entry queue — judge sees assigned entries without manually pasting URLs

### Multi-Judge

- **MJ-01**: Multiple judges can score the same entry
- **MJ-02**: Head judge can override individual scores
- **MJ-03**: Organizer reviews and publishes official results (unofficial → official transition)

### PWA & Notifications

- **PWA-01**: App installable via PWA manifest + service worker (`next-pwa` removed, Serwist added)
- **PWA-02**: Push notification at each minute mark during judging (upcoming)
- **PWA-03**: Notification when score is published

## Out of Scope

| Feature | Reason |
|---------|--------|
| Server-side video storage | Athletes self-host on YouTube — no storage infrastructure needed |
| Native iOS/Android apps | PWA covers mobile; canvas recording unsupported on iOS Safari anyway |
| Third-party recording libraries | Native browser APIs only — bundle size and licensing |
| AI rep counting | Out of scope for authenticated human judging platform |
| Payment processing | Not a competition revenue tool in v1 |
| Biathlon/coefficient scoring | Single-discipline scoring only for v1; formula variations by federation TBD |
| Real-time WebSocket updates | Polling or server-sent events sufficient for async competitions |

## Traceability

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
| LOOP-01 | Phase 5 | Pending |
| LOOP-02 | Phase 5 | Pending |
| LOOP-03 | Phase 5 | Pending |
| LOOP-04 | Phase 5 | Pending |
| LOOP-05 | Phase 5 | Pending |
| LOOP-06 | Phase 5 | Pending |
| LOOP-07 | Phase 5 | Pending |
| LOOP-08 | Phase 5 | Complete |

**Coverage:**
- v1 requirements: 28 total
- Mapped to phases: 28
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-24*
*Last updated: 2026-03-24 after roadmap creation — all 20 v1 requirements mapped*
