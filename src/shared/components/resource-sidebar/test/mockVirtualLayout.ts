import { fireEvent } from '@testing-library/react'

const VIEWPORT_SELECTOR = '[data-testid="resource-sidebar-viewport"]'

interface VirtualLayout {
  viewportHeight?: number
  rowHeight?: number
  width?: number
}

/**
 * jsdom has no layout, so a virtualized ResourceSidebar measures a 0 px viewport and
 * renders no rows. This gives only the sidebar viewport and its rows a size; every
 * other element keeps jsdom's default. Returns a function that restores jsdom.
 */
export function mockVirtualLayout({ viewportHeight = 600, rowHeight = 36, width = 280 }: VirtualLayout = {}) {
  const originalHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight')
  const originalWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetWidth')
  const isViewport = (element: HTMLElement) => element.matches(VIEWPORT_SELECTOR)
  const isRow = (element: HTMLElement) => element.dataset['index'] !== undefined && element.closest(VIEWPORT_SELECTOR) !== null

  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get(this: HTMLElement) {
      if (isViewport(this)) return viewportHeight
      if (isRow(this)) return rowHeight
      return (originalHeight?.get?.call(this) as number | undefined) ?? 0
    },
  })
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', {
    configurable: true,
    get(this: HTMLElement) {
      if (isViewport(this) || isRow(this)) return width
      return (originalWidth?.get?.call(this) as number | undefined) ?? 0
    },
  })

  return () => {
    if (originalHeight) Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalHeight)
    if (originalWidth) Object.defineProperty(HTMLElement.prototype, 'offsetWidth', originalWidth)
  }
}

/** Makes the viewport scrollable in jsdom: `scrollTop` is writable and `scrollTo` scrolls. */
export function makeViewportScrollable(viewport: HTMLElement) {
  let scrollTop = 0
  Object.defineProperty(viewport, 'scrollTop', {
    configurable: true,
    get: () => scrollTop,
    set: (value: number) => { scrollTop = value },
  })
  viewport.scrollTo = ((options: ScrollToOptions) => {
    scrollTop = options.top ?? scrollTop
    fireEvent.scroll(viewport)
  }) as typeof viewport.scrollTo
  return (top: number) => {
    scrollTop = top
    fireEvent.scroll(viewport)
  }
}
