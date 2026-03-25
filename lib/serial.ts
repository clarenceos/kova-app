import { db } from '@/lib/db'
import { scores } from '@/lib/schema'
import { eq } from 'drizzle-orm'

function randomSerial(): string {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const letters = Array.from({ length: 3 }, () => alpha[Math.floor(Math.random() * 26)]).join('')
  const digits = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `${letters}-${digits}`
}

export async function generateSerial(): Promise<string> {
  try {
    for (;;) {
      const candidate = randomSerial()
      const existing = await db
        .select({ serial: scores.serial })
        .from(scores)
        .where(eq(scores.serial, candidate))
        .limit(1)
      if (existing.length === 0) return candidate
    }
  } catch {
    // DB check failed — return unchecked serial (collision risk negligible at 175M combinations)
    return randomSerial()
  }
}
