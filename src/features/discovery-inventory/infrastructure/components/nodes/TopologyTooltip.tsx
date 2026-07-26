import { useEffect, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'

interface TopologyTooltipProps {
  nodeRef: RefObject<HTMLElement | null>
  estimatedHeight: number
  children: ReactNode
}

interface TopologyTooltipFieldProps {
  label: string
  value: string
}

interface Position {
  top: number
  left: number
}

const TOOLTIP_WIDTH = 260
const VIEWPORT_GAP = 8

function calculateTooltipPosition(node: HTMLElement, estimatedHeight: number): Position {
  const rect = node.getBoundingClientRect()
  let top = rect.top
  let left = rect.right + VIEWPORT_GAP

  if (left + TOOLTIP_WIDTH > window.innerWidth) {
    left = rect.left - TOOLTIP_WIDTH - VIEWPORT_GAP
  }

  if (top + estimatedHeight > window.innerHeight) {
    top = rect.top - estimatedHeight - VIEWPORT_GAP
  }

  return {
    top: Math.max(VIEWPORT_GAP, top),
    left: Math.max(VIEWPORT_GAP, left),
  }
}

export function TopologyTooltip({
  nodeRef,
  estimatedHeight,
  children,
}: TopologyTooltipProps) {
  const [position, setPosition] = useState<Position>({ top: 0, left: 0 })

  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    const updatePosition = () => {
      setPosition(calculateTooltipPosition(node, estimatedHeight))
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [estimatedHeight, nodeRef])

  return createPortal(
    <div
      className="pointer-events-auto fixed z-50 min-w-[260px] rounded-lg border border-slate-700 bg-slate-900 p-3 text-xs shadow-lg"
      style={{ top: position.top, left: position.left }}
    >
      {children}
    </div>,
    document.body,
  )
}

export function TopologyTooltipField({ label, value }: TopologyTooltipFieldProps) {
  return (
    <div className="text-xs">
      <span className="text-slate-400">{label}:</span>
      <span className="ml-2 truncate text-slate-100">{value}</span>
    </div>
  )
}
