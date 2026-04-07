---
phase: quick
plan: 260326-umx
type: execute
wave: 1
depends_on: []
files_modified:
  - app/record/recording/page.tsx
  - app/record/playback/page.tsx
  - components/record/YouTubeUploader.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Beep sounds play even if AudioContext has been suspended (resume-then-play pattern)"
    - "Beep toggle defaults to ON in recording setup"
    - "Discard button appears on playback page when upload has not completed"
    - "Upload Manually button only appears after an upload failure, not as initial option"
    - "Save video file button only appears for webm recordings after upload complete"
  artifacts:
    - path: "app/record/recording/page.tsx"
      provides: "Resume-then-play beep pattern, beep default true"
    - path: "app/record/playback/page.tsx"
      provides: "Discard button with confirmation, conditional Upload Manually, conditional Save video"
    - path: "components/record/YouTubeUploader.tsx"
      provides: "onUploadError callback prop"
  key_links:
    - from: "components/record/YouTubeUploader.tsx"
      to: "app/record/playback/page.tsx"
      via: "onUploadError prop callback"
      pattern: "onUploadError.*setUploadFailed"
---

<objective>
Fix three UX issues in the recording and playback flow: (1) beep sounds that silently fail when AudioContext is suspended, (2) missing discard button on playback, (3) cluttered/incorrect button states on playback page.

Purpose: Beeps are critical audio cues during recording countdown and minute marks. The current guard silently drops beeps when AudioContext suspends (common on mobile). Discard lets athletes re-record without navigating back through the leave warning. Button cleanup removes confusing options and shows them only when contextually relevant.

Output: Three modified files with fixed beep pattern, discard flow, and cleaned-up playback buttons.
</objective>

<execution_context>
@/Users/clarence/kova-app/.claude/get-shit-done/workflows/execute-plan.md
@/Users/clarence/kova-app/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@app/record/recording/page.tsx
@app/record/playback/page.tsx
@components/record/YouTubeUploader.tsx
@lib/record-context.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix beep resume-then-play pattern and default beep to ON</name>
  <files>app/record/recording/page.tsx</files>
  <action>
Three changes in this file:

1. **Line 121** — Change `useState<boolean>(false)` to `useState<boolean>(true)` for the `beep` state so beep-every-minute defaults to ON.

2. **Lines 222-239 (playBeep)** — Replace the entire `playBeep` useCallback with a resume-then-play pattern. Remove the `if (!ctx || ctx.state !== 'running') return` early-exit guard. Instead:
   - If `ctx` is null, return immediately.
   - Extract the oscillator creation into a local `doPlay` function.
   - If `ctx.state === 'running'`, call `doPlay()` directly.
   - Otherwise, call `ctx.resume().then(doPlay).catch(() => {})`.
   - `doPlay` internals: same oscillator config (880Hz, sine, gain 0.3 ramping to 0.001, duration 0.3s), connects to both `ctx.destination` and `audioDestRef.current` if available.

Exact replacement for `playBeep`:
```ts
const playBeep = useCallback(() => {
  const ctx = audioCtxRef.current
  if (!ctx) return

  const doPlay = () => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    if (audioDestRef.current) gainNode.connect(audioDestRef.current)
    oscillator.frequency.value = 880
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
  }

  if (ctx.state === 'running') {
    doPlay()
  } else {
    ctx.resume().then(doPlay).catch(() => {})
  }
}, [])
```

3. **Lines 242-259 (playStartTone)** — Same resume-then-play pattern but with 1320Hz, gain 0.5, duration 0.5s:
```ts
const playStartTone = useCallback(() => {
  const ctx = audioCtxRef.current
  if (!ctx) return

  const doPlay = () => {
    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)
    if (audioDestRef.current) gainNode.connect(audioDestRef.current)
    oscillator.frequency.value = 1320
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5)
    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.5)
  }

  if (ctx.state === 'running') {
    doPlay()
  } else {
    ctx.resume().then(doPlay).catch(() => {})
  }
}, [])
```
  </action>
  <verify>
    <automated>cd /Users/clarence/kova-app && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>playBeep and playStartTone both use resume-then-play pattern (no silent drops when AudioContext is suspended). Beep toggle defaults to true.</done>
</task>

<task type="auto">
  <name>Task 2: Add discard button with AlertDialog on playback page</name>
  <files>app/record/playback/page.tsx</files>
  <action>
1. **Add `setRecordedBlob` to the useRecord() destructure** on line 22-23. Change:
   ```ts
   const { recordedBlob, serial, discipline, disciplineLabel, athleteName, weightKg, mimeType } = useRecord()
   ```
   to:
   ```ts
   const { recordedBlob, setRecordedBlob, serial, discipline, disciplineLabel, athleteName, weightKg, mimeType } = useRecord()
   ```

2. **Add discard confirmation state:**
   ```ts
   const [showDiscardDialog, setShowDiscardDialog] = useState(false)
   ```
   Add this alongside the other useState declarations (after line 29).

3. **Add "Discard recording" button** inside the `!showUploader && !uploadComplete` block (the block at lines 141-156). After the "Upload to YouTube" button and before the closing `</>`, add:
   ```tsx
   <button
     onClick={() => setShowDiscardDialog(true)}
     className="w-full rounded-xl border border-red-600/30 bg-charcoal px-6 py-3 font-semibold text-red-400 transition-colors hover:border-red-600/50 active:opacity-80"
   >
     Discard recording
   </button>
   ```

4. **Add discard AlertDialog** right before the closing `</div>` of the page (before the existing leave-warning AlertDialog, around line 211). Add:
   ```tsx
   <AlertDialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
     <AlertDialogContent>
       <AlertDialogHeader>
         <AlertDialogTitle>Discard this recording?</AlertDialogTitle>
         <AlertDialogDescription>
           This recording will be permanently deleted. This cannot be undone.
         </AlertDialogDescription>
       </AlertDialogHeader>
       <AlertDialogFooter>
         <AlertDialogCancel>Cancel</AlertDialogCancel>
         <AlertDialogAction
           onClick={() => { setRecordedBlob(null); router.push('/record') }}
           className="bg-red-600 text-white hover:bg-red-700"
         >
           Discard
         </AlertDialogAction>
       </AlertDialogFooter>
     </AlertDialogContent>
   </AlertDialog>
   ```

Note: The "Upload Manually" button removal and conditional buttons are handled in Task 3.
  </action>
  <verify>
    <automated>cd /Users/clarence/kova-app && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>Discard button visible on playback when upload not started. Confirmation dialog shows destructive warning. Confirming discard clears blob and navigates to /record.</done>
</task>

<task type="auto">
  <name>Task 3: Clean up playback buttons and add onUploadError prop to YouTubeUploader</name>
  <files>app/record/playback/page.tsx, components/record/YouTubeUploader.tsx</files>
  <action>
**In `components/record/YouTubeUploader.tsx`:**

1. Add `onUploadError?: () => void` to the `YouTubeUploaderProps` interface (after `onUploadComplete`).

2. Add `onUploadError` to the destructured props in the component function signature.

3. In every place where `setStatus('error')` is called, also call `onUploadError?.()` immediately after. There are 7 occurrences:
   - Line 67: after `google_not_connected` check (this is NOT an upload error, skip this one)
   - Line 68: `setStatus('error')` + `setErrorMessage(tokenResult.error)` — add `onUploadError?.()` after
   - Lines 106-107: init response not ok — add `onUploadError?.()` after
   - Lines 113-114: no upload URI — add `onUploadError?.()` after
   - Lines 119-120: network error starting upload — add `onUploadError?.()` after
   - Lines 162-163: upload blob failed — add `onUploadError?.()` after
   - Lines 181-182: save entry failed — add `onUploadError?.()` after

**In `app/record/playback/page.tsx`:**

1. Add state for upload failure tracking:
   ```ts
   const [uploadFailed, setUploadFailed] = useState(false)
   ```

2. **Remove the "Upload Manually" button entirely** from the `!showUploader && !uploadComplete` block (lines 149-154 — the entire second button in that block). The block should only contain "Upload to YouTube" and "Discard recording" (from Task 2).

3. **Pass `onUploadError` prop** to the `<YouTubeUploader>` component (around line 178-188). Add:
   ```tsx
   onUploadError={() => setUploadFailed(true)}
   ```

4. **Add conditional "Upload Manually" button after the uploader section.** After the `{showUploader && recordedBlob && (...)}` block, add:
   ```tsx
   {uploadFailed && !uploadComplete && (
     <div className="mt-3">
       <button
         onClick={() => router.push('/record/instructions')}
         className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-6 py-3 font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
       >
         Upload Manually
       </button>
     </div>
   )}
   ```

5. **Make "Save video file" conditional on webm** in the `uploadComplete` section (around lines 166-172). Wrap the save button with a mimeType check:
   ```tsx
   {mimeType.includes('webm') && (
     <button
       onClick={handleExport}
       className="w-full rounded-xl border border-raw-steel/30 bg-charcoal px-6 py-3 font-semibold text-parchment transition-colors hover:border-patina-bronze/40 active:opacity-80"
     >
       Save video file
     </button>
   )}
   ```
  </action>
  <verify>
    <automated>cd /Users/clarence/kova-app && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>"Upload Manually" no longer shows as initial option. It appears only after YouTubeUploader reports an error. "Save video file" only renders when mimeType includes 'webm'. onUploadError callback fires on all real error states in YouTubeUploader.</done>
</task>

</tasks>

<verification>
- `npx next build` compiles without errors
- Recording page: beep toggle defaults to ON, beeps play during countdown 3-2-1
- Playback page: only "Upload to YouTube" and "Discard recording" buttons shown initially
- Playback page: tapping Discard shows confirmation dialog, confirming navigates to /record
- Playback page: "Upload Manually" appears only after upload error
- Playback page: "Save video file" only appears post-upload for webm recordings
</verification>

<success_criteria>
- All three files compile without TypeScript errors
- playBeep/playStartTone use resume-then-play (no silent AudioContext drops)
- Beep defaults to ON
- Discard flow works: button -> dialog -> confirm clears blob and navigates
- Upload Manually only visible after upload failure
- Save video file only visible for webm mimeType
</success_criteria>

<output>
After completion, create `.planning/quick/260326-umx-fix-beep-resume-then-play-add-discard-bu/260326-umx-SUMMARY.md`
</output>
