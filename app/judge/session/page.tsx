'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useJudgeSession } from '@/lib/judge-context'
import { YouTubeEmbed } from '@/components/judge/YouTubeEmbed'
import { RepCounter } from '@/components/judge/RepCounter'
import { submitScore } from '@/lib/actions/scores'

export default function JudgeSessionPage() {
  const router = useRouter()
  const { session, setLastSubmission } = useJudgeSession()
  const [reps, setReps] = useState<number[]>([])
  const playerRef = useRef<unknown>(null)
  const [submitError, setSubmitError] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!session) router.replace('/judge')
  }, [session, router])

  if (!session) return null

  function handleRep() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const t = (playerRef.current as any)?.getCurrentTime?.() ?? 0
    setReps(prev => [...prev, t])
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
        reps: reps.length,
        youtubeUrl: session!.youtubeUrl,
        serial: session!.serial,
      })

      if ('error' in result) {
        setSubmitError(result.error)
        return
      }

      setLastSubmission({ ...session!, reps: reps.length })
      router.push('/judge/complete')
    })
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <p className="text-zinc-400 text-sm">{session.disciplineLabel}</p>
        <h1 className="text-white font-semibold text-lg">{session.athleteName}</h1>
        <p className="text-zinc-500 text-xs mt-0.5">
          {session.weightKg} kg · Serial: {session.serial}
        </p>
      </div>

      {/* Main layout: video left, counter right on md+ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Video */}
        <div>
          <YouTubeEmbed
            videoId={session.videoId}
            onPlayerReady={player => { playerRef.current = player }}
          />
        </div>

        {/* Rep counter */}
        <div>
          <RepCounter
            reps={reps}
            onRep={handleRep}
            onUndo={handleUndo}
          />
        </div>
      </div>

      {/* Submit */}
      <div className="mt-8 max-w-sm mx-auto md:max-w-none">
        {submitError && (
          <p className="text-red-400 text-sm mb-3 text-center">{submitError}</p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={reps.length === 0 || isPending}
          className="w-full bg-white text-zinc-950 font-semibold rounded-2xl py-3 hover:bg-zinc-100 active:bg-zinc-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isPending ? 'Submitting…' : `Submit Score — ${reps.length} rep${reps.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  )
}
