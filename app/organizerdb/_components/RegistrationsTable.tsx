'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react'
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip'
import { RemoveRegistrantDialog } from './RemoveRegistrantDialog'
import type { RegistrantWithEntries } from '@/lib/actions/dashboard'

type SortColumn = 'name' | 'bodyweight' | 'registeredAt'
type SortDirection = 'asc' | 'desc'

export function RegistrationsTable({
  registrants,
  competitionId,
}: {
  registrants: RegistrantWithEntries[]
  competitionId: string
}) {
  const router = useRouter()
  const [sortConfig, setSortConfig] = useState<{ column: SortColumn; direction: SortDirection }>({
    column: 'registeredAt',
    direction: 'desc',
  })
  const [eventFilter, setEventFilter] = useState<string | null>(null)
  const [genderFilter, setGenderFilter] = useState<string | null>(null)
  const [removingRegistrant, setRemovingRegistrant] = useState<RegistrantWithEntries | null>(null)

  function handleSort(column: string) {
    setSortConfig(prev => ({
      column: column as SortColumn,
      direction: prev.column === column ? (prev.direction === 'asc' ? 'desc' : 'asc') : 'asc',
    }))
  }

  function SortableHeader({ label, columnKey }: { label: string; columnKey: string }) {
    const isActive = sortConfig.column === columnKey
    const Icon = isActive ? (sortConfig.direction === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
    return (
      <TableHead
        className="cursor-pointer select-none text-xs text-raw-steel hover:text-parchment"
        onClick={() => handleSort(columnKey)}
      >
        <span className="inline-flex items-center gap-1">
          {label} <Icon className="h-3 w-3" />
        </span>
      </TableHead>
    )
  }

  if (registrants.length === 0) {
    return (
      <p className="mt-8 text-center text-sm text-raw-steel">
        No registrations yet — share the registration link or import a CSV to get started.
      </p>
    )
  }

  // Filter
  let filtered = registrants
  if (eventFilter) {
    filtered = filtered.filter(r => r.entries.some(e => e.event === eventFilter))
  }
  if (genderFilter) {
    filtered = filtered.filter(r => r.gender === genderFilter)
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortConfig.direction === 'asc' ? 1 : -1
    switch (sortConfig.column) {
      case 'name':
        return dir * `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`)
      case 'bodyweight':
        return dir * (a.bodyWeightKg - b.bodyWeightKg)
      case 'registeredAt':
        return dir * (a.createdAt.getTime() - b.createdAt.getTime())
      default:
        return 0
    }
  })

  const pillBase = 'rounded-full border px-3 py-1 text-xs font-medium transition-colors'
  const pillActive = 'bg-patina-bronze/20 text-bright-bronze border-bright-bronze/30'
  const pillInactive = 'bg-charcoal text-raw-steel border-raw-steel/20 hover:bg-charcoal/80'

  return (
    <div className="mt-6">
      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['All', 'LC', 'Jerk', 'Snatch'] as const).map(evt => {
          const value = evt === 'All' ? null : evt
          const isActive = eventFilter === value
          return (
            <button
              key={evt}
              className={`${pillBase} ${isActive ? pillActive : pillInactive}`}
              onClick={() => setEventFilter(isActive ? null : value)}
            >
              {evt}
            </button>
          )
        })}
        <span className="mx-2 h-4 w-px bg-raw-steel/20" />
        {(['All', 'M', 'F'] as const).map(gen => {
          const value = gen === 'All' ? null : gen
          const isActive = genderFilter === value
          return (
            <button
              key={gen}
              className={`${pillBase} ${isActive ? pillActive : pillInactive}`}
              onClick={() => setGenderFilter(isActive ? null : value)}
            >
              {gen}
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-raw-steel/20 bg-charcoal">
        <Table>
          <TableHeader>
            <TableRow className="border-raw-steel/20">
              <TableHead className="text-xs text-raw-steel">#</TableHead>
              <SortableHeader label="Full Name" columnKey="name" />
              <TableHead className="text-xs text-raw-steel">Gender</TableHead>
              <SortableHeader label="Bodyweight" columnKey="bodyweight" />
              <TableHead className="text-xs text-raw-steel">Country</TableHead>
              <TableHead className="text-xs text-raw-steel">Events</TableHead>
              <TableHead className="text-xs text-raw-steel">Club</TableHead>
              <TableHead className="text-xs text-raw-steel">Coach</TableHead>
              <SortableHeader label="Registered At" columnKey="registeredAt" />
              <TableHead className="text-xs text-raw-steel">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.map((reg, index) => (
              <TableRow key={reg.id} className="border-raw-steel/20">
                <TableCell className="text-sm text-raw-steel">{index + 1}</TableCell>
                <TableCell className="text-sm text-parchment">
                  {reg.lastName}, {reg.firstName}
                </TableCell>
                <TableCell className="text-sm text-parchment">{reg.gender}</TableCell>
                <TableCell className="text-sm text-parchment">{reg.bodyWeightKg} kg</TableCell>
                <TableCell className="text-sm text-parchment">{reg.country}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {reg.entries.map(entry => (
                      <Badge
                        key={entry.id}
                        className="bg-charcoal text-parchment text-xs border-raw-steel/20"
                        variant="outline"
                      >
                        {entry.event}
                      </Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-raw-steel">{reg.club ?? '—'}</TableCell>
                <TableCell className="text-sm text-raw-steel">{reg.coach ?? '—'}</TableCell>
                <TableCell className="text-xs text-raw-steel">
                  {reg.createdAt.toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          className="rounded p-1 text-raw-steel hover:bg-red-950/30 hover:text-red-400 transition-colors"
                          onClick={() => setRemovingRegistrant(reg)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Remove registrant</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Remove registrant</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Remove dialog */}
      {removingRegistrant && (
        <RemoveRegistrantDialog
          registrantName={`${removingRegistrant.lastName}, ${removingRegistrant.firstName}`}
          serials={removingRegistrant.entries.map(e => e.serial)}
          registrantId={removingRegistrant.id}
          competitionId={competitionId}
          onRemoved={() => {
            setRemovingRegistrant(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
