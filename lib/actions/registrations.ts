'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { competitions, registrants, registrationEntries } from '@/lib/schema'
import type { Registrant, RegistrationEntry, Competition } from '@/lib/schema'
import { generateCompetitionSerial } from '@/lib/queue/serial'
import { eq, count } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

export async function registerAthlete(input: {
  competitionId: string
  lastName: string
  firstName: string
  gender: 'Male' | 'Female'
  bodyWeightKg: number
  country: string
  club: string | null
  coach: string | null
  events: Array<{
    event: 'LC' | 'JERK' | 'SNATCH'
    bellWeight: string
    duration: number
  }>
}): Promise<{ registrantId: string } | { error: string }> {
  try {
    // 1. competitionId must be a non-empty string
    if (!input.competitionId?.trim()) return { error: 'Competition ID is required' }

    // 2. Fetch competition from DB
    const [comp] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, input.competitionId))

    // 3. If comp not found
    if (!comp) return { error: 'Competition not found' }

    // 4. Status must be 'open'
    if (comp.status !== 'open') return { error: 'Registration is closed' }

    // 5. Deadline check
    if (comp.registrationDeadline && new Date(comp.registrationDeadline) < new Date()) {
      return { error: 'Registration is closed' }
    }

    // 6. Capacity check
    if (comp.maxRegistrants != null) {
      const [countResult] = await db
        .select({ count: count() })
        .from(registrants)
        .where(eq(registrants.competitionId, input.competitionId))
      if ((countResult?.count ?? 0) >= comp.maxRegistrants) {
        return { error: 'This competition is full' }
      }
    }

    // 7-11. Field validation
    if (!input.lastName?.trim()) return { error: 'Last name is required' }
    if (!input.firstName?.trim()) return { error: 'First name is required' }
    if (input.gender !== 'Male' && input.gender !== 'Female') {
      return { error: 'Gender must be Male or Female' }
    }
    if (typeof input.bodyWeightKg !== 'number' || input.bodyWeightKg <= 0) {
      return { error: 'Body weight must be a positive number' }
    }
    if (!input.country?.trim()) return { error: 'Country is required' }

    // 12. Events must be non-empty array
    if (!Array.isArray(input.events) || input.events.length === 0) {
      return { error: 'Select at least one event' }
    }

    // 13. Each event must have valid fields
    for (const evt of input.events) {
      if (!['LC', 'JERK', 'SNATCH'].includes(evt.event)) {
        return { error: `Invalid event: ${evt.event}` }
      }
      if (!evt.bellWeight?.trim()) {
        return { error: `Select a bell weight for ${evt.event}` }
      }
      if (evt.duration !== 5 && evt.duration !== 10) {
        return { error: `Invalid duration for ${evt.event}` }
      }
    }

    // Generate registrant ID upfront so we can return it on success
    const registrantId = createId()

    // Generate serial numbers BEFORE the batch — one per event entry
    const serials: string[] = []
    for (const _evt of input.events) {
      const serial = await generateCompetitionSerial(input.competitionId, comp.serialPrefix)
      serials.push(serial)
    }

    // Atomic insert via db.batch() (Phase 6 D-08 — db.transaction() banned over Turso HTTP)
    // Cast via unknown — Drizzle requires tuple type; dynamic spread breaks TS with >1 entry.
    // Same pattern as bulkImportRegistrants (Phase 10-01 decision).
    type BatchStatement = Parameters<typeof db.batch>[0][number]
    const now = new Date()
    const statements: BatchStatement[] = [
      db.insert(registrants).values({
        id: registrantId,
        competitionId: input.competitionId,
        lastName: input.lastName.trim(),
        firstName: input.firstName.trim(),
        gender: input.gender,
        bodyWeightKg: input.bodyWeightKg,
        country: input.country.trim(),
        club: input.club?.trim() || null,
        coach: input.coach?.trim() || null,
        createdAt: now,
      }) as unknown as BatchStatement,
      ...input.events.map((evt, i) =>
        db.insert(registrationEntries).values({
          registrantId,
          competitionId: input.competitionId,
          event: evt.event,
          bellWeight: evt.bellWeight,
          duration: evt.duration,
          serial: serials[i],
          createdAt: now,
        }) as unknown as BatchStatement
      ),
    ]
    await db.batch(statements as unknown as Parameters<typeof db.batch>[0])

    revalidatePath('/organizerdb')

    return { registrantId }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[registerAthlete] Failed:', msg, error)
    return { error: 'Registration failed. Please try again.' }
  }
}

export async function getRegistrationData(registrantId: string): Promise<{
  registrant: Registrant
  entries: RegistrationEntry[]
  competition: Competition
} | null> {
  // Fetch registrant by ID
  const [registrant] = await db
    .select()
    .from(registrants)
    .where(eq(registrants.id, registrantId))

  if (!registrant) return null

  // Fetch all entries for this registrant
  const entries = await db
    .select()
    .from(registrationEntries)
    .where(eq(registrationEntries.registrantId, registrantId))

  // Fetch competition
  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, registrant.competitionId))

  if (!competition) return null

  return { registrant, entries, competition }
}
