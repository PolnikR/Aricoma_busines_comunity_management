import { useEffect, useState } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import { calculateTooltipPosition, type TooltipPosition } from '../../helpers/calculateTooltipPosition'

interface TopologyTooltipProps {
  nodeRef: RefObject<HTMLElement | null>
  estimatedHeight: number
  children: ReactNode
}

interface TopologyTooltipFieldProps {
  label: string
  value: string
}

export function TopologyTooltip({
  nodeRef,
  estimatedHeight,
  children,
}: TopologyTooltipProps) {
  const [position, setPosition] = useState<TooltipPosition>({ top: 0, left: 0 })

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
      role="tooltip"
      className="pointer-events-auto fixed z-50 min-w-[260px] rounded-lg border border-inverse-control bg-inverse-surface p-3 text-xs text-inverse-text shadow-lg"
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
      <span className="text-inverse-muted">{label}:</span>
      <span className="ml-2 truncate text-inverse-text">{value}</span>
    </div>
  )
}
