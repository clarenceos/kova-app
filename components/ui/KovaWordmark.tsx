interface KovaWordmarkProps {
  className?: string
  height?: number
}

export function KovaWordmark({ className, height = 22 }: KovaWordmarkProps) {
  const fontSize = height
  const textY = Math.round(height * 0.85)

  return (
    <svg
      height={height}
      viewBox={`0 0 ${height * 4} ${height}`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="KOVA"
      role="img"
      overflow="visible"
      className={className}
    >
      <text
        y={textY}
        fill="currentColor"
        style={{
          fontFamily: "'Tomorrow', system-ui, sans-serif",
          fontWeight: 600,
          fontSize: `${fontSize}px`,
          letterSpacing: '-0.02em',
        }}
      >
        KOVA
      </text>
    </svg>
  )
}
