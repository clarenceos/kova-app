@AGENTS.md

<!-- GSD:project-start source:PROJECT.md -->
## Project

**Kova**

Kova is a PWA for online asynchronous kettlebell sport competitions. Athletes record their lifts in-app with authenticated overlays baked into the video, export and upload to YouTube, then submit the link. Judges watch the video, count reps, and submit scores. Organizers manage competitions and publish official results. Three roles — Athlete, Judge, Organizer.

**Core Value:** Authenticated video: every submission carries a verified timer, athlete name, discipline, and unique serial number baked in via canvas — no video can be judged without a Kova watermark, making results trustworthy without a referee present.

### Constraints

- **Tech stack**: Next.js 16 App Router — must follow current App Router conventions (not Pages Router)
- **Client components**: Camera, canvas, MediaRecorder, AudioContext all require `'use client'` — recording flow is entirely client-side
- **Clerk metadata**: Athlete name stored in `publicMetadata.name` via server action — no separate users table needed initially
- **Mobile-first**: Judge and recorder interfaces are used on phones/tablets; desktop is secondary
- **No third-party recording libs**: Native browser APIs only — keeps bundle small, avoids licensing issues
- **Don't touch**: `app/layout.tsx` and `proxy.ts` — existing auth and layout must not be modified
<!-- GSD:project-end -->

<!-- GSD:stack-start source:research/STACK.md -->
## Technology Stack

## Recommended Stack
### Core Technologies (Already Chosen)
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.2.1 | App framework | Already chosen. App Router is the correct choice — recording flow is entirely `'use client'` so no SSR conflict. Pages Router would also work but App Router is the current standard. |
| React | 19.2.4 | UI library | Already chosen. Concurrent rendering is irrelevant for the recorder (synchronous canvas loop), but no reason to change. |
| Clerk | ^7.0.6 | Auth + user metadata | Already chosen. `publicMetadata.name` pattern for athlete name avoids a users table. `auth()` server-side access works cleanly in Server Components and Server Actions. |
| Turso + Drizzle ORM | drizzle ^0.45.1, @libsql/client ^0.17.2 | Database | Already chosen. Correct for this use case — sqlite-compatible, edge-friendly, Vercel works without a VPN/connection proxy. |
| shadcn/ui (Nova/Radix) | shadcn ^4.1.0, radix-ui ^1.4.3 | UI components | Already chosen. Correct for a sports app needing accessible, unstyled-first primitives. |
| Tailwind CSS | ^4 | Styling | Already chosen. v4 with @tailwindcss/postcss is the current standard. |
| Vercel | — | Deployment | Already chosen. Native Next.js support. No extra config needed for the recording flow since it is entirely client-side. |
### PWA Layer
| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| `app/manifest.ts` (Next.js built-in) | Next.js 16 built-in | Web app manifest | Next.js 16 generates `/manifest.json` from `app/manifest.ts`. No extra library. Use this over any third-party option for manifest generation. |
| Serwist | `@serwist/next` ^9.0.0, `serwist` latest | Service worker (offline caching, installability) | `next-pwa` (currently installed) is **abandoned** — last release December 2022, multiple open breaking-bug issues filed against Vercel's own Next.js docs. Serwist is the official successor and is referenced in Next.js 16 official docs under "Offline Support." |
### Recording Layer (Browser APIs — No Libraries)
| API | Purpose | Notes |
|-----|---------|-------|
| `navigator.mediaDevices.getUserMedia()` | Camera stream acquisition | Must be called inside a user gesture on first use. Re-use the stream across the recording session; do not call repeatedly. |
| `HTMLCanvasElement` + `requestAnimationFrame` | Overlay compositing | Draw camera frame + overlay text every rAF tick. Canvas must be the same resolution as the desired output (e.g., 1280×720). |
| `HTMLCanvasElement.captureStream(30)` | Convert canvas to MediaStream | 30 fps matches project spec. Pass the resulting stream directly to MediaRecorder. |
| `MediaRecorder` | Record the canvas stream | Use `isTypeSupported()` to select format — see container strategy below. |
| `AudioContext` + `OscillatorNode` | Beep sounds (minute marker, countdown) | Must resume AudioContext on first user gesture. iOS Safari blocks audio until user interaction. |
| `Blob` + `URL.createObjectURL()` | Export/download | Create an `<a>` element, set `href` to blob URL and `download` attribute, programmatically click. Works on both iOS Safari and Android Chrome. |
### Supporting Libraries
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `next-pwa` | — | **DO NOT USE** — see "What NOT to Use" | — |
| `@serwist/next` | ^9.0.0 | Service worker plugin for Next.js | When adding offline caching and PWA installability |
| `serwist` | latest | Service worker runtime | Peer dep of `@serwist/next` |
## Browser Compatibility Matrix: Canvas Recording
| Browser / Platform | MediaRecorder | canvas.captureStream() | canvas → MediaRecorder video | Container |
|---|---|---|---|---|
| Chrome (Android) 49+ | YES | YES | YES — works reliably | WebM (VP8/VP9) |
| Chrome (desktop) 49+ | YES | YES | YES — works reliably | WebM (VP8/VP9) |
| Chrome (desktop) 130+ | YES | YES | YES | Also MP4/H264 |
| Firefox 29+ | YES | YES | YES | WebM (VP8/VP9) |
| Safari (macOS) 14.1+ | YES | YES (partial, bugs fixed ~2022) | MEDIUM — generally works | MP4/H264/AAC |
| Safari (iOS) 14.3–18.3 | YES (MP4 only) | Documented bugs (WebKit #181663, #229611, #252465) | UNRELIABLE — blank video, freeze on stop, black preview | MP4/H264/AAC |
| Safari (iOS) 18.4+ | YES | Not explicitly confirmed fixed | UNKNOWN — needs real-device testing | WebM (VP8/VP9) added in 18.4, MP4 still supported |
## Container Format Strategy
### The Problem
- **WebM** (VP8/VP9): Chrome/Firefox/Android native. iOS Safari pre-18.4 does not support WebM at all — neither recording nor playback in Safari.
- **MP4** (H264/AAC): iOS Safari's native format for MediaRecorder since iOS 14.3. Chrome added MP4 MediaRecorder support in Chrome 130+ (late 2024). Firefox does not support MP4 MediaRecorder.
- **WebM with Safari 18.4+**: Finally supported for recording, but canvas.captureStream() reliability is still uncertain.
### Recommended Approach
- The project spec says export as `.webm`. This is correct for Chrome/Android.
- On Safari (iOS pre-18.4), the recorded container will be MP4 regardless of what you specify. The file will actually be an MP4 even if you name it `.webm` — this is a known Safari quirk (iOS 12 reports `video/webm` but produces `mp4[h.264/aac]`).
- **Decision required:** Either (a) export whatever the browser produces and name it appropriately, or (b) accept `.webm` for Chrome/Android and `.mp4` for iOS Safari, making the filename dynamic based on detected MIME type.
- Recommendation: Use dynamic filename. `kova-[discipline]-[name]-[serial].webm` on Chrome, `kova-[discipline]-[name]-[serial].mp4` on iOS Safari. Both are uploadable to YouTube.
## PWA Manifest Requirements
- iOS Safari does not show the automatic install prompt (`beforeinstallprompt` is not supported on iOS). Users must manually use Share > Add to Home Screen.
- `display: 'standalone'` is required for the standalone experience but it is this mode that has historically caused camera permission issues. Latest iOS (18.4+) appears to have improved but is not fully reliable.
- Camera permission is NOT persisted between sessions on iOS PWA standalone mode — users may be re-prompted on each launch.
## getUserMedia in Next.js App Router
## AudioContext Beep Sounds
## What NOT to Use
| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `next-pwa` (shadowwalker/next-pwa) | Abandoned since Dec 2022. Breaks with Next.js 15+. Filed as a bug against Vercel's own docs (next.js issue #43439). Already installed — remove it. | Serwist (`@serwist/next`) or Next.js built-in manifest only |
| `RecordRTC` | Large polyfill library that adds ~200KB. Project constraint is native APIs only. Also has known issues with canvas streams on Safari. | Native `MediaRecorder` |
| `opus-media-recorder` (WebAssembly polyfill) | WASM overhead, complex setup, not needed for video-first recording. Useful for audio-only cross-browser Opus, not this use case. | Native `MediaRecorder` with MIME type detection |
| `gif.js` or animated GIF export | Cannot carry audio. Enormous file sizes for 10-minute sets. | `MediaRecorder` even if iOS support is imperfect |
| `navigator.mediaDevices.getUserMedia` in Server Component | Throws at build time — window/navigator don't exist in Node.js | `'use client'` component only |
| Calling `getUserMedia` on every page render/mount | iOS re-prompts permission every time a new getUserMedia call is made | Acquire once, store in `useRef`, reuse |
| `OffscreenCanvas.captureStream()` | No browser supports this combination as of early 2026 | Regular `HTMLCanvasElement.captureStream()` |
## Alternatives Considered
| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Serwist (`@serwist/next`) | Next.js manifest only (no service worker) | If offline support is not needed. For Kova the recorder needs to work without connectivity during recording. Use Serwist. |
| Next.js built-in `app/manifest.ts` | `next-pwa` manifest generation | Never use `next-pwa` — see above |
| Dynamic filename based on detected MIME type | Always export `.webm` | If you decide iOS support is out of scope for v1 — `.webm` always on Chrome/Android |
| `display: standalone` in manifest | `display: browser` | If iOS camera bugs are blocking — remove `apple-mobile-web-app-capable` and let users run in Safari tab. Loses installed-app feel but camera is more reliable. |
## Version Compatibility
| Package | Version in project | Compatible With | Notes |
|---------|--------------------|-----------------|-------|
| `next-pwa` | ^5.6.0 | Next.js ≤14 | **Incompatible with Next.js 16.** Remove this package. |
| `@serwist/next` | ^9.0.0 (to install) | Next.js 13–16 | Requires `--webpack` flag for build. Dev can use Turbopack. |
| `@clerk/nextjs` | ^7.0.6 | Next.js 15/16 | Version 7 supports App Router. Check Clerk docs for breaking changes from v5→v6→v7. |
| `drizzle-orm` | ^0.45.1 | `@libsql/client` ^0.17 | Current stable pairing. No known compatibility issues. |
## Installation Changes
# Remove abandoned package
# Add Serwist for service worker / offline support
# No other new packages needed — recording uses native browser APIs
## Sources
- [WebKit blog: MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/) — Safari 14.3+ iOS support, MP4/H264/AAC codec list — HIGH confidence
- [WebKit blog: Safari 18.4 features](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) — WebM MediaRecorder added in iOS 18.4 — HIGH confidence
- [MDN: MediaRecorder](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API) — General API reference — HIGH confidence
- [Can I Use: MediaRecorder](https://caniuse.com/mediarecorder) — Coverage stats, iOS 14.5+ full support — HIGH confidence
- [Next.js official PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — Manifest setup, Serwist recommendation, no third-party library needed — HIGH confidence
- [WebKit bug #229611](https://bugs.webkit.org/show_bug.cgi?id=229611) — canvas captureStream blank video, resolved as duplicate of #230613 (fixed 2022) — MEDIUM confidence (marked resolved but field reports persist)
- [WebKit bug #252465](https://bugs.webkit.org/show_bug.cgi?id=252465) — PWA getUserMedia video element black screen, nominally fixed but still reported through iOS 18.4.1 — LOW confidence (still actively complained about)
- [media-codings.com: Cross-browser recording](https://media-codings.com/articles/recording-cross-browser-compatible-media) — Format compatibility, WebM VP8 now cross-browser since Safari 18.4 — MEDIUM confidence
- [next-pwa abandoned (GitHub issue #503)](https://github.com/shadowwalker/next-pwa/issues/503) — Last release Dec 2022 — HIGH confidence
- [Serwist getting started](https://serwist.pages.dev/docs/next/getting-started) — `@serwist/next` installation, webpack requirement — HIGH confidence
- [LogRocket: Next.js 16 PWA with Serwist](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) — Confirmed working pattern for Next.js 16 — MEDIUM confidence
- [STRICH knowledge base: iOS PWA camera issues](https://kb.strich.io/article/29-camera-access-issues-in-ios-pwa) — Permission not persisted, standalone mode reliability — MEDIUM confidence
## Critical Open Questions for Phase-Specific Research
<!-- GSD:stack-end -->

<!-- GSD:conventions-start source:CONVENTIONS.md -->
## Conventions

Conventions not yet established. Will populate as patterns emerge during development.
<!-- GSD:conventions-end -->

<!-- GSD:architecture-start source:ARCHITECTURE.md -->
## Architecture

Architecture not yet mapped. Follow existing patterns found in the codebase.
<!-- GSD:architecture-end -->

<!-- GSD:workflow-start source:GSD defaults -->
## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:
- `/gsd:quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd:debug` for investigation and bug fixing
- `/gsd:execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.
<!-- GSD:workflow-end -->

<!-- GSD:profile-start -->
## Developer Profile

> Profile not yet configured. Run `/gsd:profile-user` to generate your developer profile.
> This section is managed by `generate-claude-profile` -- do not edit manually.
<!-- GSD:profile-end -->
