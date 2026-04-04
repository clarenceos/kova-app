'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { Competition } from '@/lib/schema'
import type { RegistrantWithEntries } from '@/lib/actions/dashboard'
import { updateCompetitionStatus } from '@/lib/actions/competitions'
import { CompetitionSelector } from './CompetitionSelector'
import { AnalyticsBar } from './AnalyticsBar'
import { RegistrationsTable } from './RegistrationsTable'
import { CSVImportModal } from './CSVImportModal'
import { QRCodeModal } from './QRCodeModal'
import { GenerateQueueModal } from './GenerateQueueModal'
import { CopyLinkButton } from './CopyLinkButton'

const STATUS_CYCLE: Record<string, 'draft' | 'open' | 'closed'> = {
  draft: 'open',
  open: 'closed',
  closed: 'draft',
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'open') {
    return <Badge className="bg-green-700 text-white">open</Badge>
  }
  if (status === 'closed') {
    return <Badge className="bg-red-700 text-white">closed</Badge>
  }
  return <Badge className="bg-raw-steel text-parchment">draft</Badge>
}

interface DashboardClientProps {
  competitions: Competition[]
  selectedCompId: string | null
  dashboardData: {
    competition: Competition
    registrants: RegistrantWithEntries[]
    totalCount: number
  } | null
}

export function DashboardClient({
  competitions,
  selectedCompId,
  dashboardData,
}: DashboardClientProps) {
  const [isPending, startTransition] = useTransition()

  function handleStatusCycle() {
    if (!dashboardData) return
    const currentStatus = dashboardData.competition.status
    const nextStatus = STATUS_CYCLE[currentStatus] ?? 'draft'
    startTransition(async () => {
      await updateCompetitionStatus(dashboardData.competition.id, nextStatus)
      window.location.reload()
    })
  }

  return (
    <div>
      {/* Top row: Competition selector + New Competition button */}
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <CompetitionSelector competitions={competitions} selectedId={selectedCompId} />
        </div>
        <Link
          href="/organizerdb/create"
          className="shrink-0 inline-flex items-center rounded-2xl bg-patina-bronze px-6 py-3 font-bold text-parchment transition-colors hover:bg-bright-bronze"
        >
          New Competition
        </Link>
      </div>

      {/* Empty state: no competitions exist */}
      {competitions.length === 0 && (
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

      {/* No selection state: competitions exist but none selected */}
      {competitions.length > 0 && !selectedCompId && (
        <p className="mt-12 text-center text-sm text-raw-steel">
          Select a competition above to view registrations and manage your event.
        </p>
      )}

      {/* Competition selected: show full dashboard */}
      {dashboardData && (
        <div className="mt-8">
          {/* Action bar */}
          <div className="flex flex-wrap items-start gap-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-3">
                <CopyLinkButton compId={dashboardData.competition.id} />
                <QRCodeModal compId={dashboardData.competition.id} />
              </div>
              <p className="text-xs text-raw-steel">Share this link with your athletes</p>
              <div className="flex items-center gap-4 mt-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-raw-steel">Status:</span>
                  <StatusBadge status={dashboardData.competition.status} />
                  <button
                    onClick={handleStatusCycle}
                    disabled={isPending}
                    title="Cycle competition status"
                    className="rounded p-1 text-raw-steel transition-colors hover:text-parchment disabled:opacity-50"
                  >
                    <RefreshCw className="h-3 w-3" />
                  </button>
                </div>
                <span className="text-xs text-raw-steel">
                  Serial prefix:{' '}
                  <span className="font-mono text-parchment">
                    {dashboardData.competition.serialPrefix}
                  </span>
                </span>
              </div>
            </div>
            <CSVImportModal
              competitionId={dashboardData.competition.id}
              serialPrefix={dashboardData.competition.serialPrefix}
              onImported={() => {
                // Reload page to refresh server data
                window.location.reload()
              }}
            />
            <GenerateQueueModal
              compId={dashboardData.competition.id}
              registrantCount={dashboardData.totalCount}
              numPlatforms={dashboardData.competition.numPlatforms}
            />
          </div>

          {/* Analytics bar */}
          <div className="mt-6">
            <AnalyticsBar
              competition={dashboardData.competition}
              registrants={dashboardData.registrants}
              totalCount={dashboardData.totalCount}
            />
          </div>

          {/* Registrations table */}
          <RegistrationsTable
            registrants={dashboardData.registrants}
            competitionId={dashboardData.competition.id}
          />
        </div>
      )}
    </div>
  )
}
