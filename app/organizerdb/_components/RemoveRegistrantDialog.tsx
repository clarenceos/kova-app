'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { removeRegistrant } from '@/lib/actions/dashboard'

interface RemoveRegistrantDialogProps {
  registrantName: string
  serials: string[]
  registrantId: string
  competitionId: string
  onRemoved: () => void
}

export function RemoveRegistrantDialog({
  registrantName,
  serials,
  registrantId,
  competitionId,
  onRemoved,
}: RemoveRegistrantDialogProps) {
  const [isRemoving, setIsRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpenChange(open: boolean) {
    if (!open) {
      onRemoved()
    }
  }

  async function handleRemove() {
    setIsRemoving(true)
    setError(null)
    try {
      const result = await removeRegistrant(registrantId, competitionId)
      if ('error' in result) {
        setError(result.error)
        setIsRemoving(false)
        return // keep dialog open on error
      }
      onRemoved() // close dialog and trigger refresh
    } catch {
      setError('Failed to remove registrant')
      setIsRemoving(false)
    }
  }

  return (
    <Dialog open={true} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove {registrantName}?</DialogTitle>
          <DialogDescription>
            This will delete their registration and all serial numbers (
            {serials.join(', ')}). This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isRemoving}
          >
            Cancel
          </Button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
            disabled={isRemoving}
            onClick={handleRemove}
          >
            {isRemoving ? 'Removing...' : 'Remove Registrant'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
