import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAthleteEntries } from '@/lib/actions/entries'
import { EntryCard } from '@/components/profile/EntryCard'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const { userId } = await auth()
  if (!userId) redirect('/sign-in')

  let entries: Awaited<ReturnType<typeof getAthleteEntries>> = []
  let fetchError = false
  try {
    entries = await getAthleteEntries()
  } catch {
    fetchError = true
  }

  return (
    <div className="min-h-screen bg-forge-black px-4 py-8 pb-24">
      <div className="mx-auto w-full max-w-3xl">
        {/* Hero header */}
        <div className="mb-6 rounded-2xl bg-gradient-to-b from-charcoal to-forge-black px-6 py-8">
          <h1 className="text-3xl font-bold text-parchment">My Submissions</h1>
          <p className="mt-1 text-sm text-raw-steel">
            {entries.length} submission{entries.length !== 1 ? 's' : ''}
          </p>
        </div>

        {fetchError && (
          <p className="mb-4 text-center text-sm text-raw-steel">
            Couldn&apos;t load your submissions. Try refreshing.
          </p>
        )}

        {/* Entry list */}
        {entries.length > 0 ? (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="flex flex-col items-center gap-4 rounded-2xl border border-raw-steel/20 bg-charcoal px-6 py-12 text-center">
            <p className="text-raw-steel">
              No submissions yet. Record a lift to get started.
            </p>
            <Link
              href="/record"
              className="rounded-full bg-patina-bronze px-6 py-2 text-sm font-semibold text-parchment transition-colors hover:bg-bright-bronze"
            >
              Record a Lift
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
