import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const items = [
  { value: 'overview', label: 'Overview' },
  { value: 'details', label: 'Details' },
] as const

describe('Tabs', () => {
  const overflowItems = Array.from({ length: 10 }, (_, index) => ({
    value: `tab-${String(index)}`,
    label: `Tab ${String(index + 1)}`,
  }))

  beforeEach(() => {
    HTMLElement.prototype.scrollIntoView = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('exposes the selected tab and changes it on click', () => {
    const onChange = vi.fn()
    render(<Tabs items={items} value="overview" onChange={onChange} ariaLabel="Sections" />)

    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(screen.getByRole('tab', { name: 'Details' }))
    expect(onChange).toHaveBeenCalledWith('details')
  })

  it('supports arrow-key navigation', () => {
    const onChange = vi.fn()
    render(<Tabs items={items} value="overview" onChange={onChange} ariaLabel="Sections" />)

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Overview' }), { key: 'ArrowRight' })
    expect(onChange).toHaveBeenCalledWith('details')
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveFocus()
  })

  it('uses an inset selected indicator when explicitly configured', () => {
    const onChange = vi.fn()
    render(
      <Tabs
        items={items}
        value="overview"
        onChange={onChange}
        ariaLabel="Sections"
        indicator="inset"
      />,
    )

    const selectedTab = screen.getByRole('tab', { name: 'Overview' })
    expect(selectedTab).toHaveClass(
      'relative',
      'border-transparent',
      'after:absolute',
      'after:bottom-1.5',
      'after:inset-x-4',
      'after:h-0.5',
      'after:rounded-full',
      'after:bg-accent',
    )
  })

  it('shows scroll controls for an overflowing tab list and moves between boundaries', () => {
    const onChange = vi.fn()
    render(
      <Tabs
        items={overflowItems}
        value="tab-0"
        onChange={onChange}
        ariaLabel="Inventory sources"
        scrollControls={{ previousLabel: 'Previous source tabs', nextLabel: 'Next source tabs' }}
      />,
    )

    const tabList = screen.getByRole('tablist', { name: 'Inventory sources' })
    let scrollLeft = 0
    Object.defineProperties(tabList, {
      clientWidth: { configurable: true, value: 240 },
      scrollWidth: { configurable: true, value: 960 },
      scrollLeft: {
        configurable: true,
        get: () => scrollLeft,
        set: (value: number) => { scrollLeft = value },
      },
    })
    const scrollBy = vi.fn()
    Object.defineProperty(tabList, 'scrollBy', { configurable: true, value: scrollBy })
    fireEvent(window, new Event('resize'))

    const previous = screen.getByRole('button', { name: 'Previous source tabs' })
    const next = screen.getByRole('button', { name: 'Next source tabs' })
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()

    fireEvent.click(next)
    expect(scrollBy).toHaveBeenCalledWith(expect.objectContaining({ behavior: 'smooth' }))

    scrollLeft = 720
    fireEvent.scroll(tabList)
    expect(previous).toBeEnabled()
    expect(next).toBeDisabled()
  })

  it('does not show scroll controls when the configured tab list fits', () => {
    const onChange = vi.fn()
    render(
      <Tabs
        items={overflowItems.slice(0, 3)}
        value="tab-0"
        onChange={onChange}
        ariaLabel="Inventory sources"
        scrollControls={{ previousLabel: 'Previous source tabs', nextLabel: 'Next source tabs' }}
      />,
    )

    const tabList = screen.getByRole('tablist', { name: 'Inventory sources' })
    Object.defineProperties(tabList, {
      clientWidth: { configurable: true, value: 960 },
      scrollWidth: { configurable: true, value: 960 },
    })
    fireEvent(window, new Event('resize'))

    expect(screen.queryByRole('button', { name: 'Previous source tabs' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next source tabs' })).not.toBeInTheDocument()
  })
})
