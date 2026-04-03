'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronsUpDown, Check } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Badge } from '@/components/ui/badge'
import type { Competition } from '@/lib/schema'

interface CompetitionSelectorProps {
  competitions: Competition[]
  selectedId: string | null
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'open') {
    return (
      <Badge className="border-transparent bg-green-900/30 text-green-400">Open</Badge>
    )
  }
  if (status === 'closed') {
    return (
      <Badge className="border-transparent bg-red-900/30 text-red-400">Closed</Badge>
    )
  }
  // draft (default)
  return (
    <Badge className="border-transparent bg-raw-steel/20 text-raw-steel">Draft</Badge>
  )
}

export function CompetitionSelector({ competitions, selectedId }: CompetitionSelectorProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const selected = competitions.find(c => c.id === selectedId) ?? null

  function handleSelect(compId: string) {
    setOpen(false)
    router.push(`/organizerdb?compId=${compId}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          aria-expanded={open}
          className="flex w-full items-center justify-between rounded-xl border border-raw-steel/30 bg-charcoal px-4 py-3 text-left text-sm transition-colors hover:border-raw-steel/60 focus:outline-none"
        >
          {selected ? (
            <span className="flex items-center gap-3">
              <span className="text-sm font-bold text-parchment">{selected.name}</span>
              <span className="text-xs text-raw-steel">{selected.date}</span>
              <StatusBadge status={selected.status} />
            </span>
          ) : (
            <span className="text-sm text-raw-steel/60">Select a competition</span>
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-raw-steel/60" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Search competitions..." />
          <CommandList>
            <CommandEmpty>No competitions found.</CommandEmpty>
            <CommandGroup>
              {competitions.map(comp => (
                <CommandItem
                  key={comp.id}
                  value={`${comp.name} ${comp.date}`}
                  onSelect={() => handleSelect(comp.id)}
                  className="flex items-center justify-between py-3"
                >
                  <span className="flex flex-col gap-0.5">
                    <span className="text-sm font-bold text-parchment">{comp.name}</span>
                    <span className="text-xs text-raw-steel">{comp.date}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <StatusBadge status={comp.status} />
                    {selectedId === comp.id && (
                      <Check className="h-4 w-4 text-patina-bronze" />
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
