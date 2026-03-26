'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Square } from 'lucide-react'
import { useRecord } from '@/lib/record-context'
import { DISCIPLINE_DURATION_SECONDS } from '@/lib/disciplines'
import { GlobalHeader } from '@/components/ui/GlobalHeader'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

type PageState = 'setup' | 'countdown' | 'recording' | 'processing'

interface CameraDevice {
  deviceId: string
  label: string
}

// ── Canvas overlay font loading ───────────────────────────────────────────────
// Module-level promise so fonts are fetched once per page load, not per frame
let tomorrowFontsPromise: Promise<void> | null = null

async function loadTomorrowFonts(): Promise<void> {
  // Fetch the Google Fonts CSS to get the correct woff2 URLs for each weight
  const css = await fetch(
    'https://fonts.googleapis.com/css2?family=Tomorrow:wght@600;700&display=swap'
  ).then(r => r.text())

  const seen = new Set<string>()
  const loads: Promise<FontFace>[] = []
  const re = /font-weight:\s*(\d+)[\s\S]*?url\((https:\/\/[^)]+\.woff2)\)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(css)) !== null) {
    const [, weight, src] = m
    if (seen.has(weight)) continue  // take first (Latin-ext) block per weight only
    seen.add(weight)
    loads.push(new FontFace('Tomorrow', `url(${src})`, { weight }).load())
  }
  const faces = await Promise.all(loads)
  faces.forEach(f => document.fonts.add(f))
}

function ensureTomorrowFonts(): Promise<void> {
  if (!tomorrowFontsPromise) {
    tomorrowFontsPromise = loadTomorrowFonts().catch(() => {
      // Fallback to known-good URL for weight 400 if CSS fetch fails
      const face = new FontFace(
        'Tomorrow',
        'url(https://fonts.gstatic.com/s/tomorrow/v18/WBLhrETNbFtZCeGqgR2xe2XiZg.woff2)'
      )
      return face.load().then(f => { document.fonts.add(f) })
    })
  }
  return tomorrowFontsPromise
}
// ─────────────────────────────────────────────────────────────────────────────

function buildCameraList(devices: MediaDeviceInfo[]): CameraDevice[] {
  const videoInputs = devices.filter(d => d.kind === 'videoinput')
  const hasLabels = videoInputs.some(d => d.label.trim() !== '')

  if (hasLabels) {
    const front: CameraDevice[] = []
    const rear: CameraDevice[] = []

    for (const d of videoInputs) {
      const lower = d.label.toLowerCase()
      if (lower.includes('front') || lower.includes('facing front')) {
        front.push({ deviceId: d.deviceId, label: 'Front Camera' })
      } else {
        rear.push({ deviceId: d.deviceId, label: '' })
      }
    }

    const result: CameraDevice[] = []
    if (rear[0]) result.push({ deviceId: rear[0].deviceId, label: 'Back Camera (1x)' })
    result.push(...front)
    return result
  }

  // No labels — positional fallback, max 3
  const fallbackLabels = ['Front Camera', 'Back Camera (1x)']
  return videoInputs.slice(0, 2).map((d, i) => ({
    deviceId: d.deviceId,
    label: fallbackLabels[i],
  }))
}

export default function RecordingPage() {
  const router = useRouter()
  const {
    discipline,
    disciplineLabel,
    athleteName,
    serial,
    setWeightKg,
    setCountdownSeconds,
    setBeepEveryMinute,
    setAutoStop,
    setSelectedDeviceId,
    setRecordedBlob,
    setMimeType,
  } = useRecord()

  // ── Page state ──
  const [pageState, setPageState] = useState<PageState>('setup')

  // ── Setup form state ──
  const [cameras, setCameras] = useState<CameraDevice[]>([])
  const [selectedCamera, setSelectedCamera] = useState<string>('')
  const [weight, setWeight] = useState<string>('')
  const [countdown, setCountdown] = useState<number>(10)
  const [beep, setBeep] = useState<boolean>(true)
  const [autoStopEnabled, setAutoStopEnabled] = useState<boolean>(false)
  const [countdownError, setCountdownError] = useState<string>('')

  // ── Countdown display ──
  const [countdownDisplay, setCountdownDisplay] = useState<number>(10)

  // ── Processing state ──
  const [processingSlow, setProcessingSlow] = useState(false)

  // ── Recording params stored in refs so countdown effects can access them ──
  const recordWeightRef = useRef<number>(0)
  const recordBeepRef = useRef<boolean>(false)
  const recordAutoStopRef = useRef<boolean>(false)

  // ── Recording DOM elements — always mounted, visibility controlled via CSS ──
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  // ── Recording refs ──
  const streamRef = useRef<MediaStream | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const rafRef = useRef<number | null>(null)
  const timerMsRef = useRef<number>(0)
  const isRecordingRef = useRef<boolean>(false)
  const chunksRef = useRef<Blob[]>([])

  // ── Countdown preview refs ──
  const countdownDisplayRef = useRef<number>(10)
  const previewRafRef = useRef<number | null>(null)

  // ── Wake Lock ──
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false)

  // ── Stop confirmation dialog ──
  const [stopDialog, setStopDialog] = useState<'early' | 'complete' | null>(null)

  // ── AudioContext ──
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastBeepMinuteRef = useRef<number>(-1)

  // ── Camera orientation ──
  const isFrontCameraRef = useRef<boolean>(true)

  // Redirect if no discipline selected
  useEffect(() => {
    if (!discipline) {
      router.replace('/record')
    }
  }, [discipline, router])

  // ── Camera enumeration on mount ──
  useEffect(() => {
    async function enumerate() {
      try {
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        tempStream.getTracks().forEach(t => t.stop())

        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameraList = buildCameraList(devices)
        setCameras(cameraList)

        // Default to Front Camera; fall back to first
        const frontCamera = cameraList.find(c => c.label === 'Front Camera')
        setSelectedCamera(frontCamera?.deviceId ?? cameraList[0]?.deviceId ?? '')
      } catch (e) {
        console.error('Camera enumerate failed', e)
      }
    }
    enumerate()
  }, [])

  // ── Wake Lock helpers ──
  async function acquireWakeLock() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      wakeLockRef.current = await (navigator as any).wakeLock?.request('screen')
    } catch (e) {
      console.warn('Wake Lock not available', e)
    }
  }

  function releaseWakeLock() {
    wakeLockRef.current?.release().catch(() => {})
    wakeLockRef.current = null
  }

  // Re-acquire wake lock on visibility change while recording
  useEffect(() => {
    const handler = async () => {
      if (document.visibilityState === 'visible' && isRecording && !wakeLockRef.current) {
        await acquireWakeLock()
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [isRecording])

  // ── AudioContext beep ──
  const playBeep = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return

    const doPlay = () => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

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

  // ── Start tone (higher pitch for "go" signal) ──
  const playStartTone = useCallback(() => {
    const ctx = audioCtxRef.current
    if (!ctx) return

    const doPlay = () => {
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)

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

  // ── Canvas draw loop ──
  const drawFrame = useCallback((
    timerMs: number,
    serialStr: string,
    discLabel: string,
    name: string,
    weightKg: number,
  ) => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const video = videoRef.current
    if (!ctx || !video || !canvas) return

    const canvasW = canvas.width
    const canvasH = canvas.height

    // Layer 1: center-crop camera feed, mirrored only for front camera
    const cropX = (video.videoWidth - canvasW) / 2
    if (isFrontCameraRef.current) {
      ctx.save()
      ctx.scale(-1, 1)
      ctx.translate(-canvasW, 0)
      ctx.drawImage(video, cropX, 0, canvasW, canvasH, 0, 0, canvasW, canvasH)
      ctx.restore()
    } else {
      ctx.drawImage(video, cropX, 0, canvasW, canvasH, 0, 0, canvasW, canvasH)
    }

    // Layer 2: top gradient — drawn behind discipline label + timer
    const topGrad = ctx.createLinearGradient(0, 0, 0, 120)
    topGrad.addColorStop(0, 'rgba(0,0,0,0.72)')
    topGrad.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = topGrad
    ctx.fillRect(0, 0, canvasW, 120)

    // Layer 3: bottom gradient — drawn behind athlete name + serial
    const botGrad = ctx.createLinearGradient(0, canvasH - 140, 0, canvasH)
    botGrad.addColorStop(0, 'rgba(0,0,0,0)')
    botGrad.addColorStop(1, 'rgba(0,0,0,0.72)')
    ctx.fillStyle = botGrad
    ctx.fillRect(0, canvasH - 140, canvasW, 140)

    ctx.shadowBlur = 0

    const PAD = 16
    const TOP = 20           // top edge of top text block
    const BOT = canvasH - 20 // bottom edge of bottom text block

    const minutes = Math.floor(timerMs / 60000)
    const seconds = Math.floor((timerMs % 60000) / 1000)
    const timerStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

    // Top-left: discipline label — Tomorrow SemiBold 16px, parchment
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#EDE9E2'
    ctx.font = '600 16px Tomorrow, sans-serif'
    ctx.fillText(discLabel.toUpperCase(), PAD, TOP)

    // Top-left: timer — Tomorrow Bold 52px, white
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 52px Tomorrow, sans-serif'
    ctx.fillText(timerStr, PAD, TOP + 16 + 4)

    // Top-right: KOVA wordmark — Tomorrow SemiBold 24px, parchment
    // Vertically centered on the timer block's vertical span (half of 52px = 26)
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'right'
    ctx.fillStyle = '#EDE9E2'
    ctx.font = '600 24px Tomorrow, sans-serif'
    ctx.fillText('KOVA', canvasW - PAD, TOP + 16 + 4 + 26)

    // Bottom-left: athlete name as "F. Lastname" — Tomorrow Bold 28px, white
    const parts = name.trim().split(/\s+/)
    const displayName = parts.length >= 2
      ? `${parts[0][0].toUpperCase()}. ${parts.slice(1).join(' ')}`
      : name

    ctx.textBaseline = 'bottom'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 28px Tomorrow, sans-serif'
    ctx.fillText(displayName, PAD, BOT - 16 - 8)

    // Bottom-left: serial + weight — Tomorrow SemiBold 16px, parchment
    // Em-space (\u2003) used for visual separation between serial and weight
    ctx.fillStyle = '#EDE9E2'
    ctx.font = '600 16px Tomorrow, sans-serif'
    ctx.fillText(`${serialStr.toUpperCase()}\u2003\u2003${weightKg} KG`, PAD, BOT)

    ctx.textBaseline = 'alphabetic'
  }, [])

  // ── Stop recording ──
  const stopRecording = useCallback(() => {
    if (!isRecordingRef.current) return
    isRecordingRef.current = false

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    mediaRecorderRef.current?.stop()
    releaseWakeLock()
    setPageState('processing')
    setIsRecording(false)
  }, [])

  // ── Countdown tick ──
  useEffect(() => {
    if (pageState !== 'countdown') return

    const id = setInterval(() => {
      setCountdownDisplay(prev => prev - 1)
      countdownDisplayRef.current -= 1
    }, 1000)

    return () => clearInterval(id)
  }, [pageState])

  // ── Countdown beeps at 3, 2, 1 + start tone at 0 ──
  useEffect(() => {
    if (pageState !== 'countdown') return
    if (countdownDisplay === 3 || countdownDisplay === 2 || countdownDisplay === 1) {
      void playBeep()
    } else if (countdownDisplay === 0) {
      void playStartTone()
    }
  }, [countdownDisplay, pageState, playBeep, playStartTone])

  // ── Start MediaRecorder at 5s remaining ──
  useEffect(() => {
    if (pageState !== 'countdown' || countdownDisplay !== 5) return
    mediaRecorderRef.current?.start()
    acquireWakeLock()
  }, [countdownDisplay, pageState])

  // ── Start lift timer when countdown completes ──
  useEffect(() => {
    if (pageState !== 'countdown' || countdownDisplay > 0) return

    // Cancel countdown preview loop
    if (previewRafRef.current !== null) {
      cancelAnimationFrame(previewRafRef.current)
      previewRafRef.current = null
    }

    setPageState('recording')
    setIsRecording(true)
    isRecordingRef.current = true
    timerMsRef.current = 0
    lastBeepMinuteRef.current = -1

    let lastTimestamp: number | null = null

    function loop(ts: number) {
      if (!isRecordingRef.current) return

      if (lastTimestamp !== null) {
        timerMsRef.current += ts - lastTimestamp
      }
      lastTimestamp = ts

      const currentTimerMs = timerMsRef.current
      drawFrame(currentTimerMs, serial, disciplineLabel ?? '', athleteName, recordWeightRef.current)

      const currentMinute = Math.floor(currentTimerMs / 60000)
      if (recordBeepRef.current && currentMinute > 0 && currentMinute !== lastBeepMinuteRef.current) {
        lastBeepMinuteRef.current = currentMinute
        void playBeep()
      }

      if (recordAutoStopRef.current && currentTimerMs >= 610000) {
        stopRecording()
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownDisplay, pageState])

  // ── Processing slow timeout ──
  useEffect(() => {
    if (pageState !== 'processing') return
    const id = setTimeout(() => setProcessingSlow(true), 15000)
    return () => clearTimeout(id)
  }, [pageState])

  // ── Start session ──
  const startSession = useCallback(async (
    weightNum: number,
    countdownSecs: number,
    beepEnabled: boolean,
    autoStopOn: boolean,
    deviceId: string,
    isFront: boolean,
  ) => {
    setWeightKg(weightNum)
    setCountdownSeconds(countdownSecs)
    setBeepEveryMinute(beepEnabled)
    setAutoStop(autoStopOn)
    setSelectedDeviceId(deviceId)
    recordWeightRef.current = weightNum
    recordBeepRef.current = beepEnabled
    recordAutoStopRef.current = autoStopOn
    isFrontCameraRef.current = isFront

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false,
    })
    streamRef.current = stream

    const video = videoRef.current!
    video.srcObject = stream
    await video.play().catch(() => {})

    await new Promise<void>(resolve => {
      if (video.videoWidth > 0) { resolve(); return }
      video.addEventListener('loadedmetadata', () => resolve(), { once: true })
    })

    const cameraWidth = video.videoWidth || 1280
    const cameraHeight = video.videoHeight || 720
    const portraitWidth = Math.round(cameraHeight * 9 / 16)
    const canvas = canvasRef.current!
    canvas.width = portraitWidth
    canvas.height = cameraHeight

    // Load Tomorrow font before the first canvas draw call
    await ensureTomorrowFonts()

    const canvasStream = canvas.captureStream(30)

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8'
        : MediaRecorder.isTypeSupported('video/webm')
          ? 'video/webm'
          : 'video/mp4'

    const recorder = new MediaRecorder(canvasStream, { mimeType })
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      const rawBlob = new Blob(chunksRef.current, { type: mimeType })
      try {
        const { webmFixDuration } = await import('webm-fix-duration')
        const durationMs = timerMsRef.current
        const fixedBlob = await webmFixDuration(rawBlob, durationMs)
        setRecordedBlob(fixedBlob)
      } catch {
        setRecordedBlob(rawBlob)
      }
      setMimeType(mimeType)

      streamRef.current?.getTracks().forEach(t => t.stop())
      streamRef.current = null

      router.push('/record/playback')
    }

    mediaRecorderRef.current = recorder

    // Initialize countdown ref and start preview rAF loop
    countdownDisplayRef.current = countdownSecs

    function previewLoop() {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      const video = videoRef.current
      if (!ctx || !video || !canvas) return

      const canvasW = canvas.width
      const canvasH = canvas.height

      // Mirror camera feed only for front camera — same pattern as drawFrame Layer 1
      const cropX = (video.videoWidth - canvasW) / 2
      if (isFrontCameraRef.current) {
        ctx.save()
        ctx.scale(-1, 1)
        ctx.translate(-canvasW, 0)
        ctx.drawImage(video, cropX, 0, canvasW, canvasH, 0, 0, canvasW, canvasH)
        ctx.restore()
      } else {
        ctx.drawImage(video, cropX, 0, canvasW, canvasH, 0, 0, canvasW, canvasH)
      }

      // Countdown number overlay
      const num = countdownDisplayRef.current
      if (num > 0) {
        const fontSize = Math.round(canvasH * 0.25)
        const centerX = canvasW / 2
        const centerY = canvasH / 2

        ctx.font = `bold ${fontSize}px sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const textW = ctx.measureText(String(num)).width
        const padX = 24
        const padY = 20

        // Semi-transparent dark pill behind number only
        ctx.fillStyle = 'rgba(0,0,0,0.5)'
        ctx.beginPath()
        ctx.roundRect(
          centerX - textW / 2 - padX,
          centerY - fontSize / 2 - padY,
          textW + padX * 2,
          fontSize + padY * 2,
          fontSize * 0.4,
        )
        ctx.fill()

        // White number with shadow
        ctx.fillStyle = 'white'
        ctx.shadowColor = 'rgba(0,0,0,0.75)'
        ctx.shadowBlur = 8
        ctx.fillText(String(num), centerX, centerY)
        ctx.shadowBlur = 0
        ctx.textBaseline = 'alphabetic'
        ctx.textAlign = 'left'

        previewRafRef.current = requestAnimationFrame(previewLoop)
      }
      // num <= 0: loop stops naturally
    }

    previewRafRef.current = requestAnimationFrame(previewLoop)

    setCountdownDisplay(countdownSecs)
    setPageState('countdown')
  }, [
    setWeightKg,
    setCountdownSeconds,
    setBeepEveryMinute,
    setAutoStop,
    setSelectedDeviceId,
    setRecordedBlob,
    setMimeType,
    router,
  ])

  // ── Cleanup on unmount ──
  useEffect(() => {
    return () => {
      if (previewRafRef.current !== null) cancelAnimationFrame(previewRafRef.current)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      releaseWakeLock()
    }
  }, [])

  // ── Handle start button ──
  async function handleStart() {
    const weightNum = parseFloat(weight)
    if (isNaN(weightNum) || weightNum < 4 || weightNum > 100) return
    if (countdown < 5) {
      setCountdownError('Minimum countdown is 5 seconds')
      return
    }

    // Create and unlock AudioContext synchronously while still in the user gesture
    // call stack — MUST happen before any await or the gesture chain is broken on
    // mobile (iOS Safari and Android Chrome both suspend AudioContext if created
    // after the first await boundary)
    audioCtxRef.current = new AudioContext()
    void audioCtxRef.current.resume()

    const isFront = cameras.find(c => c.deviceId === selectedCamera)?.label === 'Front Camera'
    await startSession(weightNum, countdown, beep, autoStopEnabled, selectedCamera, isFront)
  }

  // ── Handle stop button tap — show duration-aware confirmation ──
  function handleStopRequest() {
    const durSecs = discipline ? DISCIPLINE_DURATION_SECONDS[discipline] : undefined
    if (durSecs === undefined) {
      // Unknown discipline — stop immediately, never block the athlete
      stopRecording()
      return
    }
    const elapsedSecs = timerMsRef.current / 1000
    setStopDialog(elapsedSecs >= durSecs ? 'complete' : 'early')
  }

  const showSetup = pageState === 'setup'
  const showRecording = pageState === 'recording'
  const showProcessing = pageState === 'processing'

  const inputClass =
    'w-full rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-parchment placeholder-raw-steel/50 focus:border-patina-bronze focus:outline-none transition-colors'

  return (
    <>
      {/* Always-mounted recording elements */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas
        ref={canvasRef}
        width={405}
        height={720}
        className={showSetup ? 'hidden' : undefined}
        style={!showSetup ? { position: 'fixed', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background: 'black' } : undefined}
      />

      {/* ── Setup UI ── */}
      {showSetup && (
        <div className="flex min-h-screen flex-col bg-forge-black">
          <GlobalHeader />
          <div className="px-4 py-8">
            <div className="mx-auto w-full max-w-sm">
              <h1 className="mb-1 text-2xl font-bold text-parchment">Recording Setup</h1>
              <p className="mb-8 text-sm text-raw-steel">{disciplineLabel}</p>

              <div className="mb-6 rounded-2xl border border-raw-steel/20 bg-charcoal p-4">
                <p className="mb-1 text-xs font-medium uppercase tracking-widest text-raw-steel">Athlete</p>
                <p className="text-lg font-semibold text-parchment">{athleteName}</p>
              </div>

              <div className="flex flex-col gap-5">
                {/* Weight */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-raw-steel">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    inputMode="decimal"
                    min="4"
                    max="100"
                    step="0.5"
                    placeholder="e.g. 24"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    required
                    className={inputClass}
                  />
                </div>

                {/* Countdown */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-raw-steel">
                    Countdown (seconds)
                  </label>
                  <input
                    type="number"
                    inputMode="numeric"
                    min="5"
                    max="60"
                    value={countdown}
                    onChange={e => {
                      const val = Number(e.target.value)
                      setCountdown(val)
                      if (val < 5) {
                        setCountdownError('Minimum countdown is 5 seconds')
                      } else {
                        setCountdownError('')
                      }
                    }}
                    className={inputClass}
                  />
                  {countdownError && (
                    <p className="mt-1 text-xs text-red-500">{countdownError}</p>
                  )}
                </div>

                {/* Beep every minute */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-raw-steel">Beep every minute</label>
                  <button
                    type="button"
                    onClick={() => setBeep(v => !v)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${beep ? 'bg-patina-bronze' : 'bg-raw-steel/30'}`}
                    aria-pressed={beep}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-forge-black transition-transform ${beep ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>

                {/* Auto-stop */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-raw-steel">Auto-stop after 10:00 (+10s)</label>
                  <button
                    type="button"
                    onClick={() => setAutoStopEnabled(v => !v)}
                    className={`relative h-7 w-12 rounded-full transition-colors ${autoStopEnabled ? 'bg-patina-bronze' : 'bg-raw-steel/30'}`}
                    aria-pressed={autoStopEnabled}
                  >
                    <span
                      className={`absolute top-0.5 h-6 w-6 rounded-full bg-forge-black transition-transform ${autoStopEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                    />
                  </button>
                </div>

                {/* Camera selection */}
                {cameras.length > 0 && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-raw-steel">Camera</label>
                    <select
                      value={selectedCamera}
                      onChange={e => setSelectedCamera(e.target.value)}
                      className={`${inputClass} appearance-none`}
                    >
                      {cameras.map(cam => (
                        <option key={cam.deviceId} value={cam.deviceId}>
                          {cam.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Start button */}
                <button
                  type="button"
                  onClick={handleStart}
                  disabled={!weight || isNaN(parseFloat(weight))}
                  className="mt-2 w-full rounded-2xl bg-patina-bronze px-6 py-4 text-lg font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80 disabled:opacity-40"
                >
                  Start
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Recording UI — circular stop button ── */}
      {showRecording && (
        <button
          type="button"
          onClick={handleStopRequest}
          style={{ opacity: 0.75 }}
          className="fixed bottom-6 right-6 z-10 flex h-14 w-14 items-center justify-center rounded-full bg-red-600 shadow-2xl active:opacity-60"
          aria-label="Stop recording"
        >
          <Square className="h-6 w-6 fill-white text-white" />
        </button>
      )}

      {/* ── Stop confirmation: early stop ── */}
      <AlertDialog open={stopDialog === 'early'} onOpenChange={open => { if (!open) setStopDialog(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Stop recording early?</AlertDialogTitle>
            <AlertDialogDescription>
              You haven&apos;t reached the full duration. Your video will be cut short.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={stopRecording}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Stop anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Stop confirmation: set complete ── */}
      <AlertDialog open={stopDialog === 'complete'} onOpenChange={open => { if (!open) setStopDialog(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set complete.</AlertDialogTitle>
            <AlertDialogDescription>
              Full duration recorded. Well done.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={stopRecording}
              className="bg-patina-bronze text-parchment hover:bg-bright-bronze"
            >
              Save recording
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Processing overlay ── */}
      {showProcessing && (
        <div className="fixed inset-0 z-20 flex flex-col items-center justify-center bg-forge-black/95">
          <div className="flex flex-col items-center gap-4 px-6 text-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-patina-bronze/30 border-t-patina-bronze" />
            <p className="text-lg font-semibold text-parchment">Processing your video…</p>
            {processingSlow && (
              <p className="max-w-xs text-sm text-raw-steel">
                This is taking longer than expected. Large videos may take a moment.
              </p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
