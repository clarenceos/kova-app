'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { competitions, registrants, registrationEntries } from '@/lib/schema'
import type { Competition, Registrant, RegistrationEntry } from '@/lib/schema'
import { generateCompetitionSerial } from '@/lib/queue/serial'
import { eq, desc } from 'drizzle-orm'
import { createId } from '@paralleldrive/cuid2'

// RegistrantWithEntries: a registrant with all their registration_entries attached
export type RegistrantWithEntries = Registrant & { entries: RegistrationEntry[] }

// CSVRow: a validated row from the bulk import CSV
export type CSVRow = {
  lastName: string
  firstName: string
  gender: 'Male' | 'Female'
  bodyWeightKg: number
  country: string
  events: Array<{
    event: 'LC' | 'JERK' | 'SNATCH' | 'BIATHLON'
    bellWeight: string
    duration: number
  }>
  club: string | null
  coach: string | null
  isJudging: 0 | 1 | 2
}

/**
 * Fetch all competitions ordered by most recent first.
 * Used to populate the competition selector dropdown.
 */
export async function getCompetitions(): Promise<Competition[]> {
  return db.select().from(competitions).orderBy(desc(competitions.createdAt))
}

/**
 * Fetch all dashboard data for a selected competition:
 * the competition itself, all registrants with their entries, and a total count.
 * Uses 3 simple queries and groups entries by registrantId in JS (D-09 pattern).
 */
export async function getCompetitionDashboard(compId: string): Promise<
  | { competition: Competition; registrants: RegistrantWithEntries[]; totalCount: number }
  | { error: string }
> {
  try {
    if (!compId?.trim()) return { error: 'Competition ID is required' }

    // Fetch competition
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, compId))

    if (!competition) return { error: 'Competition not found' }

    // Fetch all registrants for this competition, most recent first
    const registrantRows = await db
      .select()
      .from(registrants)
      .where(eq(registrants.competitionId, compId))
      .orderBy(desc(registrants.createdAt))

    // Fetch all registration entries for this competition
    const entryRows = await db
      .select()
      .from(registrationEntries)
      .where(eq(registrationEntries.competitionId, compId))

    // Group entries by registrantId in JS (avoids verbose Drizzle join; fast for <=200 registrants)
    const entriesByRegistrant = new Map<string, RegistrationEntry[]>()
    for (const entry of entryRows) {
      const existing = entriesByRegistrant.get(entry.registrantId) ?? []
      existing.push(entry)
      entriesByRegistrant.set(entry.registrantId, existing)
    }

    const registrantsWithEntries: RegistrantWithEntries[] = registrantRows.map(r => ({
      ...r,
      entries: entriesByRegistrant.get(r.id) ?? [],
    }))

    return {
      competition,
      registrants: registrantsWithEntries,
      totalCount: registrantsWithEntries.length,
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[getCompetitionDashboard] Failed:', msg, error)
    return { error: 'Failed to load dashboard data' }
  }
}

/**
 * Remove a registrant and all their entries atomically via db.batch().
 * (db.transaction() is banned over Turso HTTP — Phase 6 D-08)
 */
export async function removeRegistrant(
  registrantId: string,
  competitionId: string
): Promise<{ success: true } | { error: string }> {
  try {
    if (!registrantId?.trim()) return { error: 'Registrant ID is required' }
    if (!competitionId?.trim()) return { error: 'Competition ID is required' }

    await db.batch([
      db.delete(registrationEntries).where(eq(registrationEntries.registrantId, registrantId)),
      db.delete(registrants).where(eq(registrants.id, registrantId)),
    ])

    revalidatePath('/organizerdb')

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[removeRegistrant] Failed:', msg, error)
    return { error: 'Failed to remove registrant' }
  }
}

/**
 * Update an existing registrant's editable fields.
 * Does not modify entries (events/serials) — only registrant metadata.
 */
export async function updateRegistrant(input: {
  registrantId: string
  competitionId: string
  lastName: string
  firstName: string
  gender: 'Male' | 'Female'
  bodyWeightKg: number
  country: string
  club: string | null
  coach: string | null
  isJudging: 0 | 1 | 2
}): Promise<{ success: true } | { error: string }> {
  try {
    if (!input.registrantId?.trim()) return { error: 'Registrant ID is required' }
    if (!input.competitionId?.trim()) return { error: 'Competition ID is required' }
    if (!input.bodyWeightKg || input.bodyWeightKg <= 0) return { error: 'Body weight must be a positive number' }
    if (input.gender !== 'Male' && input.gender !== 'Female') return { error: 'Gender must be Male or Female' }
    if (![0, 1, 2].includes(input.isJudging)) return { error: 'isJudging must be 0, 1, or 2' }

    await db
      .update(registrants)
      .set({
        lastName: input.lastName,
        firstName: input.firstName,
        gender: input.gender,
        bodyWeightKg: input.bodyWeightKg,
        country: input.country,
        club: input.club,
        coach: input.coach,
        isJudging: input.isJudging,
      })
      .where(eq(registrants.id, input.registrantId))

    revalidatePath('/organizerdb')

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[updateRegistrant] Failed:', msg, error)
    return { error: 'Failed to update registrant' }
  }
}

/**
 * Bulk-import registrants from validated CSV rows.
 * Serials are generated in a for-loop before db.batch() (same pattern as registerAthlete).
 */
export async function bulkImportRegistrants(input: {
  competitionId: string
  rows: CSVRow[]
}): Promise<{ imported: number } | { error: string }> {
  try {
    if (!input.competitionId?.trim()) return { error: 'Competition ID is required' }

    // Fetch competition to get serialPrefix
    const [comp] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, input.competitionId))

    if (!comp) return { error: 'Competition not found' }

    if (!Array.isArray(input.rows) || input.rows.length === 0) {
      return { error: 'No rows to import' }
    }

    const now = new Date()
    // Build all insert statements; serials generated sequentially before batch.
    // Drizzle db.batch() requires a non-empty tuple — we build the array and
    // cast to the required tuple type after validating rows.length > 0 above.
    type BatchStatement = Parameters<typeof db.batch>[0][number]
    const allInserts: BatchStatement[] = []

    // globalOffset tracks how many serials have been generated across all rows so far
    // (none are committed until the final db.batch()). Passing it as pendingOffset ensures
    // each serial gets a unique sequence number and avoids UNIQUE constraint violations.
    let globalOffset = 0

    for (const row of input.rows) {
      const registrantId = createId()

      // Generate one serial per event for this row
      const serials: string[] = []
      for (const _evt of row.events) {
        const serial = await generateCompetitionSerial(input.competitionId, comp.serialPrefix, globalOffset)
        globalOffset++
        serials.push(serial)
      }

      allInserts.push(
        db.insert(registrants).values({
          id: registrantId,
          competitionId: input.competitionId,
          lastName: row.lastName,
          firstName: row.firstName,
          gender: row.gender,
          bodyWeightKg: row.bodyWeightKg,
          country: row.country,
          club: row.club,
          coach: row.coach,
          isJudging: row.isJudging,
          createdAt: now,
        }) as unknown as BatchStatement
      )

      for (let i = 0; i < row.events.length; i++) {
        const evt = row.events[i]
        allInserts.push(
          db.insert(registrationEntries).values({
            registrantId,
            competitionId: input.competitionId,
            event: evt.event,
            bellWeight: evt.bellWeight,
            duration: evt.duration,
            serial: serials[i],
            createdAt: now,
          }) as unknown as BatchStatement
        )
      }
    }

    await db.batch(allInserts as unknown as Parameters<typeof db.batch>[0])

    revalidatePath('/organizerdb')

    return { imported: input.rows.length }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[bulkImportRegistrants] Failed:', msg, error)
    return { error: 'Failed to import registrants' }
  }
}
