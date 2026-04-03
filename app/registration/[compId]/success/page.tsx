import { getRegistrationData } from '@/lib/actions/registrations'
import { notFound } from 'next/navigation'
import Link from 'next/link'

export default async function RegistrationSuccessPage({
  params,
  searchParams,
}: {
  params: Promise<{ compId: string }>
  searchParams: Promise<{ registrantId?: string }>
}) {
  const { compId } = await params
  const { registrantId } = await searchParams

  if (!registrantId) {
    notFound()
  }

  const data = await getRegistrationData(registrantId)

  if (!data) {
    notFound()
  }

  const { registrant, entries, competition } = data
  const fullName = `${registrant.firstName} ${registrant.lastName}`

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-[640px]">

        {/* Page heading */}
        <h1 className="text-2xl font-semibold text-parchment">Registration Confirmed</h1>
        <p className="mt-1 text-sm text-raw-steel">
          {fullName} &mdash; {competition.name}
        </p>

        {/* Serial numbers card */}
        <div className="mt-6 rounded-xl bg-card p-8 ring-1 ring-foreground/10">
          <h2 className="mb-4 text-base font-semibold text-parchment">Your Serial Numbers</h2>

          {/* Table */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-raw-steel/20">
                <th className="pb-2 text-left font-semibold text-raw-steel">Event</th>
                <th className="pb-2 text-left font-semibold text-raw-steel">Bell Weight</th>
                <th className="pb-2 text-left font-semibold text-raw-steel">Serial</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-raw-steel/10">
                  <td className="py-3 text-parchment">
                    {entry.event === 'LC' ? 'Long Cycle' : entry.event === 'JERK' ? 'Jerk' : 'Snatch'}
                  </td>
                  <td className="py-3 text-parchment">{entry.bellWeight}</td>
                  <td className="py-3 font-mono text-bright-bronze">{entry.serial}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Screenshot instruction */}
          <p className="mt-4 text-sm text-raw-steel">
            Screenshot or save your serial numbers. These are your competition identifiers.
          </p>
        </div>

        {/* Register another button */}
        <Link
          href={`/registration/${compId}`}
          className="mt-6 block w-full rounded-2xl bg-patina-bronze py-3 text-center font-bold text-parchment transition-colors hover:bg-bright-bronze active:opacity-80"
        >
          Register another athlete
        </Link>

      </div>
    </div>
  )
}
