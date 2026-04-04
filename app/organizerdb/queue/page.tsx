import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCompetitionDashboard } from '@/lib/actions/dashboard'
import { schedule } from '@/lib/queue/scheduler'
import { assignJudges } from '@/lib/queue/assignJudges'
import { detectConflicts } from '@/lib/queue/detectConflicts'
import type { SchedulerEntry, TimeBlock, JudgeCandidate } from '@/lib/queue/types'
import { TimetableGrid } from './_components/TimetableGrid'
import './print.css'

function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<{ compId?: string; startTime?: string }>
}) {
  const params = await searchParams
  const compId = params?.compId
  const startTimeParam = params?.startTime

  if (!compId || !startTimeParam) return notFound()

  const startTimeMinutes = parseInt(startTimeParam, 10)
  if (isNaN(startTimeMinutes)) return notFound()

  const result = await getCompetitionDashboard(compId)
  if ('error' in result) return notFound()

  const { competition, registrants } = result

  // Build JudgeCandidate array from all registrants (not just those with entries)
  const judgeCandidates: JudgeCandidate[] = registrants.map(r => ({
    registrantId: r.id,
    firstName: r.firstName,
    lastName: r.lastName,
    club: r.club,
    coach: r.coach,
    isJudging: r.isJudging ?? 0,
  }))

  let initialTimeBlocks: TimeBlock[]
  let estimatedFinishTime: number
  let initialConflicts: ReturnType<typeof detectConflicts>

  if (competition.queueJson) {
    // Load from saved queue JSON — skip scheduler, re-run assignJudges in case registrants changed
    const savedBlocks = JSON.parse(competition.queueJson) as TimeBlock[]
    const { timeBlocks: blocksWithJudges, judgeConflicts } = assignJudges(savedBlocks, judgeCandidates)
    const restCoachConflicts = detectConflicts(blocksWithJudges, 2)
    initialTimeBlocks = blocksWithJudges
    initialConflicts = [...restCoachConflicts, ...judgeConflicts]
    estimatedFinishTime =
      initialTimeBlocks.length > 0
        ? initialTimeBlocks[initialTimeBlocks.length - 1].endTime
        : startTimeMinutes
  } else {
    // Build SchedulerEntry array — filter to status === 'registered'
    const schedulerEntries: SchedulerEntry[] = registrants.flatMap(r =>
      r.entries
        .filter(e => e.status === 'registered')
        .map(e => ({
          registrantId: r.id,
          firstName: r.firstName,
          lastName: r.lastName,
          gender: r.gender as 'Male' | 'Female',
          bodyWeightKg: r.bodyWeightKg,
          country: r.country,
          club: r.club,
          coach: r.coach,
          entryId: e.id,
          event: e.event as 'LC' | 'JERK' | 'SNATCH',
          bellWeight: e.bellWeight,
          duration: e.duration,
          serial: e.serial,
        }))
    )

    const scheduleResult = schedule({
      entries: schedulerEntries,
      numPlatforms: competition.numPlatforms,
      startTimeMinutes,
    })

    // Run judge assignment on scheduled blocks
    const { timeBlocks: blocksWithJudges, judgeConflicts } = assignJudges(
      scheduleResult.timeBlocks,
      judgeCandidates
    )
    const restCoachConflicts = detectConflicts(blocksWithJudges, 2)

    initialTimeBlocks = blocksWithJudges
    initialConflicts = [...restCoachConflicts, ...judgeConflicts]
    estimatedFinishTime = scheduleResult.estimatedFinishTime
  }

  const generatedAt = new Date().toISOString().replace('T', ' ').slice(0, 16)

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-7xl">
        {/* Back link — hidden in print */}
        <div className="mb-6 print:hidden">
          <Link
            href={`/organizerdb?compId=${compId}`}
            className="inline-flex items-center gap-2 text-sm text-raw-steel hover:text-parchment transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
        </div>

        {/* Print header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-parchment">
            {competition.name} — {competition.date}
          </h1>
          <p className="text-xs text-raw-steel">Generated: {generatedAt}</p>
        </div>

        {/* Timetable grid */}
        <TimetableGrid
          initialTimeBlocks={initialTimeBlocks}
          numPlatforms={competition.numPlatforms}
          initialConflicts={initialConflicts}
          minRestBlocks={2}
          compId={compId}
          savedAt={competition.queueSavedAt ?? null}
          judgeCandidates={judgeCandidates}
        />

        {/* Estimated finish — hidden in print */}
        <p className="mt-4 text-sm text-raw-steel print:hidden">
          Estimated finish: {formatTime(estimatedFinishTime)}
        </p>
      </div>
    </div>
  )
}
