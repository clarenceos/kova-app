import { Score } from '@/lib/schema'

const DISCIPLINE_LABELS: Record<string, string> = {
  long_cycle: '10 Min. Long Cycle',
  jerk: '10 Min. Jerk',
  snatch: '10 Min. Snatch',
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(d)
}

function rankColor(i: number): string {
  if (i === 0) return 'text-patina-bronze font-bold'
  if (i === 1 || i === 2) return 'text-bright-bronze font-semibold'
  return 'text-raw-steel'
}

interface ScoresTableProps {
  scores: Score[]
}

export function ScoresTable({ scores }: ScoresTableProps) {
  if (scores.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-raw-steel">No scores yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Column headers — desktop only */}
      <div className="hidden md:grid md:grid-cols-[2rem_1fr_auto_auto_auto_auto] md:gap-4 px-4 pb-1">
        <span className="text-xs font-medium text-raw-steel/60 uppercase tracking-wider">#</span>
        <span className="text-xs font-medium text-raw-steel/60 uppercase tracking-wider">Athlete</span>
        <span className="text-xs font-medium text-raw-steel/60 uppercase tracking-wider text-right">Discipline</span>
        <span className="text-xs font-medium text-raw-steel/60 uppercase tracking-wider text-right">Weight</span>
        <span className="text-xs font-medium text-raw-steel/60 uppercase tracking-wider text-right">Reps</span>
        <span className="text-xs font-medium text-raw-steel/60 uppercase tracking-wider text-right">Date</span>
      </div>

      {scores.map((score, i) => (
        <div
          key={score.id}
          className="rounded-xl border border-raw-steel/20 bg-charcoal px-4 py-3"
        >
          {/* Mobile layout */}
          <div className="flex items-center gap-3 md:hidden">
            <span className={`w-6 shrink-0 text-sm tabular-nums ${rankColor(i)}`}>
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-parchment">{score.athleteName}</p>
              <p className="mt-0.5 text-xs text-raw-steel">
                {DISCIPLINE_LABELS[score.discipline] ?? score.discipline} · {score.weightKg} kg
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-xl font-bold tabular-nums text-patina-bronze">{score.reps}</p>
              <p className="text-xs text-raw-steel/60">reps</p>
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:grid md:grid-cols-[2rem_1fr_auto_auto_auto_auto] md:items-center md:gap-4">
            <span className={`text-sm tabular-nums ${rankColor(i)}`}>{i + 1}</span>
            <span className="truncate font-medium text-parchment">{score.athleteName}</span>
            <span className="text-right text-sm text-raw-steel">
              {DISCIPLINE_LABELS[score.discipline] ?? score.discipline}
            </span>
            <span className="text-right text-sm text-raw-steel">{score.weightKg} kg</span>
            <span className="text-right font-bold tabular-nums text-patina-bronze">{score.reps}</span>
            <span className="text-right text-sm text-raw-steel/60">
              {formatDate(score.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
