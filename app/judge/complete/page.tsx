'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useJudgeSession } from '@/lib/judge-context'

export default function JudgeCompletePage() {
  const router = useRouter()
  const { lastSubmission } = useJudgeSession()

  useEffect(() => {
    if (!lastSubmission) router.replace('/judge')
  }, [lastSubmission, router])

  if (!lastSubmission) return null

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Success indicator */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 mb-4">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Score Submitted</h1>
          <p className="text-zinc-400 text-sm mt-1">The score has been recorded.</p>
        </div>

        {/* Score summary */}
        <div className="border border-zinc-800 rounded-2xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 font-medium uppercase tracking-wide">Summary</p>
          </div>
          <div className="divide-y divide-zinc-800">
            <Row label="Athlete" value={lastSubmission.athleteName} />
            <Row label="Discipline" value={lastSubmission.disciplineLabel} />
            <Row label="Weight" value={`${lastSubmission.weightKg} kg`} />
            <Row label="Reps" value={String(lastSubmission.reps)} highlight />
            <Row label="Serial" value={lastSubmission.serial} mono />
          </div>
        </div>

        <Link
          href="/judge"
          className="block w-full text-center bg-white text-zinc-950 font-semibold rounded-2xl py-3 hover:bg-zinc-100 active:bg-zinc-200 transition-colors"
        >
          Judge Another
        </Link>
      </div>
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
      <span className="text-sm text-zinc-400">{label}</span>
      <span
        className={[
          'text-sm',
          highlight ? 'text-white font-bold text-lg' : 'text-white',
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
