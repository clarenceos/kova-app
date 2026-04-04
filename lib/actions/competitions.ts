'use server'

import { revalidatePath } from 'next/cache'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { competitions } from '@/lib/schema'
import { deriveSerialPrefix } from '@/lib/queue/serial'

export async function createCompetition(input: {
  name: string
  date: string
  numPlatforms: number
  status: 'draft' | 'open'
  maxRegistrants: number | null
  registrationDeadline: string | null
  allowedDurations: 'both' | '10' | '5'
  allowedBellWeights: string[]
}): Promise<{ id: string } | { error: string }> {
  try {
    // Validate required fields
    if (!input.name?.trim()) return { error: 'Competition name is required' }
    if (!input.date) return { error: 'Date is required' }
    if (
      !Number.isInteger(input.numPlatforms) ||
      input.numPlatforms < 1 ||
      input.numPlatforms > 10
    ) {
      return { error: 'Enter a value between 1 and 10' }
    }
    if (!Array.isArray(input.allowedBellWeights) || input.allowedBellWeights.length < 1) {
      return { error: 'Select at least one bell weight' }
    }
    if (!['both', '10', '5'].includes(input.allowedDurations)) {
      return { error: 'Invalid duration rule' }
    }

    // Derive serial prefix server-side — server is source of truth (COMP-02, D-07)
    const serialPrefix = deriveSerialPrefix(input.name.trim())

    // Insert into DB
    const [row] = await db.insert(competitions).values({
      name: input.name.trim(),
      date: input.date,
      numPlatforms: input.numPlatforms,
      status: input.status,
      maxRegistrants: input.maxRegistrants || null,
      registrationDeadline: input.registrationDeadline || null,
      allowedDurations: input.allowedDurations,
      allowedBellWeights: JSON.stringify(input.allowedBellWeights),
      serialPrefix,
      createdAt: new Date(),
    }).returning({ id: competitions.id })

    revalidatePath('/organizerdb')

    return { id: row.id }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[createCompetition] Failed:', msg, error)
    return { error: `Failed to create competition: ${msg}` }
  }
}

export async function updateCompetitionStatus(
  compId: string,
  newStatus: 'draft' | 'open' | 'closed'
): Promise<{ success: true } | { error: string }> {
  try {
    if (!compId?.trim()) return { error: 'Competition ID is required' }
    if (!['draft', 'open', 'closed'].includes(newStatus)) {
      return { error: 'Invalid status value' }
    }

    await db
      .update(competitions)
      .set({ status: newStatus })
      .where(eq(competitions.id, compId))

    revalidatePath('/organizerdb')

    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[updateCompetitionStatus] Failed:', msg, error)
    return { error: `Failed to update status: ${msg}` }
  }
}
