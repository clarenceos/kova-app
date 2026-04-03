# Kova

## What This Is

Kova is a PWA for online asynchronous kettlebell sport competitions. Athletes record their lifts in-app with authenticated overlays baked into the video, export and upload to YouTube, then submit the link. Judges watch the video, count reps, and submit scores. Organizers manage competitions and publish official results. Three roles — Athlete, Judge, Organizer.

## Core Value

Authenticated video: every submission carries a verified timer, athlete name, discipline, and unique serial number baked in via canvas — no video can be judged without a Kova watermark, making results trustworthy without a referee present.

## Current Milestone: v2.0 Queue System

**Goal:** Competition registration and queue scheduling — organizers create competitions, athletes self-register via public links, and the system auto-generates timetables with conflict detection.

**Target features:**
- Competition creation with configurable rules (platforms, durations, bell weights)
- Public athlete registration form with serial number assignment
- Organizer dashboard with registrations table, analytics, CSV import
- Scheduling algorithm (pure function) that auto-generates timetables and flags rest/coach conflicts
- Queue/timetable view (print-friendly, conflict warnings)

## Requirements

### Validated

**Complete Athlete Loop** (Validated in Phase 05)
- [x] DB schema supports athlete entries with youtube_id, status, athlete_id, rep_taps
- [x] Athlete can upload video directly to YouTube from playback page (resumable upload with progress)
- [x] Judge enters serial number only — session auto-populated from DB lookup
- [x] Judge submits rep taps array with score (UPDATE-first pattern)
- [x] Athlete profile page shows submission history with status badges
- [x] Entry detail page with YouTube embed and ghost replay of judge rep taps

### Active

**Queue System (v2.0)**
- [ ] Organizer creates a competition with rules (platforms, durations, bell weights)
- [ ] Organizer shares a registration link with athletes
- [x] Athletes register via public link with personal details and event selections — Validated in Phase 09
- [x] Serial numbers (XXX-0000) assigned server-side per registration entry — Validated in Phase 06
- [x] Organizer reviews registrations on dashboard with analytics and filtering — Validated in Phase 10
- [x] Organizer imports registrations via CSV — Validated in Phase 10
- [x] System auto-generates timetable from registrations (pure scheduling algorithm) — Validated in Phase 07
- [x] Scheduler flags rest conflicts (same athlete, insufficient gap) and coach conflicts — Validated in Phase 07
- [x] Queue/timetable view is print-friendly with conflict warnings — Validated in Phase 10

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
*Last updated: 2026-04-03 after Phase 10 completion*
