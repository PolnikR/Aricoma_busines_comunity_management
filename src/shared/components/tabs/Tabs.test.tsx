import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from './Tabs'

const items = [
  { value: 'overview', label: 'Overview' },
  { value: 'details', label: 'Details' },
] as const

describe('Tabs', () => {
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

  it('reveals overflow controls and scrolls through a long tab list', () => {
    const longItems = Array.from({ length: 10 }, (_, index) => ({
      value: `provider-${String(index + 1)}`,
      label: `VMware provider ${String(index + 1)}`,
    }))
    render(
      <Tabs
        items={longItems}
        value="provider-1"
        onChange={vi.fn()}
        ariaLabel="VMware sources"
        scrollControls={{ previousLabel: 'Previous sources', nextLabel: 'Next sources' }}
      />,
    )

    const tablist = screen.getByRole('tablist', { name: 'VMware sources' })
    let scrollLeft = 0
    Object.defineProperties(tablist, {
      clientWidth: { configurable: true, value: 240 },
      scrollWidth: { configurable: true, value: 720 },
      scrollLeft: {
        configurable: true,
        get: () => scrollLeft,
        set: (value: number) => { scrollLeft = value },
      },
      scrollBy: {
        configurable: true,
        value: ({ left }: ScrollToOptions) => {
          scrollLeft += left ?? 0
          fireEvent.scroll(tablist)
        },
      },
    })
    fireEvent(window, new Event('resize'))

    const previous = screen.getByRole('button', { name: 'Previous sources' })
    const next = screen.getByRole('button', { name: 'Next sources' })
    expect(previous).toBeDisabled()
    expect(next).toBeEnabled()

    fireEvent.click(next)

    expect(scrollLeft).toBeGreaterThan(0)
    expect(previous).toBeEnabled()
  })

  it('reveals a newly active tab and exposes full string labels as titles', () => {
    const longItems = [
      ...items,
      { value: 'archive', label: 'Long provider name for the archive site' },
    ]
    const view = render(
      <Tabs
        items={longItems}
        value="overview"
        onChange={vi.fn()}
        ariaLabel="Sections"
        scrollControls={{ previousLabel: 'Previous', nextLabel: 'Next' }}
      />,
    )
    const archiveTab = screen.getByRole('tab', { name: 'Long provider name for the archive site' })
    const scrollIntoView = vi.fn()
    Object.defineProperty(archiveTab, 'scrollIntoView', { configurable: true, value: scrollIntoView })

    view.rerender(
      <Tabs
        items={longItems}
        value="archive"
        onChange={vi.fn()}
        ariaLabel="Sections"
        scrollControls={{ previousLabel: 'Previous', nextLabel: 'Next' }}
      />,
    )

    expect(scrollIntoView).toHaveBeenCalled()
    expect(archiveTab).toHaveAttribute('title', 'Long provider name for the archive site')
  })
})
