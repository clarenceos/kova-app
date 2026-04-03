'use client'

import { useRef, useState } from 'react'
import { Upload, Check, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { bulkImportRegistrants } from '@/lib/actions/dashboard'
import type { CSVRow } from '@/lib/actions/dashboard'

type ParsedRow = {
  data: CSVRow | null
  raw: Record<string, string>
  errors: string[]
  rowNumber: number
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes
      continue
    }
    if (char === ',' && !inQuotes) {
      result.push(current)
      current = ''
      continue
    }
    current += char
  }
  result.push(current)
  return result
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return []

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase())

  return lines.slice(1).map((line, idx) => {
    const values = parseCSVLine(line)
    const raw = Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? '']))
    const errors: string[] = []

    if (!raw['last name']) errors.push('Last name required')
    if (!raw['first name']) errors.push('First name required')

    const gender = raw['gender']
    if (gender !== 'Male' && gender !== 'Female') errors.push('Gender must be Male or Female')

    const bw = parseFloat(raw['body weight (kg)'])
    if (isNaN(bw) || bw <= 0) errors.push('Invalid body weight')

    if (!raw['country']) errors.push('Country required')

    const eventNames = (raw['events'] || '').split(',').map(e => e.trim().toUpperCase())
    const bellWeights = (raw['bell weights'] || '').split(',').map(b => b.trim())
    const duration = parseInt(raw['duration'] || '10', 10)
    if (duration !== 5 && duration !== 10) errors.push('Duration must be 5 or 10')

    const validEvents = ['LC', 'JERK', 'SNATCH']
    const events: CSVRow['events'] = []
    for (let i = 0; i < eventNames.length; i++) {
      if (!validEvents.includes(eventNames[i])) {
        errors.push(`Unknown event: ${eventNames[i]}`)
        continue
      }
      if (!bellWeights[i]) {
        errors.push(`Missing bell weight for ${eventNames[i]}`)
        continue
      }
      events.push({
        event: eventNames[i] as 'LC' | 'JERK' | 'SNATCH',
        bellWeight: bellWeights[i],
        duration,
      })
    }
    if (events.length === 0 && errors.length === 0) errors.push('At least one valid event required')

    const data: CSVRow | null =
      errors.length === 0
        ? {
            lastName: raw['last name'],
            firstName: raw['first name'],
            gender: gender as 'Male' | 'Female',
            bodyWeightKg: bw,
            country: raw['country'],
            events,
            club: raw['club'] || null,
            coach: raw['coach'] || null,
          }
        : null

    return { data, raw, errors, rowNumber: idx + 2 }
  })
}

export function CSVImportModal({
  competitionId,
  serialPrefix: _serialPrefix,
  onImported,
}: {
  competitionId: string
  serialPrefix: string
  onImported: () => void
}) {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validCount = parsedRows.filter(r => r.data !== null).length
  const errorCount = parsedRows.filter(r => r.data === null).length

  function resetState() {
    setFile(null)
    setParsedRows([])
    setIsImporting(false)
    setImportError(null)
  }

  function handleFile(f: File) {
    setFile(f)
    setImportError(null)
    const reader = new FileReader()
    reader.onload = e => {
      const text = e.target?.result as string
      setParsedRows(parseCSV(text))
    }
    reader.readAsText(f)
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
  }

  async function handleImport() {
    const validRows = parsedRows.filter(r => r.data !== null).map(r => r.data!)
    setIsImporting(true)
    setImportError(null)
    try {
      const result = await bulkImportRegistrants({ competitionId, rows: validRows })
      if ('error' in result) {
        setImportError(result.error)
        setIsImporting(false)
        return
      }
      setOpen(false)
      resetState()
      onImported()
    } catch {
      setImportError('Import failed. Please try again.')
      setIsImporting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        setOpen(next)
        if (!next) resetState()
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Upload className="h-4 w-4" /> Import CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import CSV</DialogTitle>
        </DialogHeader>

        {/* Section 1: File drop zone */}
        {!file && (
          <div
            className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-raw-steel/30 bg-forge-black p-8 transition-colors hover:border-bright-bronze/50 cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <Upload className="h-8 w-8 text-raw-steel" />
            <p className="mt-2 text-xs text-raw-steel">Drop CSV here or click to select</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) handleFile(f)
              }}
            />
          </div>
        )}

        {/* Section 2: Preview table */}
        {file && parsedRows.length > 0 && (
          <div className="max-h-72 overflow-auto rounded-lg border border-raw-steel/20">
            <table className="w-full border-collapse text-xs">
              <thead className="sticky top-0 bg-charcoal">
                <tr>
                  {['#', 'Last Name', 'First Name', 'Gender', 'Body Weight', 'Country', 'Events', 'Bell Weights', 'Duration', 'Club', 'Coach', 'Status'].map(h => (
                    <th key={h} className="px-2 py-1 border border-raw-steel/20 text-left text-raw-steel font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {parsedRows.map(row => (
                  <tr
                    key={row.rowNumber}
                    className={row.data !== null ? 'bg-green-950/30' : 'bg-red-950/30'}
                  >
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.rowNumber}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['last name'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['first name'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['gender'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['body weight (kg)'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['country'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['events'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['bell weights'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['duration'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['club'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20 text-parchment">{row.raw['coach'] ?? ''}</td>
                    <td className="px-2 py-1 border border-raw-steel/20">
                      {row.data !== null ? (
                        <Check className="h-3 w-3 text-green-400" />
                      ) : (
                        <span className="text-xs text-red-400">{row.errors.join('; ')}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Section 3: Summary bar */}
        {file && parsedRows.length > 0 && (
          <div className="flex items-center justify-between px-2 py-3">
            <span className="text-sm text-parchment">
              {validCount} valid, {errorCount} errors
            </span>
            {errorCount > 0 && (
              <span className="text-xs text-raw-steel">Invalid rows will be skipped</span>
            )}
          </div>
        )}

        {/* Import error */}
        {importError && (
          <div className="flex items-center gap-2 rounded-lg bg-red-950/30 px-3 py-2">
            <X className="h-4 w-4 text-red-400 shrink-0" />
            <span className="text-xs text-red-400">{importError}</span>
          </div>
        )}

        {/* Section 4: Action buttons */}
        {file && (
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setOpen(false)
                resetState()
              }}
            >
              Cancel
            </Button>
            <button
              className="rounded-lg bg-patina-bronze px-4 py-2 text-sm font-bold text-parchment transition-colors hover:bg-bright-bronze disabled:opacity-50"
              disabled={validCount === 0 || isImporting}
              onClick={handleImport}
            >
              {isImporting ? 'Importing...' : `Import ${validCount} valid rows`}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
