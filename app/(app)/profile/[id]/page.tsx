import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getEntryById } from '@/lib/actions/entries'
import { EntryDetailClient } from '@/components/profile/EntryDetailClient'
import type { Rep } from '@/components/judge/RepCounter'

export const dynamic = 'force-dynamic'

const DISCIPLINE_LABELS: Record<string, string> = {
  long_cycle: 'Long Cycle',
  jerk: 'Jerk',
  snatch: 'Snatch',
}

interface EntryDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function EntryDetailPage({ params }: EntryDetailPageProps) {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  const { id } = await params
  const entry = await getEntryById(id)
  if (!entry) notFound()

  const repTaps: Rep[] = entry.repTaps ? JSON.parse(entry.repTaps) : []
  const disciplineLabel = DISCIPLINE_LABELS[entry.discipline] ?? entry.discipline
  const isJudged = entry.status === 'judged'

  return (
    <div className="min-h-screen bg-forge-black px-2 pt-4 pb-24 md:px-4 md:pt-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Back button */}
        <Link
          href="/profile"
          className="mb-3 flex items-center gap-2 px-2 text-sm text-raw-steel transition-colors hover:text-parchment"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        {entry.youtubeId ? (
          <EntryDetailClient
            videoId={entry.youtubeId}
            repTaps={repTaps}
            serial={entry.serial}
            disciplineLabel={disciplineLabel}
            weightKg={entry.weightKg}
            isJudged={isJudged}
            repCount={entry.reps}
          />
        ) : (
          <div className="rounded-2xl border border-raw-steel/20 bg-charcoal px-6 py-8 text-center">
            <p className="text-raw-steel">Video not yet uploaded</p>
          </div>
        )}
      </div>
    </div>
  )
}
