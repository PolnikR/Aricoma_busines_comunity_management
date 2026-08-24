export interface TooltipPosition {
  top: number
  left: number
}

const TOOLTIP_WIDTH = 260
const VIEWPORT_GAP = 8

export function calculateTooltipPosition(
  node: HTMLElement,
  estimatedHeight: number,
): TooltipPosition {
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
