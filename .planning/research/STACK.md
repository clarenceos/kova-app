# Stack Research

**Domain:** Sports competition PWA with canvas-based video recording
**Researched:** 2026-03-24
**Confidence:** MEDIUM — core stack decisions are HIGH; iOS Safari canvas/recording compatibility is actively evolving and some claims are MEDIUM due to divergent reports

---

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

**Important:** Serwist requires webpack. Next.js 16 defaults to Turbopack. Build scripts must use `next build --webpack` when PWA is needed. Development can use Turbopack (`next dev --turbopack`) but service worker will not be active during dev.

### Recording Layer (Browser APIs — No Libraries)

Per PROJECT.md constraint: native browser APIs only. This is the correct call.

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

---

## Browser Compatibility Matrix: Canvas Recording

This is the highest-risk area of the project. Research was conducted against official WebKit blog posts, MDN, and WebKit bug tracker.

| Browser / Platform | MediaRecorder | canvas.captureStream() | canvas → MediaRecorder video | Container |
|---|---|---|---|---|
| Chrome (Android) 49+ | YES | YES | YES — works reliably | WebM (VP8/VP9) |
| Chrome (desktop) 49+ | YES | YES | YES — works reliably | WebM (VP8/VP9) |
| Chrome (desktop) 130+ | YES | YES | YES | Also MP4/H264 |
| Firefox 29+ | YES | YES | YES | WebM (VP8/VP9) |
| Safari (macOS) 14.1+ | YES | YES (partial, bugs fixed ~2022) | MEDIUM — generally works | MP4/H264/AAC |
| Safari (iOS) 14.3–18.3 | YES (MP4 only) | Documented bugs (WebKit #181663, #229611, #252465) | UNRELIABLE — blank video, freeze on stop, black preview | MP4/H264/AAC |
| Safari (iOS) 18.4+ | YES | Not explicitly confirmed fixed | UNKNOWN — needs real-device testing | WebM (VP8/VP9) added in 18.4, MP4 still supported |

**Confidence: MEDIUM for iOS Safari.** Safari 18.4 (released March 31, 2025, ships with iOS 18.4) added WebM video support via MediaRecorder. The longstanding canvas.captureStream() bugs (WebKit #181663, #229611) were marked resolved in 2022, but WebKit bug #252465 (getUserMedia video element black screen in standalone PWA) still showed active reports through iOS 18.4.1 as of early 2026 per community reports. Real-device testing on iOS 18+ is **mandatory** before launch.

**Bottom line for Kova:** iOS 18.4+ is likely the minimum version for reliable canvas → MediaRecorder recording. Athletes on older iOS must be warned that recording may not work and advised to update. Chrome/Android is the reliable primary recording platform.

---

## Container Format Strategy

### The Problem

- **WebM** (VP8/VP9): Chrome/Firefox/Android native. iOS Safari pre-18.4 does not support WebM at all — neither recording nor playback in Safari.
- **MP4** (H264/AAC): iOS Safari's native format for MediaRecorder since iOS 14.3. Chrome added MP4 MediaRecorder support in Chrome 130+ (late 2024). Firefox does not support MP4 MediaRecorder.
- **WebM with Safari 18.4+**: Finally supported for recording, but canvas.captureStream() reliability is still uncertain.

### Recommended Approach

```typescript
function getSupportedMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4;codecs=h264,aac',  // Safari fallback
    'video/mp4',
  ]
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''  // browser will choose — risky, log a warning
}
```

**What this means for the export file:**
- The project spec says export as `.webm`. This is correct for Chrome/Android.
- On Safari (iOS pre-18.4), the recorded container will be MP4 regardless of what you specify. The file will actually be an MP4 even if you name it `.webm` — this is a known Safari quirk (iOS 12 reports `video/webm` but produces `mp4[h.264/aac]`).
- **Decision required:** Either (a) export whatever the browser produces and name it appropriately, or (b) accept `.webm` for Chrome/Android and `.mp4` for iOS Safari, making the filename dynamic based on detected MIME type.
- Recommendation: Use dynamic filename. `kova-[discipline]-[name]-[serial].webm` on Chrome, `kova-[discipline]-[name]-[serial].mp4` on iOS Safari. Both are uploadable to YouTube.

---

## PWA Manifest Requirements

Next.js 16 handles this natively via `app/manifest.ts`. No third-party library needed.

**Minimum manifest for installability:**
```typescript
// app/manifest.ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Kova',
    short_name: 'Kova',
    description: 'Kettlebell sport competition platform',
    start_url: '/',
    display: 'standalone',
    background_color: '#0a0a0a',
    theme_color: '#0a0a0a',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

**Camera permissions are NOT declared in the manifest.** They are requested at runtime via `getUserMedia()`. The manifest itself has no camera-related fields. PWAs require HTTPS for camera access (Vercel provides this automatically).

**iOS-specific notes:**
- iOS Safari does not show the automatic install prompt (`beforeinstallprompt` is not supported on iOS). Users must manually use Share > Add to Home Screen.
- `display: 'standalone'` is required for the standalone experience but it is this mode that has historically caused camera permission issues. Latest iOS (18.4+) appears to have improved but is not fully reliable.
- Camera permission is NOT persisted between sessions on iOS PWA standalone mode — users may be re-prompted on each launch.

---

## getUserMedia in Next.js App Router

**Rule:** All camera/canvas/MediaRecorder/AudioContext code must be in `'use client'` components. These are browser-only APIs that do not exist during SSR.

**Pattern for the recorder component:**

```typescript
'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

export function KovaRecorder() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)

  // Acquire camera only on explicit user action, not on mount
  const startCamera = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: 1280, height: 720 },
      audio: true,
    })
    streamRef.current = stream
    videoRef.current!.srcObject = stream
  }, [])

  // Stop all tracks on unmount — critical to release camera indicator light
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])
  // ...
}
```

**Key App Router constraints:**
1. Never call `getUserMedia()` at module level or in a Server Component.
2. `useEffect` with an empty dep array is safe for initialization, but prefer explicit user gesture triggers (button press) to avoid iOS permission prompt timing issues.
3. `dynamic(() => import('./KovaRecorder'), { ssr: false })` is the correct pattern to prevent SSR hydration errors if the component imports fail on the server.
4. Do NOT import `getUserMedia` or `AudioContext` at the top level of a file that might be imported by a Server Component — it will fail at build time.

---

## AudioContext Beep Sounds

**iOS Safari requires AudioContext to be created or resumed inside a user gesture handler.** The "start recording" button click is the correct place.

```typescript
// Create once on user gesture, reuse across the session
const audioCtxRef = useRef<AudioContext | null>(null)

function ensureAudioContext() {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  if (audioCtxRef.current.state === 'suspended') {
    audioCtxRef.current.resume()
  }
  return audioCtxRef.current
}

function beep(durationMs = 200, frequencyHz = 880) {
  const ctx = ensureAudioContext()
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.value = frequencyHz
  osc.start()
  osc.stop(ctx.currentTime + durationMs / 1000)
}
```

**Note:** iOS Safari with ringer on vibrate will not play Web Audio. This is a hardware-level OS decision, not a bug — no workaround exists.

---

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

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Serwist (`@serwist/next`) | Next.js manifest only (no service worker) | If offline support is not needed. For Kova the recorder needs to work without connectivity during recording. Use Serwist. |
| Next.js built-in `app/manifest.ts` | `next-pwa` manifest generation | Never use `next-pwa` — see above |
| Dynamic filename based on detected MIME type | Always export `.webm` | If you decide iOS support is out of scope for v1 — `.webm` always on Chrome/Android |
| `display: standalone` in manifest | `display: browser` | If iOS camera bugs are blocking — remove `apple-mobile-web-app-capable` and let users run in Safari tab. Loses installed-app feel but camera is more reliable. |

---

## Version Compatibility

| Package | Version in project | Compatible With | Notes |
|---------|--------------------|-----------------|-------|
| `next-pwa` | ^5.6.0 | Next.js ≤14 | **Incompatible with Next.js 16.** Remove this package. |
| `@serwist/next` | ^9.0.0 (to install) | Next.js 13–16 | Requires `--webpack` flag for build. Dev can use Turbopack. |
| `@clerk/nextjs` | ^7.0.6 | Next.js 15/16 | Version 7 supports App Router. Check Clerk docs for breaking changes from v5→v6→v7. |
| `drizzle-orm` | ^0.45.1 | `@libsql/client` ^0.17 | Current stable pairing. No known compatibility issues. |

---

## Installation Changes

```bash
# Remove abandoned package
npm uninstall next-pwa

# Add Serwist for service worker / offline support
npm install @serwist/next serwist

# No other new packages needed — recording uses native browser APIs
```

---

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

---

## Critical Open Questions for Phase-Specific Research

1. **Does canvas.captureStream() → MediaRecorder produce a valid video on iOS 18.4+ in practice?** No authoritative source confirmed this for 18.4 specifically. Needs real-device testing before building the recorder phase.

2. **Does the download blob (URL.createObjectURL + anchor click) work on iOS Safari for a recorded MP4 blob?** Standard technique, but iOS sometimes intercepts blob downloads. Needs verification.

3. **Does standalone PWA mode (Add to Home Screen) reliably provide camera access on iOS 18.4?** Bug #252465 is "fixed" but community reports say otherwise through late 2025. May need to ship with a warning recommending regular Safari tab instead of standalone mode for recording.

---

*Stack research for: Kova — kettlebell sport competition PWA with canvas video recording*
*Researched: 2026-03-24*
