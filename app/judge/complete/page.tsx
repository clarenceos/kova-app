'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useJudgeSession } from '@/lib/judge-context'
import { GlobalHeader } from '@/components/ui/GlobalHeader'
import { BottomNav } from '@/components/ui/BottomNav'
import { Check } from 'lucide-react'

export default function JudgeCompletePage() {
  const router = useRouter()
  const { lastSubmission } = useJudgeSession()

  useEffect(() => {
    if (!lastSubmission) router.replace('/judge')
  }, [lastSubmission, router])

  if (!lastSubmission) return null

  return (
    <div className="min-h-screen bg-forge-black">
      <GlobalHeader />
      <main className="flex min-h-[calc(100vh-56px)] items-center justify-center px-4 py-8 pb-24">
        <div className="w-full max-w-md">
          {/* Success indicator */}
          <div className="mb-8 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full border border-patina-bronze/40 bg-charcoal">
              <Check className="h-8 w-8 text-patina-bronze" strokeWidth={2.5} />
            </div>
            <h1 className="text-3xl font-bold text-parchment">Score Submitted</h1>
            <p className="mt-1 text-sm text-raw-steel">The score has been recorded.</p>
          </div>

          {/* Score summary */}
          <div className="mb-6 overflow-hidden rounded-2xl border border-raw-steel/20 bg-charcoal">
            <div className="border-b border-raw-steel/10 px-5 py-4">
              <p className="text-xs font-medium uppercase tracking-wider text-raw-steel">Summary</p>
            </div>
            <div className="divide-y divide-raw-steel/10">
              <Row label="Athlete" value={lastSubmission.athleteName} />
              <Row label="Discipline" value={lastSubmission.disciplineLabel} />
              <Row label="Weight" value={`${lastSubmission.weightKg} kg`} />
              <Row label="Reps" value={String(lastSubmission.reps)} highlight />
              <Row label="Serial" value={lastSubmission.serial} mono />
            </div>
          </div>

          <Link
            href="/judge"
            className="block w-full rounded-2xl bg-patina-bronze py-3 text-center font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
          >
            Judge Another
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  )
}

function Row({
  label,
  value,
  highlight,
  mono,
}: {
  label: string
  value: string
  highlight?: boolean
  mono?: boolean
}) {
  return (
    <div className="flex items-center justify-between px-5 py-3">
      <span className="text-sm text-raw-steel">{label}</span>
      <span
        className={[
          highlight ? 'text-2xl font-bold text-patina-bronze' : 'text-sm text-parchment',
          mono ? 'font-mono' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {value}
      </span>
    </div>
  )
}
