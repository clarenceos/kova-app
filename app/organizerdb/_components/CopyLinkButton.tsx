'use client'

import { useState } from 'react'
import { Clipboard, Check } from 'lucide-react'

export function CopyLinkButton({ compId }: { compId: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const url = `${window.location.origin}/registration/${compId}`
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handleCopy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-raw-steel/30 px-3 py-1.5 text-xs text-parchment transition-colors hover:bg-charcoal"
    >
      {copied ? <Check className="h-4 w-4" /> : <Clipboard className="h-4 w-4" />}
      {copied ? 'Copied!' : 'Copy Link'}
    </button>
  )
}
