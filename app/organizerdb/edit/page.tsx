import { notFound } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { db } from '@/lib/db'
import { competitions } from '@/lib/schema'
import { EditCompetitionForm } from './_components/EditCompetitionForm'

export default async function EditCompetitionPage({
  searchParams,
}: {
  searchParams: Promise<{ compId?: string }>
}) {
  const params = await searchParams
  const compId = params?.compId

  if (!compId) return notFound()

  const [competition] = await db
    .select()
    .from(competitions)
    .where(eq(competitions.id, compId))

  if (!competition) return notFound()

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-[640px]">
        <h1 className="mb-12 text-2xl font-bold text-parchment">Edit Competition</h1>

        <div className="rounded-xl bg-card p-8 ring-1 ring-foreground/10">
          <EditCompetitionForm competition={competition} />
        </div>
      </div>
    </div>
  )
}
