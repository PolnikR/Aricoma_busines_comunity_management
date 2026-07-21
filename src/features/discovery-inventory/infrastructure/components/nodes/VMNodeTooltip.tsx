import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

interface VMNodeTooltipProps {
  data: {
    name: string
    status: string
    cpu?: number
    memory?: number
    disk?: number
    ipAddress?: string
    host?: string
    cluster?: string
    tags?: string[]
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
  const tooltipHeight = 220 // Approximate, may need adjustment

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

export function VMNodeTooltip({ data, nodeRef }: VMNodeTooltipProps) {
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
        <Field label="Status" value={data.status} />
        {data.cpu !== undefined && <Field label="CPU" value={`${data.cpu} cores`} />}
        {data.cpu === undefined && <Field label="CPU" value="—" />}
        {data.memory !== undefined && <Field label="Memory" value={`${data.memory} GB`} />}
        {data.memory === undefined && <Field label="Memory" value="—" />}
        {data.disk !== undefined && <Field label="Disk" value={`${data.disk} GB`} />}
        {data.disk === undefined && <Field label="Disk" value="—" />}
        <Field label="IP" value={data.ipAddress || '—'} />
        <Field label="Host" value={data.host || '—'} />
        <Field label="Cluster" value={data.cluster || '—'} />

        {data.tags && data.tags.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-400">Tags</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {data.tags.map(tag => (
                <span
                  key={tag}
                  className="inline-block rounded bg-slate-700 px-2 py-1 text-slate-200"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(tooltipContent, document.body)
}

export type { VMNodeTooltipProps }
