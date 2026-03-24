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

interface ScoresTableProps {
  scores: Score[]
}

export function ScoresTable({ scores }: ScoresTableProps) {
  if (scores.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-zinc-500 text-sm">No scores yet.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Column headers — desktop only */}
      <div className="hidden md:grid md:grid-cols-[2rem_1fr_auto_auto_auto_auto] md:gap-4 px-4 pb-1">
        <span className="text-xs text-zinc-600 font-medium">#</span>
        <span className="text-xs text-zinc-600 font-medium">Athlete</span>
        <span className="text-xs text-zinc-600 font-medium text-right">Discipline</span>
        <span className="text-xs text-zinc-600 font-medium text-right">Weight</span>
        <span className="text-xs text-zinc-600 font-medium text-right">Reps</span>
        <span className="text-xs text-zinc-600 font-medium text-right">Date</span>
      </div>

      {scores.map((score, i) => (
        <div
          key={score.id}
          className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
        >
          {/* Mobile layout */}
          <div className="flex items-center gap-3 md:hidden">
            <span className="text-zinc-600 text-sm w-6 shrink-0 tabular-nums">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium truncate">{score.athleteName}</p>
              <p className="text-zinc-500 text-xs mt-0.5">
                {DISCIPLINE_LABELS[score.discipline] ?? score.discipline} · {score.weightKg} kg
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-white font-bold text-xl tabular-nums">{score.reps}</p>
              <p className="text-zinc-600 text-xs">reps</p>
            </div>
          </div>

          {/* Desktop layout */}
          <div className="hidden md:grid md:grid-cols-[2rem_1fr_auto_auto_auto_auto] md:gap-4 md:items-center">
            <span className="text-zinc-500 text-sm tabular-nums">{i + 1}</span>
            <span className="text-white font-medium truncate">{score.athleteName}</span>
            <span className="text-zinc-400 text-sm text-right">
              {DISCIPLINE_LABELS[score.discipline] ?? score.discipline}
            </span>
            <span className="text-zinc-400 text-sm text-right">{score.weightKg} kg</span>
            <span className="text-white font-bold text-right tabular-nums">{score.reps}</span>
            <span className="text-zinc-500 text-sm text-right">
              {formatDate(score.createdAt)}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
