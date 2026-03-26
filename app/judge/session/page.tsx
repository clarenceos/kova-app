'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut, RotateCcw } from 'lucide-react'
import { useJudgeSession } from '@/lib/judge-context'
import { YouTubeEmbed } from '@/components/judge/YouTubeEmbed'
import { RepCounter, type Rep } from '@/components/judge/RepCounter'
import { submitScore } from '@/lib/actions/scores'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'


function fmtTime(t: number | null): string {
  if (t === null) return '--:--'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function JudgeSessionPage() {
  const router = useRouter()
  const { session, setLastSubmission } = useJudgeSession()
  const [reps, setReps] = useState<Rep[]>([])
  const playerRef = useRef<unknown>(null)
  const [playerReady, setPlayerReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!session) router.replace('/judge')
  }, [session, router])

  if (!session) return null

  const repCount = reps.filter(r => r.type === 'rep').length

  function getTimestamp(): number | null {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = (playerRef.current as any)?.getCurrentTime?.()
    return raw ? (raw as number) : null
  }

  function handleRep() {
    setReps(prev => [...prev, { time: getTimestamp(), type: 'rep' }])
  }

  function handleNoRep() {
    setReps(prev => [...prev, { time: getTimestamp(), type: 'no-rep' }])
  }

  function handleUndo() {
    setReps(prev => prev.slice(0, -1))
  }

  function handleSubmit() {
    setSubmitError('')
    startTransition(async () => {
      const result = await submitScore({
        athleteName: session!.athleteName,
        discipline: session!.discipline,
        weightKg: session!.weightKg,
        reps: repCount,
        serial: session!.serial,
        repTaps: JSON.stringify(reps),
      })

      if ('error' in result) {
        setSubmitError(result.error)
        return
      }

      setLastSubmission({ ...session!, reps: repCount })
      router.push('/judge/complete')
    })
  }

  const exitDialog = (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="flex items-center gap-1.5 rounded-lg bg-forge-black/60 px-2.5 py-1.5 text-xs font-medium text-raw-steel backdrop-blur-sm transition-colors hover:text-parchment active:bg-raw-steel/10"
          aria-label="Exit session"
        >
          <LogOut className="h-3.5 w-3.5" />
          Exit
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Exit Session?</AlertDialogTitle>
          <AlertDialogDescription>
            Your rep count will be lost. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => router.push('/dashboard')}>Exit</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  const submitButton = (
    <div>
      {submitError && (
        <p className="mb-3 text-center text-sm text-raw-steel">{submitError}</p>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={repCount === 0 || isPending}
        className="w-full rounded-2xl bg-patina-bronze py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-90 disabled:cursor-not-allowed disabled:opacity-30"
      >
        {isPending ? 'Submitting…' : `Submit Score — ${repCount} rep${repCount === 1 ? '' : 's'}`}
      </button>
    </div>
  )

  return (
    <div className="h-screen overflow-hidden bg-forge-black flex flex-col md:flex-row">

      {/* Phone landscape blocking overlay */}
      <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-forge-black landscape:max-md:flex">
        <RotateCcw className="h-16 w-16 text-raw-steel" />
        <p className="font-semibold text-parchment">Rotate your device</p>
        <p className="text-sm text-raw-steel">Portrait mode only on mobile</p>
      </div>

      {/* VIDEO — portrait: fixed height, landscape/desktop: left column */}
      <div className="relative h-[42vh] w-full shrink-0 md:h-full md:w-[45%] md:border-r md:border-raw-steel/20">
        <YouTubeEmbed
          videoId={session.videoId}
          onPlayerReady={player => {
            playerRef.current = player
            setPlayerReady(true)
          }}
          onPlayingChange={setIsPlaying}
        />
        {/* Exit button — floats over video top-right */}
        <div className="absolute right-3 top-3 z-10 md:hidden">
          {exitDialog}
        </div>

        {/* Rep log overlay — bottom-right of video, mobile only, last 5 most-recent-on-top */}
        {reps.length > 0 && (
          <div className="absolute bottom-3 right-3 z-10 flex flex-col gap-1 md:hidden">
            {[...reps].slice(-5).reverse().map((rep, i) => {
              const seqNum = reps.length - i
              const isRep = rep.type === 'rep'
              return (
                <div
                  key={reps.length - i}
                  className="flex items-center gap-1.5 rounded-md bg-forge-black/60 px-2 py-0.5 backdrop-blur-sm"
                >
                  <span className={isRep ? 'text-[10px] font-bold text-patina-bronze' : 'text-[10px] font-bold text-raw-steel'}>
                    {isRep ? '✓' : '✗'}
                  </span>
                  <span className="font-mono text-[10px] text-parchment/80">
                    #{seqNum} {fmtTime(rep.time)}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* CONTROLS — portrait: flex-1 below video, desktop: right column */}
      <div className="flex flex-1 flex-col gap-3 overflow-hidden px-4 pb-4 pt-3 md:h-full md:w-[55%] md:overflow-y-auto md:px-6 md:pb-8 md:pt-4">

        {/* Desktop header with exit — hidden on mobile */}
        <div className="hidden items-center justify-between md:flex">
          <div>
            <p className="text-xs tracking-wide text-raw-steel">{session.disciplineLabel}</p>
            <h1 className="text-base font-semibold text-parchment">{session.athleteName}</h1>
            <p className="font-mono text-[11px] text-raw-steel/60">{session.weightKg} kg · {session.serial}</p>
          </div>
          {exitDialog}
        </div>

        {/* Not playing hint — mobile only */}
        {!isPlaying && playerReady && (
          <p className="text-center text-xs text-raw-steel md:hidden">Press play to enable judging</p>
        )}

        <RepCounter
          reps={reps}
          playerReady={playerReady}
          isPlaying={isPlaying}
          onRep={handleRep}
          onNoRep={handleNoRep}
          onUndo={handleUndo}
        />

        {submitButton}
      </div>
    </div>
  )
}
