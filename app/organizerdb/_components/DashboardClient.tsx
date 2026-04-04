'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { Download } from 'lucide-react'
import type { Competition } from '@/lib/schema'
import type { RegistrantWithEntries } from '@/lib/actions/dashboard'
import { updateCompetitionStatus } from '@/lib/actions/competitions'
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select'
import { CompetitionSelector } from './CompetitionSelector'
import { AnalyticsBar } from './AnalyticsBar'
import { RegistrationsTable } from './RegistrationsTable'
import { CSVImportModal } from './CSVImportModal'
import { QRCodeModal } from './QRCodeModal'
import { GenerateQueueModal } from './GenerateQueueModal'
import { CopyLinkButton } from './CopyLinkButton'

const CSV_TEMPLATE_HEADERS = 'Last Name,First Name,Gender,Body Weight (kg),Country,Events,Bell Weights,Duration,Club,Coach'
const CSV_TEMPLATE_EXAMPLE = 'Dela Cruz,Juan,Male,72.5,Philippines,"LC,JERK","2x16,2x16",10,Girya Manila,Coach Name'

function statusSelectClass(status: string): string {
  if (status === 'open') return 'h-7 w-28 text-xs bg-green-700/20 text-green-400 border-green-700/40'
  if (status === 'closed') return 'h-7 w-28 text-xs bg-red-700/20 text-red-400 border-red-700/40'
  return 'h-7 w-28 text-xs'
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

  function handleExportTemplate() {
    const csv = `${CSV_TEMPLATE_HEADERS}\n${CSV_TEMPLATE_EXAMPLE}`
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'registration-template.csv'
    a.click()
    URL.revokeObjectURL(url)
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
                  <Select
                    value={dashboardData.competition.status}
                    onValueChange={(val: string) => {
                      startTransition(async () => {
                        await updateCompetitionStatus(
                          dashboardData.competition.id,
                          val as 'draft' | 'open' | 'closed'
                        )
                        window.location.reload()
                      })
                    }}
                    disabled={isPending}
                  >
                    <SelectTrigger className={statusSelectClass(dashboardData.competition.status)}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
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
            <button
              type="button"
              onClick={handleExportTemplate}
              title="Download a blank CSV template for bulk registration import"
              className="inline-flex items-center gap-1.5 rounded-xl border border-raw-steel/30 px-3 py-1.5 text-xs text-raw-steel transition-colors hover:border-parchment/50 hover:text-parchment"
            >
              <Download className="h-3 w-3" />
              CSV Template
            </button>
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
