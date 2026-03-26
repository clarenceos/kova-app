import { auth } from '@clerk/nextjs/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Check, X } from 'lucide-react'
import { getEntryById } from '@/lib/actions/entries'
import { GhostReplay } from '@/components/profile/GhostReplay'
import type { Rep } from '@/components/judge/RepCounter'

export const dynamic = 'force-dynamic'

const DISCIPLINE_LABELS: Record<string, string> = {
  long_cycle: 'Long Cycle',
  jerk: 'Jerk',
  snatch: 'Snatch',
}

function formatMMSS(t: number): string {
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
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
  const repCount = entry.reps
  const dateStr =
    entry.createdAt instanceof Date
      ? entry.createdAt.toISOString().split('T')[0]
      : new Date(entry.createdAt).toISOString().split('T')[0]

  return (
    <div className="min-h-screen bg-forge-black px-4 py-8 pb-24">
      <div className="mx-auto w-full max-w-lg">
        {/* Back button */}
        <Link
          href="/profile"
          className="mb-6 flex items-center gap-2 text-sm text-raw-steel transition-colors hover:text-parchment"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>

        {/* Entry header */}
        <div className="mb-6 rounded-2xl border border-raw-steel/20 bg-charcoal p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-2xl font-bold text-parchment">
                {entry.serial ?? '—'}
              </span>
              <span className="text-sm text-raw-steel">
                {disciplineLabel} &middot; {entry.weightKg} kg
              </span>
              <span className="text-xs text-raw-steel/60">{dateStr}</span>
            </div>

            {isJudged ? (
              <span className="rounded-full border border-patina-bronze/40 bg-patina-bronze/20 px-3 py-1 text-xs font-semibold text-patina-bronze">
                JUDGED
              </span>
            ) : (
              <span className="rounded-full border border-raw-steel/40 bg-raw-steel/20 px-3 py-1 text-xs font-semibold text-raw-steel">
                PENDING
              </span>
            )}
          </div>
        </div>

        {/* Video section */}
        {entry.youtubeId ? (
          <div className="mb-6">
            <GhostReplay videoId={entry.youtubeId} repTaps={repTaps} />
          </div>
        ) : (
          <div className="mb-6 rounded-2xl border border-raw-steel/20 bg-charcoal px-6 py-8 text-center">
            <p className="text-raw-steel">Video not yet uploaded</p>
          </div>
        )}

        {/* Judged section */}
        {isJudged ? (
          <>
            {/* Large rep count */}
            <div className="mb-6 text-center">
              <span className="text-5xl font-bold text-patina-bronze">{repCount}</span>
              <p className="mt-1 text-sm uppercase tracking-widest text-raw-steel">reps</p>
            </div>

            {/* Rep log */}
            {repTaps.length > 0 && (
              <div className="overflow-hidden rounded-xl bg-charcoal">
                <div className="border-b border-raw-steel/10 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-raw-steel">
                    Rep Log
                  </p>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {repTaps.map((tap, idx) => {
                    const seqNum = idx + 1
                    const isRep = tap.type === 'rep'
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between border-b border-raw-steel/10 px-3 py-2 last:border-b-0"
                      >
                        <span className="text-sm text-raw-steel">#{seqNum}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-raw-steel/60">
                            {tap.time !== null ? formatMMSS(tap.time) : '--:--'}
                          </span>
                          {isRep ? (
                            <Check className="h-4 w-4 text-patina-bronze" />
                          ) : (
                            <X className="h-4 w-4 text-raw-steel" />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          /* Pending state */
          <div className="rounded-2xl border border-raw-steel/20 bg-charcoal px-6 py-8 text-center">
            <p className="text-raw-steel">Awaiting judge review</p>
          </div>
        )}
      </div>
    </div>
  )
}
