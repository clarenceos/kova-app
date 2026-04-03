'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Calendar } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

export function GenerateQueueModal({
  compId,
  registrantCount,
  numPlatforms,
}: {
  compId: string
  registrantCount: number
  numPlatforms: number
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [startTime, setStartTime] = useState('09:00')

  const isDisabled = registrantCount === 0

  function calculateFinishTime(): string {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startMinutes = hours * 60 + minutes
    const numBlocks = Math.ceil(registrantCount / numPlatforms)
    const totalMinutes = numBlocks * 15
    const finishMinutes = startMinutes + totalMinutes
    const finishHours = Math.floor(finishMinutes / 60)
    const finishMins = finishMinutes % 60
    return `${String(finishHours).padStart(2, '0')}:${String(finishMins).padStart(2, '0')}`
  }

  function handleConfirm() {
    const [hours, minutes] = startTime.split(':').map(Number)
    const startTimeMinutes = hours * 60 + minutes
    router.push(`/organizerdb/queue?compId=${compId}&startTime=${startTimeMinutes}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                className="gap-2 bg-patina-bronze text-parchment hover:bg-bright-bronze"
                disabled={isDisabled}
                onClick={() => !isDisabled && setOpen(true)}
              >
                <Calendar className="h-4 w-4" /> Generate Queue
              </Button>
            </span>
          </TooltipTrigger>
          {isDisabled && (
            <TooltipContent>Need at least 1 registrant to generate queue</TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Generate Queue</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Start time input */}
          <div>
            <label className="text-sm font-medium text-parchment">Start Time</label>
            <input
              type="time"
              value={startTime}
              onChange={e => setStartTime(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-raw-steel/30 bg-charcoal px-3 py-2 text-parchment focus:border-patina-bronze focus:outline-none"
            />
          </div>

          {/* Summary */}
          <div className="rounded-lg bg-forge-black p-4 space-y-2">
            <p className="text-sm text-parchment">
              {registrantCount} registrant{registrantCount !== 1 ? 's' : ''} across{' '}
              {numPlatforms} platform{numPlatforms !== 1 ? 's' : ''}
            </p>
            <p className="text-sm text-raw-steel">
              Estimated finish: {calculateFinishTime()}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <button
            className="rounded-lg bg-patina-bronze px-4 py-2 text-sm font-bold text-parchment transition-colors hover:bg-bright-bronze"
            onClick={handleConfirm}
          >
            Generate
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
