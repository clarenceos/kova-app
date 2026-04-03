'use client'

import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { QrCode } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

export function QRCodeModal({ compId }: { compId: string }) {
  const [open, setOpen] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!open || !canvasRef.current) return
    const url = `${window.location.origin}/registration/${compId}`
    QRCode.toCanvas(canvasRef.current, url, {
      width: 256,
      margin: 2,
      color: { dark: '#EDE9E2', light: '#0D0D0D' },
    })
  }, [open, compId])

  function handleDownload() {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `kova-registration-qr-${compId.slice(0, 8)}.png`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" /> QR Code
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registration QR Code</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <canvas ref={canvasRef} className="rounded-lg" />
          <p className="text-xs text-raw-steel">Scan to open registration form</p>
          <button
            className="rounded-lg bg-patina-bronze px-4 py-2 text-sm font-bold text-parchment transition-colors hover:bg-bright-bronze"
            onClick={handleDownload}
          >
            Download QR as PNG
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
