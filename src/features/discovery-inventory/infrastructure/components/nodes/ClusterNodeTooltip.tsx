import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface ClusterNodeTooltipProps {
  data: {
    name: string
    description: string
    hostCount: number
  }
  nodeRef: React.RefObject<HTMLElement | null>
}

interface Position {
  top: number
  left: number
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-xs">
      <span className="text-slate-400">{label}:</span>
      <span className="ml-2 truncate text-slate-100">{value}</span>
    </div>
  )
}

function calculateTooltipPosition(nodeElement: HTMLElement): Position {
  const rect = nodeElement.getBoundingClientRect()
  const tooltipWidth = 260
  const tooltipHeight = 120

  // Default: top-right of node
  let top = rect.top
  let left = rect.right + 8 // 8px gap from node

  // Smart repositioning if tooltip would clip off-screen
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  // If tooltip goes off right edge, position to left of node
  if (left + tooltipWidth > viewportWidth) {
    left = rect.left - tooltipWidth - 8
  }

  // If still off-screen (node is very far left), clamp to viewport
  if (left < 0) {
    left = 8
  }

  // If tooltip goes off bottom edge, position above node
  if (top + tooltipHeight > viewportHeight) {
    top = rect.top - tooltipHeight - 8
  }

  // If still off-screen (node is very high), clamp to viewport
  if (top < 0) {
    top = 8
  }

  return { top, left }
}

export function ClusterNodeTooltip({ data, nodeRef }: ClusterNodeTooltipProps) {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!nodeRef.current) return

    const updatePosition = () => {
      const newPosition = calculateTooltipPosition(nodeRef.current!)
      setPosition(newPosition)
    }

    // Calculate initial position
    updatePosition()

    // Recalculate on window resize or scroll
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition)
    }
  }, [nodeRef])

  const hostLabel = data.hostCount === 1 ? 'host' : 'hosts'

  const tooltipContent = (
    <div
      ref={tooltipRef}
      className="fixed z-50 rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-lg min-w-[260px] pointer-events-auto"
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
    >
      <div className="space-y-2">
        <Field label="Name" value={data.name} />
        <Field label="Description" value={data.description} />
        <Field label="Hosts" value={`${data.hostCount} ${hostLabel}`} />
      </div>
    </div>
  )

  return createPortal(tooltipContent, document.body)
}

export type { ClusterNodeTooltipProps }
