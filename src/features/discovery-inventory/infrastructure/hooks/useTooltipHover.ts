import { useEffect, useRef, useState } from 'react'

interface UseTooltipHoverOptions {
  delay?: number
}

export function useTooltipHover(options: UseTooltipHoverOptions = {}) {
  const { delay = 500 } = options
  const [showTooltip, setShowTooltip] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      setShowTooltip(true)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setShowTooltip(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return {
    showTooltip,
    nodeRef,
    handleMouseEnter,
    handleMouseLeave,
  }
}
