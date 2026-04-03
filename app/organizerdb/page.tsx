import { db } from '@/lib/db'
import { competitions } from '@/lib/schema'
import { desc } from 'drizzle-orm'
import Link from 'next/link'
import {
  Card,
  CardHeader,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CopyLinkButton } from './_components/CopyLinkButton'

export default async function OrganizerPage() {
  const allCompetitions = await db
    .select()
    .from(competitions)
    .orderBy(desc(competitions.createdAt))

  return (
    <div className="min-h-screen bg-background px-8 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Header row */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-parchment">Your Competitions</h1>
          <Link
            href="/organizerdb/create"
            className="inline-flex items-center rounded-2xl bg-patina-bronze px-6 py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze"
          >
            New Competition
          </Link>
        </div>

        {/* Empty state */}
        {allCompetitions.length === 0 && (
          <div className="mt-16 text-center">
            <h2 className="text-lg font-medium text-parchment">No competitions yet</h2>
            <p className="mt-2 text-sm text-raw-steel">
              Create your first competition to get a shareable registration link.
            </p>
            <Link
              href="/organizerdb/create"
              className="mt-6 inline-flex items-center rounded-2xl bg-patina-bronze px-6 py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze"
            >
              Create Competition
            </Link>
          </div>
        )}

        {/* Competition cards */}
        {allCompetitions.length > 0 && (
          <div className="space-y-4">
            {allCompetitions.map(comp => (
              <Card key={comp.id}>
                <CardHeader>
                  <CardTitle className="text-parchment">{comp.name}</CardTitle>
                  <CardAction>
                    {comp.status === 'open' ? (
                      <Badge className="bg-bright-bronze/20 text-bright-bronze border-transparent">
                        Open
                      </Badge>
                    ) : (
                      <Badge className="bg-raw-steel/20 text-raw-steel border-transparent">
                        Draft
                      </Badge>
                    )}
                  </CardAction>
                  <CardDescription>
                    {comp.date} &mdash; {comp.numPlatforms} platform{comp.numPlatforms !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-2 text-xs text-raw-steel">
                    Serial prefix: {comp.serialPrefix}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="truncate text-sm text-bright-bronze">
                      /registration/{comp.id}
                    </span>
                    <CopyLinkButton compId={comp.id} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
