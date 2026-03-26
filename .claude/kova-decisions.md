# Kova — Technical Decisions

These are locked decisions. Do not suggest alternatives unless Clarence explicitly opens them for reconsideration.

## Video Architecture
- **YouTube iframe API** for all video playback — athletes upload to YouTube (unlisted) and paste the URL. Kova does not host video files.
- Rationale: Zero infrastructure cost at launch. Standard practice in kettlebell sport online competition.
- Do NOT suggest self-hosted video, S3, Cloudflare Stream, Mux, or any video hosting alternative.

## Judge-Side Video Enhancement
- **CSS filters only** on the iframe container — brightness, contrast, grayscale toggle, reset.
- These are never baked into the video file. They are purely visual, per-judge, per-session.
- Filter preferences persist via localStorage per judge.
- Do NOT suggest canvas-based processing, server-side filtering, or any method that modifies the actual video.

## Athlete Portrait Recorder
- **Browser MediaRecorder API + canvas compositing** bakes overlays permanently into the video file.
- Canvas draws the raw camera feed every frame, with SVG/text overlays (timer, round, exercise, competition name) drawn on top.
- Canvas output captured via `canvas.captureStream()` and recorded by MediaRecorder.
- Technical specs: 8Mbps bitrate, display-p3 color space, 24fps, codec order H.264 → VP9 → VP8, portrait lock enforced at getUserMedia level (height > width, 9:16).
- Static overlay elements pre-rendered once — only timer digits update per frame.
- Do NOT suggest WODProof-style default bitrates or approaches that strip color profiles.

## Authentication
- **Clerk** with role metadata: organizer / judge / athlete
- Roles stored in Clerk public metadata, not the database.

## Database
- **Turso (libSQL) + Drizzle ORM**
- Reference Alaga project for established patterns with this stack.

## Judging Model
- **Blind judging** — judges cannot see each other's counts until all assigned judges have submitted.
- **Majority rules** for consensus score.
- If counts diverge beyond threshold → flag specific timestamps where judges disagreed for head judge review.
- Every rep tap is timestamped to video position.
- Submission is final — no editing after submit.

## Gamification System
- **Peer judge assignment is fully automated** — the app assigns randomly on competition close. Organizer never manually assigns. Do NOT add manual assignment UI.
- **Score finalisation is gated** — an athlete's result cannot be published until they have completed all assigned judging duties. This is enforced at the data layer, not just the UI.
- **No numerical MMR or ELO displayed to users** — ever. Collect underlying data (sessions, completion rate, consistency) but surface only as tier labels when the time comes.
- **No penalty system** — judge trust data is collected silently. No score is ever deducted. No organizer tier ever goes down. Neutral outcome for stalled comps only.
- **Official vs Club formats are always distinct** — `format_type: official | club` must be present on every competition. Official formats count toward official records. Club formats are tagged clearly and never mixed into official history.
- **Trophies are display-only** — they do not affect scores, rankings, or tier calculations.
- Full design rationale: `.claude/kova-gamification.md`

## What Is Not Being Built (Ever, or Not Yet)
- No live judging mode
- No AI rep counting
- No native app (PWA only)
- No custom video storage
- No CrossFit support (future expansion layer only, not now)
- No payments at launch
- No real-time collaboration

## Data Model (Reference)
```
Competition       id, name, sport, date, organizer_id
Event             id, competition_id, category, exercise, time_limit_seconds
Entry             id, event_id, athlete_id, video_url, submission_status
JudgeAssignment   id, entry_id, judge_id, mode (async)
JudgeSession      id, assignment_id, rep_taps [{video_timestamp_ms, type}], final_count, submitted_at, is_submitted
Result            id, entry_id, scores [], consensus_score, resolution_method, disputed_timestamps, published
```

## Deployment
- **Vercel** for hosting
- Environment variables managed in Vercel dashboard
