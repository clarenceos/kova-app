# Pitfalls Research

**Domain:** PWA with canvas-based video recording, authenticated overlays, judge interface, competition management
**Researched:** 2026-03-24
**Confidence:** HIGH (authoritative sources: WebKit bug tracker, Can I Use, Next.js 16 local docs, Clerk docs, MDN)

---

## Critical Pitfalls

### Pitfall 1: canvas.captureStream() Is Not Supported on iOS Safari

**What goes wrong:**
The entire recording pipeline — `getUserMedia → draw to canvas → canvas.captureStream(30) → MediaRecorder` — silently fails on iOS Safari. `canvas.captureStream()` returns `null` or throws on iOS, so `MediaRecorder` never receives a valid stream. The athlete sees the camera preview but gets no recorded file, or a blank/empty file, on any iPhone or iPad.

**Why it happens:**
Can I Use (confirmed March 2026) lists iOS Safari as "not supported" for the Media Capture from DOM Elements API (`canvas.captureStream`). This is not a bug pending fix — it is an unimplemented API in WebKit on iOS across all tested versions through iOS 26.4. WebKit bug 181663 (canvas captureStream) has been open for years. Developers assume Safari's MediaRecorder support means the full pipeline works; it does not.

**How to avoid:**
- Call `canvas.captureStream` inside a `try/catch` and check for `null` before constructing `MediaRecorder`
- Add a browser capability check on recorder component mount: `if (!HTMLCanvasElement.prototype.captureStream) { showIOSUnsupportedMessage() }`
- Display a clear "iOS is not supported for recording" message with a fallback: direct the athlete to use Chrome on Android or a desktop browser
- Do not attempt silent degradation — the Kova authentication model (baked overlays) cannot be compromised, so a fake recording is worse than no recording
- Document iOS as explicitly unsupported for the recorder in Phase 1, and track WebKit progress for a potential Phase N iOS solution

**Warning signs:**
- Canvas preview works but exported file is blank or zero-length
- `MediaRecorder.state` never reaches `"recording"` on iOS
- `ondataavailable` fires but `event.data.size === 0`

**Phase to address:** Phase 1 (Athlete Video Recorder) — add capability detection and clear messaging before any recording UI is shown

---

### Pitfall 2: iOS PWA Standalone Mode Breaks Camera Permissions

**What goes wrong:**
When Kova is installed as a PWA (Add to Home Screen), iOS Safari does not persist camera permissions between sessions. The athlete must re-grant camera access every time they open the app. On some iOS versions, the permission prompt re-fires on every route change that triggers a URL hash change (WebKit bug 215884). The "Install to Home Screen" affordance that improves the PWA experience actively worsens the camera permission experience.

**Why it happens:**
WebKit's standalone PWA mode (triggered by `apple-mobile-web-app-capable`) runs outside Safari's permission persistence model. Permissions granted in standalone mode are not saved per-origin the way Safari browser permissions are. Bug 215884 remains open as of April 2025.

**How to avoid:**
- Do not include `apple-mobile-web-app-capable` meta tag in Phase 1 if iOS recording support is intended — this forces the app to run in Safari where permissions persist, while still allowing a Home Screen bookmark
- Use a single-page recording route without hash-based navigation to minimize re-prompts
- Add a `visibilitychange` listener to gracefully re-request `getUserMedia` when the app returns from background: `document.addEventListener('visibilitychange', () => { if (!document.hidden) reacquireStream() })`
- Show a contextual permission UI (not the browser's native prompt) that explains why camera access is needed before calling `getUserMedia`

**Warning signs:**
- Camera works in desktop Chrome but shows repeated permission dialogs on iOS Home Screen
- Camera stream becomes a frozen frame after the athlete backgrounds the app briefly
- `getUserMedia` throws `NotAllowedError` on subsequent calls within the same session

**Phase to address:** Phase 1 (Athlete Video Recorder) — PWA manifest and permission UX must be designed with iOS limitations in mind from the start

---

### Pitfall 3: WebM Recordings Have No Duration Metadata and Cannot Seek

**What goes wrong:**
`MediaRecorder` with `video/webm` mimeType produces files where the duration field in the container is missing or set to `Infinity`. The exported WebM file plays from start to finish fine, but scrubbing/seeking is broken in most media players and especially in the YouTube review step. `<video>` elements cannot display a correct progress bar. The 10-minute set recording looks broken to athletes reviewing their export.

**Why it happens:**
WebM's Matroska container requires duration metadata at the start of the file. MediaRecorder writes chunks incrementally and does not go back to fill in the duration header when recording stops. This is a known, unfixed limitation of the MediaRecorder spec for live recordings.

**How to avoid:**
- Use the `webm-fix-duration` npm package (TypeScript fork: `mat-sz/webm-fix-duration`) to post-process the Blob before offering the download. It appends the missing duration/seek metadata in-browser with no server round-trip
- Keep `timeslice` calls to `MediaRecorder.start(1000)` (1-second chunks) so chunk data is available to calculate duration
- Track elapsed recording time independently via `Date.now()` and pass it to the fix library's duration parameter

**Warning signs:**
- Exported WebM shows `duration: Infinity` in `video.duration`
- Athlete cannot seek backwards during in-app playback review
- YouTube upload shows correct file size but wrong video length

**Phase to address:** Phase 1 (Athlete Video Recorder) — apply duration fix in the export/download step before the file is offered to the athlete

---

### Pitfall 4: Screen Dims / Locks During a 10-Minute Recording Set

**What goes wrong:**
iOS and Android will dim the screen and eventually lock the device if no touch input occurs. A kettlebell athlete recording a 10-minute set provides no touch input after pressing Start. When the screen locks, the browser tab is backgrounded. On Chrome for Android, the canvas `requestAnimationFrame` loop is throttled to near-zero fps. The overlay frames stop being drawn, `captureStream` stops pushing frames, and `MediaRecorder` may output an audio-only or frozen-frame video for the last several minutes of the set.

**Why it happens:**
`requestAnimationFrame` is tied to the display refresh. Browsers throttle it to ~1fps or stop it entirely for backgrounded tabs (Firefox bug 1344524 documents this). No touch events occur during a competition set, so OS screen-lock timers fire normally.

**How to avoid:**
- Request the Screen Wake Lock API immediately when recording starts: `const lock = await navigator.wakeLock.request('screen')`
- Handle the case where wake lock is released automatically (e.g., when the user switches apps): listen for `lock.addEventListener('release', ...)` and show a prominent in-app warning: "Screen lock detected — recording may be affected"
- Note: Wake Lock API has been fully supported in Safari since iOS 16.4, but had a bug in installed PWA mode until iOS 18.4. Test in both Safari browser mode and PWA standalone mode
- As a fallback, play a silent audio track via `AudioContext` to prevent some browsers from aggressively throttling the tab (this is a last resort and may not be needed in 2026)

**Warning signs:**
- Test recordings made with the phone screen locked show a still frame or audio-only portion
- `document.visibilityState === 'hidden'` fires during what should be an active recording
- `wakeLock.request()` rejects on older iOS devices

**Phase to address:** Phase 1 (Athlete Video Recorder) — Wake Lock must be in the initial recording implementation, not added later as an afterthought

---

### Pitfall 5: Next.js 16 Uses `proxy.ts`, Not `middleware.ts` — Clerk Integration Must Match

**What goes wrong:**
Training data and most tutorials show Clerk integrated via `middleware.ts`. In Next.js 16, `middleware.ts` is deprecated and renamed to `proxy.ts`. The exported function must be named `proxy`, not `middleware`. If a developer copies Clerk's documented setup using the old convention, the authentication proxy will not run, leaving all routes unprotected and Clerk's `auth()` calls returning `null` in server components.

**Why it happens:**
Next.js 16.0.0 renamed the file convention (confirmed in local `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`). The existing `proxy.ts` in this project is already correctly set up — it uses `clerkMiddleware()` as a default export which is valid (the proxy file supports both named `proxy` export and default export). The critical risk is that any future developer adding or modifying auth configuration may reference outdated Next.js 14/15 Clerk documentation.

**How to avoid:**
- The existing `proxy.ts` is correctly configured — do not rename it back to `middleware.ts`
- When referencing Clerk docs, verify the Next.js version context before applying patterns
- Never rely on `proxy.ts` (the Clerk middleware check) as the sole authorization gate — always call `auth()` inside each Server Function that touches sensitive data (Clerk docs explicitly state this, and Next.js proxy docs note that Server Functions are POST requests to their route, which the proxy matcher might not cover)
- Server Functions (`'use server'`) must individually call `const { userId } = await auth(); if (!userId) throw new Error('Unauthorized')`

**Warning signs:**
- `auth()` returns `null` in server components on protected routes despite the proxy appearing to work
- Routes that should require login are accessible without a session cookie
- Console shows `clerkMiddleware` not running (no Clerk debug headers on requests)

**Phase to address:** Phase 1 (foundation) — auth is already set up; document the proxy.ts convention prominently so it is not accidentally broken in later phases

---

### Pitfall 6: Server Functions Defined Inside Client Components Lose Request Context

**What goes wrong:**
When a `'use server'` function is defined inline within a `'use client'` component file (rather than in a separate `actions.ts`), Clerk's `auth()` may return empty data because request headers are not forwarded. The athlete's name lookup or score submission silently fails or throws a generic auth error.

**Why it happens:**
Clerk's documentation explicitly warns: "When Server Actions are defined inside Client Components, request headers are not available by default because Client Components run in the browser." The `auth()` helper reads Clerk's session token from HTTP headers, which are only present in a true server-side execution context.

**How to avoid:**
- Define all Clerk-authenticated Server Functions in dedicated `app/actions/` files with `'use server'` at the top of the file
- Import and pass them as props to Client Components — never define `'use server'` functions inline within a `'use client'` file
- Pattern: `const { userId } = await auth()` at the top of every mutation server function, before any DB access

**Warning signs:**
- `auth()` returns `{ userId: null }` inside a server action that "should" be authenticated
- Calls to `currentUser()` return `null` despite the user being logged in on the frontend
- Works in development but fails in production (different execution environments surface the header issue differently)

**Phase to address:** Phase 1 (onboarding — athlete name write to Clerk publicMetadata) — this is the first server action; establish the correct pattern here to avoid propagating the anti-pattern

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip `webm-fix-duration` post-processing | Simpler export code | Athletes cannot seek in exported video; YouTube shows wrong duration | Never — affects the core product |
| Inline `'use server'` in client components | Less boilerplate | Auth silently breaks; security hole | Never |
| Rely solely on `proxy.ts` for auth | Simpler code | Any server function is callable without auth check | Never |
| Skip Wake Lock API | Less code | Recordings broken for athletes who look away for >30s | Never |
| Skip browser capability check for captureStream | Faster build | iOS athletes get blank export with no explanation | Never |
| Use `facingMode: 'environment'` directly | One line of code | Rear camera silently fails on many iOS devices | MVP only if iOS recording is not supported anyway |
| `requestAnimationFrame` without throttle guard | Simplest draw loop | Extra frames drawn but not pushed to stream; wasted CPU | Acceptable in Phase 1, optimize later |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Clerk + Next.js 16 | Copying `middleware.ts` patterns from Clerk docs | Use `proxy.ts` (already exists); call `auth()` inside every server function |
| Clerk `publicMetadata` write | Calling `clerkClient.users.updateUser()` from a client component | Call from a `'use server'` function in a dedicated actions file; Clerk Backend SDK is server-only |
| Turso + Drizzle + Edge | Using `@libsql/client` (Node.js) in a Vercel Edge function | Import `@libsql/client/web` for Edge runtimes; standard `@libsql/client` for Node.js serverless |
| Drizzle migrations | Running `drizzle-kit push` against production directly | Generate migrations first (`db:generate`), apply separately (`db:migrate`); skipping generation causes schema drift |
| YouTube iframe API | Loading `youtube-iframe-api` script in a Server Component | Script must load in a Client Component; YouTube's global `YT` object only exists in the browser |
| YouTube iframe on iOS | Using `autoplay=1` without `mute=1` and `playsinline=1` | Always include `mute=1&playsinline=1` in the embed URL; iOS blocks unmuted autoplay unconditionally |
| MediaRecorder mimeType | Using `video/webm` without runtime check | Call `MediaRecorder.isTypeSupported('video/webm;codecs=vp9')` first; Safari 18.4+ supports webm but older Safari uses `video/mp4` |
| `getUserMedia` rear camera | Using `facingMode: 'environment'` on iOS | Use `enumerateDevices()` to get the rear camera `deviceId`, then pass `{ video: { deviceId: { exact: rearCameraId } } }` |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| rAF loop draws every frame but stream doesn't need it | CPU pegged at 100% on mid-range Android; battery drain during 10-min set | Throttle draw calls: only call `drawImage` if a new camera frame is available; use `video.requestVideoFrameCallback()` where supported | Constant on all devices; worse on thermal-throttled mid-range phones |
| Accumulating `Blob` chunks without releasing | Memory grows ~2–3 MB/min at 720p; after 10 min = ~20–30 MB in-memory Blob | Use `timeslice` (e.g., 1000ms) in `MediaRecorder.start()` and collect chunks in an array; concatenate only at stop | Not a crash risk at 10 min on modern phones, but could cause jank on 2–3 GB RAM devices with other apps open |
| Drawing full-resolution canvas at 1920×1080 | 60fps draw ops at 2MP resolution is GPU-intensive; overlay text renders slowly | Cap canvas resolution at 1280×720 (720p) — adequate for competition judging and well within 720p YouTube quality | On all devices if 1080p is used; especially bad on Safari which has stricter canvas memory limits |
| Single Turso connection per request in serverless | No connection reuse; latency spikes on leaderboard queries | Create the Drizzle client at module scope (outside request handlers) to enable connection reuse in warm serverless instances | Not a problem at low request volume; noticeable at competition time with many simultaneous judge queries |
| YouTube iframe loaded in document body without lazy init | YT iframe API's `onYouTubeIframeAPIReady` races with React hydration | Use `next/dynamic` with `ssr: false` for any component that instantiates `YT.Player`; initialize only after `window.YT` is confirmed ready | On every page load; timing errors appear intermittently depending on network speed |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Trusting the serial number in the video overlay as tamper-proof without server-side records | An athlete could record with a different app, manually overlay a fake serial, and submit | Store serials server-side at generation time; when a judge reviews, validate that the submitted serial exists in the DB and matches the athlete/discipline/date |
| Returning raw Drizzle query results from server functions to the client | Exposes database column names, internal IDs, and potentially sensitive fields | Define explicit DTO types; only return the fields the UI needs |
| Judge accessing another judge's assigned entries | Horizontal privilege escalation in judge interface | In every server function that returns entry data, verify `auth().userId === assignedJudgeId` before returning |
| Organizer modifying another organizer's competition | If multiple organizers exist, cross-org modification is possible without ownership checks | Add `createdBy` column to competitions; verify ownership in all organizer server functions |
| Missing auth check in score submission server function | Any authenticated user (athlete) could submit a score for any entry by calling the server function directly | Check `userRole === 'judge'` and `assignedEntryId === entryId` in the score submission server function |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| No countdown visual before recording starts | Athlete is not ready; first seconds of set are wasted; timer and recording are misaligned | Show a prominent 3-2-1 countdown with audio beep; do not start `MediaRecorder` or the timer until countdown completes |
| No persistent recording indicator | Athlete is unsure if recording is active; may stop early thinking it failed | Show a pulsing red dot + elapsed time throughout the set; never hide the recording state indicator |
| Offering download before in-app playback review | Athlete has no way to verify the overlay baked in correctly before uploading to YouTube | Always show the recorded video in a `<video>` element first; download button appears only after review |
| Timer drifting from real elapsed time due to rAF throttle | Overlay timer shows wrong time if tab is briefly backgrounded; video and timer are desynchronized | Drive the overlay timer from `Date.now() - recordingStartTime` on each frame draw, not from a frame counter |
| Rep counter tap target too small on mobile | Judge misses taps or double-counts during fast-paced sets | Minimum tap target for rep counter: 80×80px; add 200ms debounce to prevent accidental double-taps |
| No "copy to clipboard" confirmation for YouTube description | Athlete pastes the wrong thing; YouTube description lacks required metadata | Show a "Copied!" toast for 2 seconds after clipboard write; pre-fill all fields including serial number |

---

## "Looks Done But Isn't" Checklist

- [ ] **Canvas recorder on iOS:** Appears to work (camera preview loads) but `canvas.captureStream` is not supported — verify `captureStream` is called successfully and `MediaRecorder.state` reaches `"recording"` before marking the recorder feature complete
- [ ] **WebM export seeking:** Video plays from start to end correctly but duration shows `Infinity` and seeking is broken — verify `video.duration` is a finite number on the exported Blob before marking export complete
- [ ] **Wake Lock during recording:** Recording works in a 30-second test but fails at 5 minutes when the screen auto-dims — test with screen timeout set to 30 seconds and verify the wake lock re-acquires after visibility events
- [ ] **Clerk auth in server functions:** Server function appears to work in development (dev mode may be more permissive with headers) but auth is null in production — verify `auth()` returns a non-null `userId` in a production build before shipping
- [ ] **Rear camera lock:** Front/rear camera selector appears to work on desktop but silently falls back to front camera on iOS — test on a physical iPhone with the rear camera explicitly selected; verify `facingMode` vs `deviceId` approach
- [ ] **Rep counter accuracy under rapid tapping:** Single-tap counting works but rapid tapping produces duplicate counts — test with >3 taps per second and verify the debounce prevents over-counting
- [ ] **YouTube embed autoplay on iOS:** Video embed loads and plays in Chrome desktop but stalls on iOS Safari — test with `mute=1&playsinline=1` parameters and verify playback starts without user interaction for the judge review flow
- [ ] **Score submission authorization:** Judge can submit a score — but can they submit a score for an entry not assigned to them? Test by calling the server action with a different entry ID

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| iOS captureStream discovered after launch | HIGH | Ship a clear "Record on Chrome/Android or Desktop" message; build iOS path (record native camera → upload video → extract frames for overlay baking) — this is a significant separate feature |
| WebM seeking bug discovered after athletes export | LOW | Add `webm-fix-duration` post-processing to export step; all future exports are fixed; existing athlete exports need manual re-recording |
| Wake Lock omission causing bad recordings | MEDIUM | Add Wake Lock to existing recorder component; communicate to athletes to re-record any sets where the screen locked |
| Clerk auth missing from server functions | HIGH | Audit every server function; add auth checks; redeploy; if any unauthorized submissions were made they must be reviewed manually |
| Middleware renamed back to `middleware.ts` | LOW | Rename back to `proxy.ts`; redeploy; routes were unprotected during the window — review logs for suspicious access |
| WebM mimeType not checked causing Safari MP4 recording | LOW | Add runtime mimeType detection; Safari 18.4+ actually supports webm, so the risk is mainly older Safari versions |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| canvas.captureStream not on iOS | Phase 1 (Recorder) | Capability check shows correct "unsupported" message on a real iPhone before any recording attempt |
| iOS PWA camera permission loss | Phase 1 (Recorder) | Test camera re-acquisition after backgrounding app on a real iPhone; no repeated prompts in Safari mode |
| WebM no duration metadata | Phase 1 (Recorder) | Exported file has finite `video.duration`; scrubbing works in browser `<video>` element |
| Screen lock during recording | Phase 1 (Recorder) | Test with 30s screen timeout; wake lock prevents dim; if lock occurs, warning message appears |
| proxy.ts / Clerk auth architecture | Phase 1 (Foundation) | Every server function that mutates data throws 401 when called without a valid Clerk session |
| Server functions defined in client components | Phase 1 (Onboarding) | All server functions are in `app/actions/` files; zero inline `'use server'` inside `'use client'` files |
| WebM mimeType not checked | Phase 1 (Recorder) | `MediaRecorder.isTypeSupported()` called before recorder init; graceful error if no supported type found |
| Rear camera iOS facingMode | Phase 1 (Recorder) | Camera lock works correctly on a physical iPhone using `deviceId` approach |
| Wake Lock in PWA vs Safari mode | Phase 1 (Recorder) | Document iOS 18.4 requirement; test in both modes |
| YouTube embed autoplay on iOS | Phase 2 (Judge) | Video plays without manual interaction on a real iPhone in the judge interface |
| Score submission authorization | Phase 2 (Judge) | Attempting to submit score for unassigned entry returns 403 |
| Turso edge import variant | Phase 1 (Foundation) | DB queries work in Vercel Edge-adjacent environment; no import errors in build |

---

## Sources

- WebKit Bug 181663 (canvas captureStream on iOS): https://bugs.webkit.org/show_bug.cgi?id=181663
- WebKit Bug 229611 (MediaRecorder + canvas captureStream blank video — resolved duplicate): https://bugs.webkit.org/show_bug.cgi?id=229611
- WebKit Bug 215884 (recurring camera permission prompts in standalone PWA): https://bugs.webkit.org/show_bug.cgi?id=215884
- Can I Use — Media Capture from DOM Elements (canvas.captureStream): https://caniuse.com/mediacapture-fromelement — iOS Safari: Not Supported
- Can I Use — MediaRecorder API: https://caniuse.com/mediarecorder
- WebKit Blog — MediaRecorder API (Safari MP4 support): https://webkit.org/blog/11353/mediarecorder-api/
- STRICH Knowledge Base — iOS PWA Camera Issues: https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa
- addpipe.com — Dealing With Huge MediaRecorder Chunks: https://blog.addpipe.com/dealing-with-huge-mediarecorder-slices/
- mat-sz/webm-fix-duration (TypeScript): https://github.com/mat-sz/webm-fix-duration
- yusitnikov/fix-webm-duration: https://github.com/yusitnikov/fix-webm-duration
- MDN — Screen Wake Lock API: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
- web.dev — Screen Wake Lock supported in all browsers: https://web.dev/blog/screen-wake-lock-supported-in-all-browsers
- Next.js 16 local docs — proxy.ts file convention: `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`
- Next.js 16 local docs — use client directive: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-client.md`
- Next.js 16 local docs — use server directive: `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-server.md`
- Next.js 16 local docs — lazy loading (ssr: false): `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md`
- Clerk Docs — Server Actions auth pattern: https://clerk.com/docs/reference/nextjs/app-router/server-actions
- Turso + Drizzle official docs: https://docs.turso.tech/sdk/ts/orm/drizzle
- Drizzle ORM connect-turso: https://orm.drizzle.team/docs/connect-turso
- MDN — requestAnimationFrame throttling: https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame
- addpipe.com — getUserMedia video constraints: https://blog.addpipe.com/getusermedia-video-constraints/
- progressier.com — front/back camera stream (deviceId workaround): https://progressier.com/choose-front-back-camera-stream
- Google Developers — YouTube Embedded Players and Player Parameters: https://developers.google.com/youtube/player_parameters

---
*Pitfalls research for: PWA canvas-based video recorder + judge interface + competition management (Kova)*
*Researched: 2026-03-24*
