'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useRecord } from '@/lib/record-context'

type PageState = 'setup' | 'countdown' | 'recording'

interface CameraDevice {
  deviceId: string
  label: string
}

function getCameraLabel(rawLabel: string, index: number): string {
  const lower = rawLabel.toLowerCase()
  if (lower.includes('front') || lower.includes('facing front')) return 'Front Camera'
  if (lower.includes('back') || lower.includes('rear') || lower.includes('environment')) return 'Rear Camera'
  if (rawLabel.trim()) return rawLabel
  return `Camera ${index + 1}`
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
  const [beep, setBeep] = useState<boolean>(false)
  const [autoStopEnabled, setAutoStopEnabled] = useState<boolean>(false)

  // ── Countdown display ──
  const [countdownDisplay, setCountdownDisplay] = useState<number>(10)

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

  // ── Wake Lock ──
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [isRecording, setIsRecording] = useState<boolean>(false)

  // ── AudioContext ──
  const audioCtxRef = useRef<AudioContext | null>(null)
  const lastBeepMinuteRef = useRef<number>(-1)

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
        // Request permission first so device labels are populated
        const tempStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        tempStream.getTracks().forEach(t => t.stop()) // Release immediately after permission

        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoDevices = devices.filter(d => d.kind === 'videoinput')
        const mapped: CameraDevice[] = videoDevices.map((d, i) => ({
          deviceId: d.deviceId,
          label: getCameraLabel(d.label, i),
        }))
        setCameras(mapped)
        if (mapped.length > 0) setSelectedCamera(mapped[0].deviceId)
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
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    const ctx = audioCtxRef.current
    if (ctx.state === 'suspended') ctx.resume()

    const oscillator = ctx.createOscillator()
    const gainNode = ctx.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(ctx.destination)

    oscillator.frequency.value = 880 // A5
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)

    oscillator.start(ctx.currentTime)
    oscillator.stop(ctx.currentTime + 0.3)
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

    // Layer 1: center-crop camera feed, mirrored horizontally for selfie view
    // ctx transform is scoped to save/restore — overlays drawn after restore are unaffected
    const cropX = (video.videoWidth - canvasW) / 2
    ctx.save()
    ctx.scale(-1, 1)
    ctx.translate(-canvasW, 0)
    ctx.drawImage(video, cropX, 0, canvasW, canvasH, 0, 0, canvasW, canvasH)
    ctx.restore()

    // Layer 2: overlays — drawn after restore, so text is correctly oriented on screen and in export
    ctx.lineWidth = 3
    ctx.strokeStyle = 'black'
    ctx.fillStyle = 'white'

    // Timer - top center
    const minutes = Math.floor(timerMs / 60000)
    const seconds = Math.floor((timerMs % 60000) / 1000)
    const timerStr = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    ctx.font = 'bold 72px monospace'
    ctx.textAlign = 'center'
    ctx.strokeText(timerStr, canvasW / 2, 80)
    ctx.fillText(timerStr, canvasW / 2, 80)

    // Athlete name - top left
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'left'
    ctx.strokeText(name, 20, 50)
    ctx.fillText(name, 20, 50)

    // Discipline - top right
    ctx.textAlign = 'right'
    ctx.strokeText(discLabel, canvasW - 20, 50)
    ctx.fillText(discLabel, canvasW - 20, 50)

    // Weight - bottom left
    ctx.textAlign = 'left'
    ctx.strokeText(`${weightKg} kg`, 20, canvasH - 20)
    ctx.fillText(`${weightKg} kg`, 20, canvasH - 20)

    // KOVA branding - bottom right
    ctx.font = 'bold 28px sans-serif'
    ctx.textAlign = 'right'
    ctx.strokeText('KOVA', canvasW - 20, canvasH - 20)
    ctx.fillText('KOVA', canvasW - 20, canvasH - 20)

    // Serial - bottom center, small
    ctx.font = '18px monospace'
    ctx.textAlign = 'center'
    ctx.strokeText(serialStr, canvasW / 2, canvasH - 5)
    ctx.fillText(serialStr, canvasW / 2, canvasH - 5)
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
    setIsRecording(false)

    // Stream is released in recorder.onstop after blob is ready
  }, [])

  // ── Countdown tick — useEffect drives the interval so functional updates work correctly ──
  useEffect(() => {
    if (pageState !== 'countdown') return

    const id = setInterval(() => {
      setCountdownDisplay(prev => prev - 1)
    }, 1000)

    return () => clearInterval(id)
  }, [pageState])

  // ── Start recording when countdown reaches 0 ──
  useEffect(() => {
    if (pageState !== 'countdown' || countdownDisplay > 0) return

    mediaRecorderRef.current?.start()
    acquireWakeLock()
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
        playBeep()
      }

      if (recordAutoStopRef.current && currentTimerMs >= 610000) {
        stopRecording()
        return
      }

      rafRef.current = requestAnimationFrame(loop)
    }

    rafRef.current = requestAnimationFrame(loop)
  // drawFrame, playBeep, stopRecording are stable useCallbacks; serial/disciplineLabel/athleteName
  // don't change during a session — safe to capture without listing as deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownDisplay, pageState])

  // ── Start session (called when "Start" is pressed) ──
  const startSession = useCallback(async (
    weightNum: number,
    countdownSecs: number,
    beepEnabled: boolean,
    autoStopOn: boolean,
    deviceId: string,
  ) => {
    // Save to context and recording refs
    setWeightKg(weightNum)
    setCountdownSeconds(countdownSecs)
    setBeepEveryMinute(beepEnabled)
    setAutoStop(autoStopOn)
    setSelectedDeviceId(deviceId)
    recordWeightRef.current = weightNum
    recordBeepRef.current = beepEnabled
    recordAutoStopRef.current = autoStopOn

    // Acquire camera stream
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId } },
      audio: false,
    })
    streamRef.current = stream

    // Attach stream to hidden video element and wait for dimensions
    const video = videoRef.current!
    video.srcObject = stream
    await video.play().catch(() => {})

    // Wait for video dimensions to be known before sizing the canvas
    await new Promise<void>(resolve => {
      if (video.videoWidth > 0) { resolve(); return }
      video.addEventListener('loadedmetadata', () => resolve(), { once: true })
    })

    // Size canvas to portrait (9:16) by center-cropping the camera feed
    const cameraWidth = video.videoWidth || 1280
    const cameraHeight = video.videoHeight || 720
    const portraitWidth = Math.round(cameraHeight * 9 / 16)
    const canvas = canvasRef.current!
    canvas.width = portraitWidth
    canvas.height = cameraHeight

    // Setup MediaRecorder from the portrait canvas stream
    const canvasStream = canvas.captureStream(30)

    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
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

    // Initialise countdown display then hand off to the useEffect interval
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
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
      releaseWakeLock()
    }
  }, [])

  // ── Handle start button ──
  async function handleStart() {
    const weightNum = parseFloat(weight)
    if (isNaN(weightNum) || weightNum < 4 || weightNum > 100) return
    await startSession(weightNum, countdown, beep, autoStopEnabled, selectedCamera)
  }

  const showSetup = pageState === 'setup'
  const showCountdown = pageState === 'countdown'
  const showRecording = pageState === 'recording'

  return (
    <>
      {/* ── Always-mounted recording elements — visibility controlled by CSS ── */}
      {/* The video is always hidden; canvas is shown during countdown/recording */}
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
        <div className="flex min-h-screen flex-col bg-zinc-950 px-4 py-8">
          <div className="mx-auto w-full max-w-sm">
            <h1 className="mb-1 text-2xl font-bold text-white">Recording Setup</h1>
            <p className="mb-8 text-sm text-zinc-400">{disciplineLabel}</p>

            <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
              <p className="text-xs font-medium uppercase tracking-widest text-zinc-500 mb-1">Athlete</p>
              <p className="text-lg font-semibold text-white">{athleteName}</p>
            </div>

            <div className="flex flex-col gap-5">
              {/* Weight */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  min="4"
                  max="100"
                  step="0.5"
                  placeholder="e.g. 24"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  required
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                />
              </div>

              {/* Countdown */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-300">
                  Countdown (seconds)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={countdown}
                  onChange={e => setCountdown(Number(e.target.value))}
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:border-zinc-500 focus:outline-none"
                />
              </div>

              {/* Beep every minute */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">Beep every minute</label>
                <button
                  type="button"
                  onClick={() => setBeep(v => !v)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${beep ? 'bg-white' : 'bg-zinc-700'}`}
                  aria-pressed={beep}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-zinc-950 transition-transform ${beep ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>

              {/* Auto-stop */}
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300">Auto-stop after 10:00 (+10s)</label>
                <button
                  type="button"
                  onClick={() => setAutoStopEnabled(v => !v)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${autoStopEnabled ? 'bg-white' : 'bg-zinc-700'}`}
                  aria-pressed={autoStopEnabled}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-zinc-950 transition-transform ${autoStopEnabled ? 'translate-x-5' : 'translate-x-0.5'}`}
                  />
                </button>
              </div>

              {/* Camera selection */}
              {cameras.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-300">Camera</label>
                  <select
                    value={selectedCamera}
                    onChange={e => setSelectedCamera(e.target.value)}
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-white focus:border-zinc-500 focus:outline-none"
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
                className="mt-2 w-full rounded-2xl bg-white px-6 py-4 text-lg font-bold text-zinc-950 transition-opacity disabled:opacity-40 active:opacity-80"
              >
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Countdown UI ── */}
      {showCountdown && (
        <div className="fixed inset-0 z-10 flex flex-col items-center justify-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-widest text-white/70">
            Get Ready
          </p>
          <p className="text-[9rem] font-black leading-none text-white drop-shadow-2xl">
            {countdownDisplay}
          </p>
        </div>
      )}

      {/* ── Recording UI — stop button only ── */}
      {showRecording && (
        <div className="fixed bottom-8 left-0 right-0 z-10 flex justify-center">
          <button
            type="button"
            onClick={stopRecording}
            className="rounded-full bg-red-600 px-10 py-4 text-lg font-bold text-white shadow-2xl transition-opacity active:opacity-80"
          >
            Stop Recording
          </button>
        </div>
      )}
    </>
  )
}
