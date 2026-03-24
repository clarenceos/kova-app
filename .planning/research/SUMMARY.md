# Project Research Summary

**Project:** Kova
**Domain:** Async kettlebell sport competition PWA with canvas-based authenticated video recording
**Researched:** 2026-03-24
**Confidence:** MEDIUM (stack/architecture HIGH; iOS recording support LOW)

## Executive Summary

Kova is a multi-role sports competition platform for online kettlebell sport events, combining an authenticated in-browser video recorder, a judge interface, competition management, and a public leaderboard. The recommended approach is a Next.js 16 App Router PWA with route-group-based role isolation (`(athlete)`, `(judge)`, `(organizer)`), a thin Server Action + server-only DAL pattern for all mutations, Turso/Drizzle for the database, and Clerk for auth and athlete name storage via `publicMetadata`. The recording pipeline uses only native browser APIs — `getUserMedia` → canvas compositing → `canvas.captureStream(30)` → `MediaRecorder` — with the overlay (timer, name, discipline, weight, serial) baked into the video frames. YouTube serves as the CDN for all submissions, which eliminates server-side video storage entirely.

The architecture's most important insight is the dependency chain: athlete name must exist before recording can begin, a recording serial must be generated before recording starts, and a competition with divisions must exist before an athlete can submit an entry. This drives a strictly sequential build order: DB schema → auth/roles → recorder → competition management → entry submission → judge interface → leaderboard. Every phase depends on the one before it.

The single highest-risk area is iOS Safari: `canvas.captureStream()` is confirmed unsupported on iOS (Can I Use, March 2026), meaning the recording pipeline does not work on any iPhone or iPad. The screen wake lock, WebM duration metadata, and `proxy.ts` Clerk integration are additional Phase 1 concerns that cannot be deferred without breaking the core product. iOS recording support should be explicitly documented as out of scope for v1, with a clear in-app message directing iOS users to Chrome on Android or desktop.

## Key Findings

### Recommended Stack

The full core stack is already installed and correctly chosen. The only required change is replacing the abandoned `next-pwa@5.6.0` (last release December 2022, incompatible with Next.js 16) with either a hand-rolled `public/sw.js` or Serwist (`@serwist/next ^9.0.0`). For Kova's minimal offline needs (cache the app shell; the recording flow needs no network), a hand-rolled service worker is simpler and avoids the `--webpack` build flag that Serwist requires. The PWA manifest should use Next.js 16's built-in `app/manifest.ts` — no library needed.

**Core technologies:**
- Next.js 16.2.1 (App Router) — framework; recording flow is entirely `'use client'` so no SSR conflict
- React 19.2.4 — UI library; already in place
- Clerk ^7.0.6 — auth + `publicMetadata.name` athlete identity; avoids a users table
- Turso + Drizzle ORM (drizzle ^0.45.1, @libsql/client ^0.17.2) — edge-compatible SQLite; correct for this scale
- shadcn/ui + Tailwind CSS v4 — accessible component primitives; already in place
- Vercel — deployment; no extra config needed for client-side recording
- Native browser APIs (MediaRecorder, Canvas, AudioContext, Screen Wake Lock) — no recording libraries; project constraint
- `webm-fix-duration` (mat-sz/webm-fix-duration) — post-processing for seekable WebM exports; must add

**Remove:** `next-pwa@5.6.0` — incompatible with Next.js 16, breaks service worker.

**Add:** `webm-fix-duration` (required for export quality), optionally `@serwist/next` + `serwist` if full offline caching is needed beyond the app shell.

### Expected Features

The feature set splits cleanly into two independent flows that merge at the leaderboard: the athlete recording flow (record → review → export → YouTube upload → submit URL) and the competition flow (competition creation → entry management → judge assignment → scoring → results). Both flows are required for v1.

**Must have (table stakes):**
- Athlete onboarding: name capture on first login (gates the recorder)
- Discipline + weight + countdown setup before recording
- Canvas recorder with overlay (timer, name, discipline, weight, serial, KOVA branding) at 30fps
- Auto-stop at 10:10; minute beep via AudioContext; configurable countdown (5–60s)
- Playback review before export; WebM export with serial in filename
- YouTube instructions with pre-filled description and copy-to-clipboard
- Competition creation with name, date, disciplines, weight/gender divisions
- Athlete self-registration and YouTube URL submission for entries
- Organizer: manually add athlete entries; assign judges to entries
- Judge interface: YouTube-embedded video + tap counter + score submit
- Live leaderboard (unofficial) segmented by division; official results publication

**Should have (competitive advantage):**
- Authenticated video overlay with unique serial — Kova's core trust differentiator; no competing KB platform does this
- Pre-filled YouTube description with serial number — reduces athlete upload errors
- PWA installability via manifest + service worker — no App Store distribution needed

**Defer to v1.x:**
- Age divisions (Junior/Open/Masters/Veterans) — add when organizers request it
- Multi-judge per entry with head judge override — add at competition volume
- Push notifications — add when users complain about checking manually

**Defer to v2+:**
- Athlete competition history, biathlon scoring (coefficient-based), organizer analytics, public leaderboard embeds

**Anti-features to avoid building:**
- Server-side video storage (YouTube provides this for free; S3/R2 adds GDPR/cost/transcoding complexity)
- Real-time WebSocket leaderboard (async competition; polling/SSE is sufficient)
- Video trimming/editing (undermines the authenticated overlay's validity)
- AI rep counting (unreliable for KB sport no-rep calls; undermines trust)

### Architecture Approach

The recommended architecture uses Next.js App Router route groups for role isolation, a thin Server Action layer that delegates to a `server-only` DAL, and local React state for the recording flow with no global state library. The recording pipeline is entirely client-side — no server contact until the athlete submits a YouTube URL. The DB schema has five tables: `competitions`, `divisions`, `entries`, `scores`, and uses Clerk `publicMetadata` in place of a users table. Athlete names are denormalized into `entries.athleteName` at submission time to avoid joins on the leaderboard.

**Major components:**
1. `(athlete)` route group + `components/recorder/RecorderCanvas.tsx` — canvas recording state machine; the heaviest client-side work
2. `(judge)` route group + `TapCounter.tsx` + `YouTubeEmbed.tsx` — embedded video playback, tap-to-count, score submit
3. `(organizer)` route group — competition CRUD, entry management, judge assignment, result publication (mostly server components + server action forms)
4. `(public)` route group — public leaderboard (server components, cached)
5. `lib/dal/` (`server-only`) — all DB queries and Clerk metadata mutations; authorization enforced here
6. `app/actions/` — thin `'use server'` entry points: validate → delegate to DAL → revalidatePath
7. `public/sw.js` — hand-rolled service worker caching app shell

**Key patterns to follow:**
- Discriminated union state machine in `RecorderCanvas.tsx` drives the multi-step recording flow
- `requireRole(role)` helper in each layout.tsx for role guard (redirect, not 403)
- DAL functions are the single authorization enforcement point — every mutation checks `auth().userId` and ownership before touching the DB
- Drizzle client created at module scope (singleton) for connection reuse in warm serverless instances
- All timestamps as Unix integers (SQLite has no native datetime)

### Critical Pitfalls

1. **`canvas.captureStream()` not supported on iOS** — `HTMLCanvasElement.captureStream` is absent on all iOS Safari versions through iOS 26.4 (confirmed Can I Use, March 2026). Add a capability check on recorder mount and show a clear "recording is not supported on iOS — use Chrome on Android or desktop" message. Do not attempt silent degradation.

2. **Screen dims during 10-minute recording set** — rAF loop stops when screen locks; recorded video will have a frozen or audio-only segment. Request the Screen Wake Lock API immediately when recording starts. Handle the `release` event with a visible in-app warning. Must be in the initial recorder implementation, not retrofitted.

3. **WebM export has no duration metadata and cannot seek** — `MediaRecorder` produces WebM files with `duration: Infinity`; scrubbing is broken everywhere. Use `webm-fix-duration` to post-process the Blob before download. Add this to the export step before shipping the recorder.

4. **`proxy.ts` not `middleware.ts` (Next.js 16 breaking change)** — The existing `proxy.ts` is correctly configured; the risk is future developers copying Clerk docs that reference `middleware.ts`. Every server function must individually call `auth()` — the proxy is not a sufficient auth gate for mutations.

5. **Server actions defined inside `'use client'` files lose Clerk request context** — `auth()` returns null when `'use server'` functions are defined inline within client components. All server actions must be defined in dedicated `app/actions/` files with `'use server'` at the file level, not inline.

## Implications for Roadmap

Based on the dependency chain and pitfall mapping, the build order is strictly sequential. Each phase unblocks the next and cannot be parallelized.

### Phase 1: Foundation and Auth
**Rationale:** DB schema and Clerk role model are the root dependencies for every other phase. Without schema + DAL, no data can be written. Without role guards, route groups cannot be protected. This phase has no prerequisites.
**Delivers:** Complete DB schema, Drizzle migrations, DAL scaffolding (typed functions, even with stub bodies), `lib/db.ts` singleton, role guard pattern (`requireRole` helper), athlete onboarding (name capture → Clerk `publicMetadata`).
**Addresses:** Athlete onboarding (table stakes); serial generation infrastructure
**Avoids:** `proxy.ts` breaking change (document convention); inline server actions anti-pattern; Turso Edge import variant (`@libsql/client` vs `/web`)

### Phase 2: Athlete Video Recorder
**Rationale:** The recorder is Kova's core differentiator and the most complex client-side component. It has one server-side dependency (Clerk userId for serial generation) which Phase 1 provides. Building it early surfaces the iOS limitation before anything else is built on top.
**Delivers:** Full recording pipeline (getUserMedia → canvas compositing → captureStream → MediaRecorder), countdown, 10-minute timer overlay, minute beep, auto-stop at 10:10, playback review, WebM export with `webm-fix-duration` post-processing, YouTube instructions screen with copy-to-clipboard.
**Addresses:** Canvas overlay recorder (P1); YouTube instructions + export (P1); PWA installability groundwork
**Avoids:** Screen Wake Lock (must be in initial implementation); WebM duration bug (apply fix before export); iOS capability check (show unsupported message before any recording UI); `facingMode` vs `deviceId` for rear camera on iOS

### Phase 3: Competition Management (Organizer)
**Rationale:** Competition and division records must exist in the DB before athletes can register entries. Organizer CRUD is the unblocking dependency for athlete entry submission and all downstream phases.
**Delivers:** Competition creation form (name, date, disciplines, divisions with gender + weight class), competition list, competition dashboard, organizer can manually add athlete entries.
**Addresses:** Competition creation (P1); weight/gender divisions (P1); manual entry addition (P1)
**Avoids:** Division schema correctness (divisions as first-class rows, not JSON arrays — enables clean leaderboard filtering)

### Phase 4: Athlete Entry Submission
**Rationale:** Athletes can now register for competitions and submit YouTube URLs. Depends on Phase 3 (competitions must exist) and Phase 1 (athlete must have a name and role).
**Delivers:** Competition browse/discovery, entry registration, YouTube URL submission, entry status tracking (`pending` → `submitted`).
**Addresses:** Athlete self-registration (P1); YouTube URL submission (P1)
**Avoids:** YouTube URL validation (basic format check before storing); entry uniqueness (one entry per competition per discipline per athlete)

### Phase 5: Judge Interface
**Rationale:** Judges can only score entries that have YouTube URLs. Depends on Phase 4 (submitted entries). Organizer judge assignment (`entries.assignedJudgeId`) is the last step before judging begins.
**Delivers:** Organizer judge assignment UI, judge entry list (assigned entries only), YouTube embed with IFrame API, tap counter (80×80px minimum tap target, 200ms debounce), score submission with confirmation step.
**Addresses:** Judge assignment (P1); judge interface with tap counter (P1); score submission (P1)
**Avoids:** YouTube autoplay on iOS (`mute=1&playsinline=1` required); YouTube IFrame API race with React hydration (use `next/dynamic` with `ssr: false`); IDOR on score submission (verify `assignedJudgeId === auth().userId` in DAL)

### Phase 6: Leaderboard and Results
**Rationale:** Leaderboard requires scored entries. This phase completes the competition lifecycle from submission to official results.
**Delivers:** Unofficial live leaderboard (segmented by division, sorted by repCount DESC), organizer publish action (transitions competition to `official` status), official results display.
**Addresses:** Live leaderboard (P1); official results publication (P1)
**Avoids:** Leaderboard query performance (add indexes on `entries.competition_id`, `entries.division_id`, `scores.entry_id` from day one); exposing raw Drizzle results to client (define DTO types)

### Phase 7: PWA Shell
**Rationale:** Can be added after core routes exist without affecting product functionality. Deferred to avoid complicating the dev setup during earlier phases.
**Delivers:** `app/manifest.ts` (Next.js built-in), `public/sw.js` (hand-rolled, cache-first for static assets), remove `next-pwa@5.6.0`, service worker registration in `instrumentation-client.ts`.
**Addresses:** PWA installability (P2)
**Avoids:** `next-pwa@5.6.0` with Next.js 16 (incompatible — remove the package); caching auth/YouTube/Clerk endpoints in the service worker; iOS standalone mode camera permission loss (document: recommend regular Safari tab for recording, not Add to Home Screen)

### Phase Ordering Rationale

- **Sequential dependency chain:** Each phase outputs data (DB records, auth identities, recordings, entries, scores) that the next phase consumes. No phase can be safely parallelized at the start of the project.
- **Recorder early:** The iOS limitation, Wake Lock requirement, and WebM duration fix all need real-device validation before competition management is built. Discovering iOS is unsupported late would require significant UX rework.
- **PWA last:** Service worker complexity can corrupt the dev environment if introduced too early. Manifest alone (installability) is low-risk and can be done whenever; full offline caching is not needed until the app is otherwise complete.
- **No global state library needed:** The recording state machine is local to `RecorderCanvas.tsx`. The rest of the app is server-component-first with server actions and DAL. Introducing Redux/Zustand would add bundle weight for no benefit.

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (Recorder):** iOS canvas.captureStream support status on iOS 18.4+ needs real-device validation before finalizing the "unsupported" message. The WebKit bug status is uncertain — field test a physical device before committing to the iOS-unsupported UX path.
- **Phase 5 (Judge Interface):** YouTube IFrame API integration details (loading, player initialization, iOS autoplay constraints) benefit from specific API review before implementation.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** DB schema, Drizzle setup, Clerk role guards — well-documented, established patterns; architecture file provides complete examples.
- **Phase 3 (Competition Management):** Standard server component forms with server actions + DAL pattern; no novel integrations.
- **Phase 4 (Entry Submission):** Standard form submission; architecture examples cover this pattern completely.
- **Phase 6 (Leaderboard):** Read-only server component with Drizzle join query; no novel patterns.
- **Phase 7 (PWA Shell):** Hand-rolled service worker pattern is well-documented; architecture file provides a complete working example.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack already installed and verified against Next.js 16 local docs. `next-pwa` removal confirmed against maintainer repo and Next.js issues. Serwist recommendation from official Next.js 16 PWA guide. |
| Features | MEDIUM-HIGH | KB sport conventions well-documented; CrossFit and Competition Corner patterns verified at HIGH confidence. KB federation-specific weight classes and rules are MEDIUM due to limited public documentation from IKMF/WKSF. |
| Architecture | HIGH | Patterns sourced from Next.js 16 local `node_modules/next/dist/docs/` directly. Clerk v7 type signatures verified. `proxy.ts` convention confirmed against local docs. DB schema design is conventional for this domain. |
| Pitfalls | HIGH | iOS `canvas.captureStream` confirmed unsupported via Can I Use (March 2026) and WebKit bug tracker. WebM duration issue is a known spec limitation. Wake Lock support table verified against MDN. `proxy.ts` convention verified against local docs. |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **iOS canvas.captureStream on iOS 18.4+ specifically:** Can I Use says "not supported" but the WebKit 18.4 release notes added WebM MediaRecorder. The exact state of `captureStream` on iOS 18.4+ requires a real-device test. If it works on 18.4+, the "unsupported" message should be version-conditional. Validate in Phase 2 before finalizing the unsupported-browser UX.
- **Blob download on iOS Safari:** Whether `URL.createObjectURL` + anchor click works for a recorded MP4/WebM Blob on iOS Safari is not definitively confirmed. Test this in Phase 2 alongside the captureStream check.
- **Clerk v7 breaking changes from prior versions:** The project has `@clerk/nextjs ^7.0.6` installed. The `clerkClient()` is now an async factory (not a static import). Verify against Clerk v7 changelog before writing any DAL metadata code in Phase 1.
- **Turso Edge import variant:** If any route ever uses Vercel Edge Runtime, `@libsql/client/web` must be used instead of `@libsql/client`. Verify the import path before deploying if Edge runtime is ever enabled. Standard Node.js serverless (Vercel default) uses `@libsql/client` — no issue for the default config.
- **KB federation weight class variations:** WKSF weight classes used as defaults (Men: 58/63/68/73/78/85/95/105/105+ kg; Women: 58/63/68/68+kg). These may vary by federation. Competition setup should allow organizers to define custom divisions rather than relying on hardcoded defaults.

## Sources

### Primary (HIGH confidence)
- Next.js 16 local docs (`node_modules/next/dist/docs/`) — App Router patterns, proxy.ts convention, PWA guide, data security guide, authentication guide
- Can I Use — Media Capture from DOM Elements (canvas.captureStream): https://caniuse.com/mediacapture-fromelement — iOS: Not Supported (March 2026)
- WebKit Blog — MediaRecorder API: https://webkit.org/blog/11353/mediarecorder-api/ — Safari MP4 support from iOS 14.3
- WebKit Blog — Safari 18.4: https://webkit.org/blog/16574/webkit-features-in-safari-18-4/ — WebM MediaRecorder added
- MDN — MediaRecorder API: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API
- MDN — Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- CrossFit Video Submission Best Practices: https://games.crossfit.com/article/video-submission-best-practices
- Competition Corner Features: https://about.competitioncorner.net/features
- JudgeMate Features: https://www.judgemate.com/en
- mat-sz/webm-fix-duration: https://github.com/mat-sz/webm-fix-duration
- Serwist getting started: https://serwist.pages.dev/docs/next/getting-started
- next-pwa abandoned (GitHub issue #503): https://github.com/shadowwalker/next-pwa/issues/503

### Secondary (MEDIUM confidence)
- WebKit Bug 181663 (canvas captureStream on iOS) — open, years old
- WebKit Bug 215884 (recurring camera permission prompts in PWA standalone mode)
- STRICH Knowledge Base — iOS PWA Camera Issues: https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa
- KB World League Video Submission Instructions — YouTube URL submission pattern
- WKSF weight classes and federation rules — weight class defaults
- LogRocket: Next.js 16 PWA with Serwist — confirmed working pattern

### Tertiary (LOW confidence)
- WebKit Bug 252465 (PWA getUserMedia black screen) — "fixed" but community reports persist through iOS 18.4.1; needs real-device validation
- iOS 18.4+ canvas.captureStream support — WebKit 18.4 release did not explicitly confirm captureStream fix; inference from MediaRecorder WebM support only

---
*Research completed: 2026-03-24*
*Ready for roadmap: yes*
