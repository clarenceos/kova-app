'use server'

import { db } from '@/lib/db'
import { competitions, registrants, registrationEntries } from '@/lib/schema'
import type { Competition, Registrant, RegistrationEntry } from '@/lib/schema'
import { eq } from 'drizzle-orm'

export interface RegistrantWithEntries extends Registrant {
  entries: RegistrationEntry[]
}

export async function getCompetitionDashboard(compId: string): Promise<{
  competition: Competition
  registrants: RegistrantWithEntries[]
  totalCount: number
} | { error: string }> {
  try {
    // Fetch competition
    const [competition] = await db
      .select()
      .from(competitions)
      .where(eq(competitions.id, compId))

    if (!competition) return { error: 'Competition not found' }

    // Fetch all registrants for this competition
    const allRegistrants = await db
      .select()
      .from(registrants)
      .where(eq(registrants.competitionId, compId))

    // Fetch all registration entries for this competition
    const allEntries = await db
      .select()
      .from(registrationEntries)
      .where(eq(registrationEntries.competitionId, compId))

    // Join entries onto registrants
    const registrantsWithEntries: RegistrantWithEntries[] = allRegistrants.map(r => ({
      ...r,
      entries: allEntries.filter(e => e.registrantId === r.id),
    }))

    return {
      competition,
      registrants: registrantsWithEntries,
      totalCount: allRegistrants.length,
    }
  } catch (error) {
    console.error('[getCompetitionDashboard] Failed:', error)
    return { error: 'Failed to load competition data.' }
  }
}
