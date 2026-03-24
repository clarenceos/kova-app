# Kova

## What This Is

Kova is a PWA for online asynchronous kettlebell sport competitions. Athletes record their lifts in-app with authenticated overlays baked into the video, export and upload to YouTube, then submit the link. Judges watch the video, count reps, and submit scores. Organizers manage competitions and publish official results. Three roles — Athlete, Judge, Organizer.

## Core Value

Authenticated video: every submission carries a verified timer, athlete name, discipline, and unique serial number baked in via canvas — no video can be judged without a Kova watermark, making results trustworthy without a referee present.

## Requirements

### Validated

(None yet — ship to validate)

### Active

**Athlete Video Recorder**
- [ ] Athlete completes onboarding (full name → Clerk publicMetadata.name) on first login
- [ ] Athlete selects discipline (Long Cycle, Jerk, Snatch — 10 min each)
- [ ] Athlete configures lift setup: kettlebell weight (kg), countdown duration (5–60s), beep every minute, auto-stop 10s after 10:00, camera (front/rear — locked after setup)
- [ ] Canvas-based recorder overlays timer (0:00→10:00), athlete name, discipline, weight, KOVA branding + serial number onto live camera feed every frame
- [ ] Countdown before recording starts; MediaRecorder records canvas stream at 30fps
- [ ] Auto-stop and beep-every-minute options function correctly
- [ ] Playback screen shows recorded video; athlete can review before exporting
- [ ] Export downloads WebM file: `kova-[discipline-slug]-[athlete-name-slug]-[serial].webm`
- [ ] YouTube instructions screen provides step-by-step upload guide + pre-filled description (name, discipline, weight, date, serial, tagline) with copy-to-clipboard

**Judge Interface**
- [ ] Judge watches YouTube-embedded video for an assigned entry
- [ ] Judge taps to count reps (tap counter, mobile-optimized)
- [ ] Judge submits final rep count as score

**Competition Management**
- [ ] Organizer creates competition with name, date, disciplines, and weight/gender divisions
- [ ] Athlete self-registers for a competition and submits YouTube URL for their entry
- [ ] Organizer can also manually add athlete entries
- [ ] Organizer assigns judges to entries
- [ ] Live leaderboard shows results marked "Unofficial" until organizer publishes
- [ ] Organizer publishes official results

### Out of Scope

- Server-side video storage — athletes export locally and upload to YouTube themselves; no S3/R2 needed
- Multiple judges per entry (v1 = one judge; multi-judge with head judge override is a later milestone)
- Live in-person judging — async online only
- Native iOS/Android apps — PWA covers the mobile use case
- Third-party recording libraries — native browser APIs only (getUserMedia, MediaRecorder, canvas, AudioContext)
- Admin/platform-level user management

## Context

- **Stack**: Next.js 16 App Router, Tailwind CSS, shadcn/ui (Nova preset, Radix), Clerk (auth + user metadata), Turso + Drizzle ORM, Vercel
- **Build priority**: Athlete Video Recorder → Judge Interface → Organizer Mode
- **Recording approach**: getUserMedia → draw to canvas via requestAnimationFrame → canvas.captureStream(30) → MediaRecorder. Overlays are baked into the video stream, not applied in post.
- **Authentication model**: The canvas overlays (serial number, verified timer) serve as proof the video was recorded through Kova. This is the platform's trust mechanism.
- **No backend for recording**: The entire recorder flow is client-side. Video never touches Kova's servers.
- **YouTube as CDN**: Athletes upload to YouTube (unlisted). Kova embeds YouTube for playback in the judge interface. Free hosting, global CDN, no infrastructure cost.
- **Kettlebell sport context**: Sets are typically 10 minutes long. Athletes are scored on rep count only (v1). Weight classes and gender divisions separate leaderboards.

## Constraints

- **Tech stack**: Next.js 16 App Router — must follow current App Router conventions (not Pages Router)
- **Client components**: Camera, canvas, MediaRecorder, AudioContext all require `'use client'` — recording flow is entirely client-side
- **Clerk metadata**: Athlete name stored in `publicMetadata.name` via server action — no separate users table needed initially
- **Mobile-first**: Judge and recorder interfaces are used on phones/tablets; desktop is secondary
- **No third-party recording libs**: Native browser APIs only — keeps bundle small, avoids licensing issues
- **Don't touch**: `app/layout.tsx` and `proxy.ts` — existing auth and layout must not be modified

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Canvas-based recording with overlay bake-in | Overlays become part of the video stream, not editable post-capture — this is the authentication mechanism | — Pending |
| YouTube as video host | No storage infrastructure required; global CDN; judges already know how to use YouTube | — Pending |
| PWA instead of native app | Cross-platform, installable, camera API available in modern mobile browsers | — Pending |
| Clerk publicMetadata for athlete name | Avoids a users DB table for v1; name is always available server-side via auth() | — Pending |
| One judge per entry (v1) | Simplifies scoring logic; multi-judge with override is a defined roadmap item, not dropped | — Pending |
| async-only competitions | Eliminates need for real-time infrastructure; athletes compete on their own schedule | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-03-24 after initialization*
