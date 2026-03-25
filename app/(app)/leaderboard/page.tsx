import { db } from '@/lib/db'
import { scores } from '@/lib/schema'
import { desc, eq } from 'drizzle-orm'
import { DisciplineFilter } from '@/components/leaderboard/DisciplineFilter'
import { ScoresTable } from '@/components/leaderboard/ScoresTable'

export const dynamic = 'force-dynamic'

const VALID_DISCIPLINES = ['long_cycle', 'jerk', 'snatch'] as const
type Discipline = typeof VALID_DISCIPLINES[number]

interface LeaderboardPageProps {
  searchParams: Promise<{ discipline?: string }>
}

export default async function LeaderboardPage({ searchParams }: LeaderboardPageProps) {
  const { discipline } = await searchParams

  const isValidDiscipline = (d?: string): d is Discipline =>
    VALID_DISCIPLINES.includes(d as Discipline)

  const rows = isValidDiscipline(discipline)
    ? await db.select().from(scores).where(eq(scores.discipline, discipline)).orderBy(desc(scores.reps))
    : await db.select().from(scores).orderBy(desc(scores.reps))

  return (
    <div className="min-h-screen bg-forge-black px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        {/* Hero header with gradient */}
        <div className="mb-6 rounded-2xl bg-gradient-to-b from-charcoal to-forge-black px-6 py-8">
          <h1 className="text-3xl font-bold text-parchment">Leaderboard</h1>
          <p className="mt-1 text-sm text-raw-steel">
            {rows.length} {rows.length === 1 ? 'score' : 'scores'} submitted
          </p>
        </div>

        {/* Discipline filter */}
        <div className="mb-6">
          <DisciplineFilter currentDiscipline={isValidDiscipline(discipline) ? discipline : undefined} />
        </div>

        {/* Scores */}
        <ScoresTable scores={rows} />
      </div>
    </div>
  )
}
