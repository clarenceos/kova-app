'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, X } from 'lucide-react'
import { useJudgeSession } from '@/lib/judge-context'
import { GlobalHeader } from '@/components/ui/GlobalHeader'
import { BottomNav } from '@/components/ui/BottomNav'

function formatMMSS(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function JudgeCompletePage() {
  const router = useRouter()
  const { lastSubmission, session } = useJudgeSession()

  useEffect(() => {
    if (!lastSubmission) router.replace('/judge')
  }, [lastSubmission, router])

  if (!lastSubmission) return null

  const repTaps = lastSubmission.repTaps ?? []
  const repCount = repTaps.filter(r => r.type === 'rep').length
  const noRepCount = repTaps.filter(r => r.type === 'no-rep').length

  return (
    <div className="min-h-screen bg-forge-black">
      <GlobalHeader />
      <main className="mx-auto max-w-md px-4 pb-32 pt-6">

        {/* Success header */}
        <div className="mb-6 text-center">
          <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-patina-bronze/40 bg-charcoal">
            <Check className="h-7 w-7 text-patina-bronze" strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-bold text-parchment">Score Submitted</h1>
          <p className="mt-1 text-sm text-raw-steel">
            {lastSubmission.athleteName} · {lastSubmission.disciplineLabel} · {lastSubmission.weightKg} kg
          </p>
          <p className="font-mono text-xs text-raw-steel/50">{lastSubmission.serial}</p>
        </div>

        {/* Rep count hero */}
        <div className="mb-4 rounded-2xl border border-raw-steel/20 bg-charcoal px-6 py-5 text-center">
          <p className="text-[11px] font-medium uppercase tracking-widest text-raw-steel">Final Score</p>
          <p className="mt-1 text-7xl font-bold tabular-nums leading-none text-patina-bronze">
            {repCount}
          </p>
          <p className="mt-1 text-sm uppercase tracking-widest text-raw-steel">reps</p>
          {noRepCount > 0 && (
            <p className="mt-2 text-xs text-raw-steel/60">{noRepCount} no-rep{noRepCount !== 1 ? 's' : ''} called</p>
          )}
        </div>

        {/* Rep log */}
        {repTaps.length > 0 && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-raw-steel/20 bg-charcoal">
            <div className="border-b border-raw-steel/10 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-wider text-raw-steel">
                Rep Log — {repTaps.length} entries
              </p>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {[...repTaps].reverse().map((tap, revIdx) => {
                const seqNum = repTaps.length - revIdx
                const isRep = tap.type === 'rep'
                return (
                  <div
                    key={repTaps.length - 1 - revIdx}
                    className="flex items-center justify-between border-b border-raw-steel/10 px-4 py-2.5 last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-sm text-raw-steel/50">#{seqNum}</span>
                      <div className={[
                        'flex h-6 w-6 items-center justify-center rounded-full',
                        isRep ? 'bg-patina-bronze/15' : 'bg-raw-steel/10',
                      ].join(' ')}>
                        {isRep
                          ? <Check className="h-3.5 w-3.5 text-patina-bronze" strokeWidth={3} />
                          : <X className="h-3.5 w-3.5 text-raw-steel" strokeWidth={3} />
                        }
                      </div>
                      <span className={isRep ? 'text-sm font-medium text-parchment' : 'text-sm text-raw-steel/60'}>
                        {isRep ? 'Rep' : 'No rep'}
                      </span>
                    </div>
                    <span className="font-mono text-xs text-raw-steel/50">
                      {tap.time !== null ? formatMMSS(tap.time) : '--:--'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (session) {
                router.push('/judge/session')
              } else {
                router.push('/judge')
              }
            }}
            className="flex-1 rounded-2xl border border-raw-steel/30 py-3 font-semibold text-parchment transition-colors hover:border-raw-steel hover:bg-raw-steel/10 active:opacity-80"
          >
            Judge Again
          </button>
          <button
            type="button"
            onClick={() => router.push('/judge')}
            className="flex-1 rounded-2xl bg-patina-bronze py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-90"
          >
            Finalize
          </button>
        </div>

      </main>
      <BottomNav />
    </div>
  )
}
