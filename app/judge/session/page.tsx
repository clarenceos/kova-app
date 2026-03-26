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

function SessionHeader({
  disciplineLabel,
  athleteName,
  weightKg,
  serial,
  onExit,
}: {
  disciplineLabel: string
  athleteName: string
  weightKg: number
  serial: string
  onExit: () => void
}) {
  return (
    <>
      <div>
        <p className="text-xs tracking-wide text-raw-steel">{disciplineLabel}</p>
        <h1 className="text-base font-semibold leading-tight text-parchment">{athleteName}</h1>
        <p className="mt-0.5 font-mono text-[11px] text-raw-steel/60">
          {weightKg} kg · {serial}
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <button
            className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium text-raw-steel transition-colors hover:text-parchment active:bg-raw-steel/10"
            aria-label="Exit session"
          >
            <LogOut className="h-4 w-4" />
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
            <AlertDialogAction onClick={onExit}>Exit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function JudgeSessionPage() {
  const router = useRouter()
  const { session, setLastSubmission } = useJudgeSession()
  const [reps, setReps] = useState<Rep[]>([])
  const playerRef = useRef<unknown>(null)
  const [playerReady, setPlayerReady] = useState(false)
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

  return (
    <div className="relative flex min-h-screen flex-col bg-forge-black md:h-screen md:flex-row md:overflow-hidden">

      {/* MODE 2: Phone landscape blocking overlay */}
      <div className="fixed inset-0 z-50 hidden flex-col items-center justify-center gap-4 bg-forge-black landscape:max-md:flex">
        <RotateCcw className="h-16 w-16 text-raw-steel" />
        <p className="font-semibold text-parchment">Rotate your device</p>
        <p className="text-sm text-raw-steel">Portrait mode only on mobile</p>
      </div>

      {/* Left column — video */}
      <div className="relative shrink-0 px-2 md:flex md:h-full md:w-[45%] md:flex-col md:items-center md:justify-center md:border-r md:border-raw-steel/20 md:px-6 md:py-6">
        {/* Portrait header — hidden on tablet/desktop */}
        <div className="flex items-start justify-between px-2 pb-2 pt-3 md:hidden">
          <SessionHeader
            disciplineLabel={session.disciplineLabel}
            athleteName={session.athleteName}
            weightKg={session.weightKg}
            serial={session.serial}
            onExit={() => router.push('/dashboard')}
          />
        </div>

        <YouTubeEmbed
          videoId={session.videoId}
          onPlayerReady={player => {
            playerRef.current = player
            setPlayerReady(true)
          }}
        />

        {/* Gradient bridge into action deck — portrait only */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-8 bg-gradient-to-t from-forge-black to-transparent md:hidden" />
      </div>

      {/* Right column — action deck */}
      <div className="flex-1 overflow-y-auto px-4 pb-8 pt-2 md:h-full md:w-[55%] md:px-6 md:pb-8 md:pt-4">
        {/* Landscape header — hidden on mobile */}
        <div className="hidden items-start justify-between pb-2 pt-3 md:flex">
          <SessionHeader
            disciplineLabel={session.disciplineLabel}
            athleteName={session.athleteName}
            weightKg={session.weightKg}
            serial={session.serial}
            onExit={() => router.push('/dashboard')}
          />
        </div>

        <RepCounter
          reps={reps}
          playerReady={playerReady}
          onRep={handleRep}
          onNoRep={handleNoRep}
          onUndo={handleUndo}
        />

        {/* Submit */}
        <div className="mt-6">
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
      </div>
    </div>
  )
}
