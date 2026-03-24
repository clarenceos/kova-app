import Link from 'next/link'

const FILTERS = [
  { label: 'All', value: undefined },
  { label: '10 Min. Long Cycle', value: 'long_cycle' },
  { label: '10 Min. Jerk', value: 'jerk' },
  { label: '10 Min. Snatch', value: 'snatch' },
] as const

interface DisciplineFilterProps {
  currentDiscipline?: string
}

export function DisciplineFilter({ currentDiscipline }: DisciplineFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
      {FILTERS.map(filter => {
        const isActive = filter.value === currentDiscipline ||
          (!filter.value && !currentDiscipline)
        const href = filter.value ? `?discipline=${filter.value}` : '/leaderboard'

        return (
          <Link
            key={filter.label}
            href={href}
            className={[
              'shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap',
              isActive
                ? 'border-white text-white'
                : 'border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-300',
            ].join(' ')}
          >
            {filter.label}
          </Link>
        )
      })}
    </div>
  )
}
