import { useState } from 'react'
import { Button } from '@/shared/components/button/Button'

/** Short visual label; the identifier remains available to keyboard and touch users. */
export function TruncatedText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  if (text.length <= 16) return <span className="min-w-0 break-all">{text}</span>
  return (
    <Button size="xs" variant="ghost" aria-label={text} aria-expanded={expanded || hovered || focused}
      title={text} className="h-auto min-w-0 max-w-full justify-start break-all px-0 text-left text-xs"
      onMouseEnter={() => { setHovered(true) }} onMouseLeave={() => { setHovered(false) }}
      onFocus={() => { setFocused(true) }} onBlur={() => { setFocused(false); setExpanded(false) }}
      onClick={() => { setExpanded(value => !value) }}
      onKeyDown={event => { if (event.key === 'Escape') { setExpanded(false); setFocused(false); setHovered(false) } }}>
      {expanded || hovered || focused ? text : `${text.slice(0, 7)}…${text.slice(-4)}`}
    </Button>
  )
}
