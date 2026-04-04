'use client'

interface InsertBlockRowProps {
  afterIndex: number
  colSpan: number
  onInsertBlock: (afterIndex: number) => void
}

export function InsertBlockRow({ afterIndex, colSpan, onInsertBlock }: InsertBlockRowProps) {
  return (
    <tr className="h-0 group">
      <td colSpan={colSpan} className="p-0">
        <button
          type="button"
          className="mx-auto block h-4 w-full opacity-0 group-hover:opacity-100 transition-opacity text-raw-steel/40 hover:text-patina-bronze text-xs"
          onClick={() => onInsertBlock(afterIndex)}
        >
          + Insert block
        </button>
      </td>
    </tr>
  )
}
