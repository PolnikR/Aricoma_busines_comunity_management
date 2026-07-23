import { useEffect, useState } from 'react'

interface UseResizablePanelOptions {
  open: boolean
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
  step?: number
}

interface ResizeHandleProps {
  role: 'separator'
  'aria-orientation': 'vertical'
  'aria-label': string
  'aria-valuenow': number
  'aria-valuemin': number
  'aria-valuemax': number
  tabIndex: 0
  onMouseDown: (event: React.MouseEvent) => void
  onKeyDown: (event: React.KeyboardEvent) => void
}

interface UseResizablePanelResult {
  width: number
  handleProps: ResizeHandleProps
}

// Drives a horizontally resizable side panel. Resize is in-view only: the width
// resets to the default whenever `open` becomes false, so reopening the panel
// starts at the default size. Spread `handleProps` onto a drag handle element
// (left edge for a right-anchored panel) and apply `width` to the panel.
export function useResizablePanel({
  open,
  defaultWidth = 420,
  minWidth = 360,
  maxWidth = 720,
  step = 16,
}: UseResizablePanelOptions): UseResizablePanelResult {
  const [width, setWidth] = useState(defaultWidth)

  const clamp = (value: number) => Math.min(maxWidth, Math.max(minWidth, value))

  useEffect(() => {
    if (open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWidth(defaultWidth)
  }, [open, defaultWidth])

  const onMouseDown = (event: React.MouseEvent) => {
    event.preventDefault()
    const startX = event.clientX
    const startWidth = width
    const onMove = (moveEvent: MouseEvent) => {
      setWidth(clamp(startWidth + (startX - moveEvent.clientX)))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setWidth((current) => clamp(current + step))
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      setWidth((current) => clamp(current - step))
    }
  }

  return {
    width,
    handleProps: {
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-label': 'Resize panel',
      'aria-valuenow': width,
      'aria-valuemin': minWidth,
      'aria-valuemax': maxWidth,
      tabIndex: 0,
      onMouseDown,
      onKeyDown,
    },
  }
}
