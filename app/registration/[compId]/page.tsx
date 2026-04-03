import { db } from '@/lib/db'
import { competitions, registrants } from '@/lib/schema'
import type { Competition } from '@/lib/schema'
import { eq, count } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { RegistrationForm } from './_components/RegistrationForm'

interface GuardState {
  label: string
  message: string
}

function getGuardState(
  comp: Competition,
  registrantCount: number
): GuardState | null {
  // Status not open (draft or closed)
  if (comp.status !== 'open') {
    return { label: 'Closed', message: 'Registration is closed' }
  }
  // Deadline passed
  if (comp.registrationDeadline && new Date(comp.registrationDeadline) < new Date()) {
    return { label: 'Closed', message: 'Registration is closed' }
  }
  // Competition full
  if (comp.maxRegistrants != null && registrantCount >= comp.maxRegistrants) {
    return { label: 'Full', message: 'This competition is full' }
  }
  return null
}

export default async function RegistrationPage({
  params,
}: {
  params: Promise<{ compId: string }>
}) {
  const { compId } = await params

  // Fetch competition
  const [comp] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, compId))

  if (!comp) {
    notFound()
  }

  // Count registrants for capacity check
  let registrantCount = 0
  if (comp.maxRegistrants != null) {
    const [countResult] = await db
      .select({ count: count() })
      .from(registrants)
      .where(eq(registrants.competitionId, compId))
    registrantCount = countResult?.count ?? 0
  }

  const guardState = getGuardState(comp, registrantCount)

  // Guard state: render closed/full card
  if (guardState) {
    return (
      <div className="min-h-screen bg-background px-8 py-12">
        <div className="mx-auto max-w-[640px]">
          <h1 className="text-2xl font-semibold text-parchment">{comp.name}</h1>
          <p className="mt-1 text-sm text-raw-steel">{comp.date}</p>
          <div className="mt-6 rounded-xl bg-card p-8 ring-1 ring-foreground/10">
            <Badge className="bg-raw-steel/20 text-raw-steel border-transparent">
              {guardState.label}
            </Badge>
            <p className="mt-4 text-sm text-parchment">{guardState.message}</p>
          </div>
        </div>
      </div>
    )
  }

  // Parse bell weights for the form
  const allowedBellWeights: string[] = JSON.parse(comp.allowedBellWeights)
  const doubleBells = allowedBellWeights.filter(w => w.startsWith('2x'))
  const singleBells = allowedBellWeights.filter(w => w.startsWith('1x'))

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-[640px]">
        <h1 className="text-2xl font-semibold text-parchment">
          Register for {comp.name}
        </h1>
        <p className="mt-1 text-sm text-raw-steel">{comp.date}</p>
        <div className="mt-6 rounded-xl bg-card p-8 ring-1 ring-foreground/10">
          <RegistrationForm
            competitionId={comp.id}
            allowedDurations={comp.allowedDurations as 'both' | '10' | '5'}
            doubleBells={doubleBells}
            singleBells={singleBells}
          />
        </div>
      </div>
    </div>
  )
}
