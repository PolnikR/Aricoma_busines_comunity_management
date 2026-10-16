import { useLayoutEffect, useState } from 'react'

export function useDashboardLayout(host: HTMLElement | null): 'wide' | 'compact' | 'sections' {
  const [layout, setLayout] = useState<'wide' | 'compact' | 'sections'>('compact')
  useLayoutEffect(() => {
    if (!host) return
    const measure = () => {
      const { width, height } = host.getBoundingClientRect()
      if (!width || !height) return
      setLayout(width >= 1150 && height >= 740 ? 'wide' : width >= 850 && height >= 440 ? 'compact' : 'sections')
    }
    measure()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure)
      return () => { window.removeEventListener('resize', measure) }
    }
    const observer = new ResizeObserver(measure)
    observer.observe(host)
    return () => { observer.disconnect() }
  }, [host])
  return layout
}
