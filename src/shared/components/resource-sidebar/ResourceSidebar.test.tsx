import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ResourceSidebar } from './ResourceSidebar'
import { makeViewportScrollable, mockVirtualLayout } from './test/mockVirtualLayout'

const labels = {
  title: 'Available resources',
  searchPlaceholder: 'Search resources',
  loadingLabel: 'Loading resources',
  noItemsLabel: 'No resources',
  noMatchesLabel: 'No matches',
  errorTitle: 'Failed',
  staleErrorTitle: 'Latest request failed',
  staleErrorDescription: 'Showing previous data',
  retryLabel: 'Retry',
}

describe('ResourceSidebar', () => {
  let restoreLayout: () => void
  beforeEach(() => { restoreLayout = mockVirtualLayout() })
  afterEach(() => { restoreLayout() })

  it('keeps static sidebar controls mounted while only remote entries load', () => {
    render(
      <ResourceSidebar
        {...labels}
        items={[]}
        dragDataKey="vm-name"
        isLoading
      />,
    )

    expect(screen.getByRole('heading', { name: 'Available resources' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Search resources' })).toBeDisabled()
    expect(screen.getByRole('status', { name: 'Loading resources' })).toBeInTheDocument()
    expect(screen.queryByText('No resources')).not.toBeInTheDocument()
  })

  it('deduplicates, sorts, filters, and exposes resources only as drag sources', async () => {
    const user = userEvent.setup()
    const setData = vi.fn()
    render(
      <ResourceSidebar
        {...labels}
        items={['WEB-02', 'DB-01', 'WEB-02']}
        dragDataKey="vm-name"
      />,
    )

    expect(screen.getByRole('heading', { name: 'Available resources' }).parentElement?.parentElement)
      .toHaveClass('h-full', 'min-h-0', 'overflow-hidden')
    expect(screen.getAllByRole('listitem').map(item => item.textContent)).toEqual(['DB-01', 'WEB-02'])
    fireEvent.dragStart(screen.getByText('DB-01'), {
      dataTransfer: { setData },
    })
    expect(setData).toHaveBeenCalledWith('vm-name', 'DB-01')

    await user.clear(screen.getByRole('searchbox', { name: 'Search resources' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'web')
    expect(screen.queryByText('DB-01')).not.toBeInTheDocument()
  })

  it('shows the loading list while a server search runs without locking the search input', () => {
    render(
      <ResourceSidebar
        {...labels}
        items={['DB-01']}
        dragDataKey="vm-name"
        searchValue="WEB"
        onSearchChange={vi.fn()}
        isSearching
      />,
    )

    const searchbox = screen.getByRole('searchbox', { name: 'Search resources' })
    expect(screen.getByRole('status', { name: 'Loading resources' })).toBeInTheDocument()
    expect(searchbox).toBeEnabled()
    expect(searchbox).toHaveValue('WEB')
    expect(screen.queryByText('DB-01')).not.toBeInTheDocument()
    expect(screen.queryByText('No matches')).not.toBeInTheDocument()
  })

  it('reports controlled server search text without locally filtering server results', () => {
    const onSearchChange = vi.fn()
    render(
      <ResourceSidebar
        {...labels}
        items={['DB-01']}
        dragDataKey="vm-name"
        searchValue="WEB"
        onSearchChange={onSearchChange}
      />,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search resources' }), {
      target: { value: 'WEB-01' },
    })

    expect(onSearchChange).toHaveBeenCalledWith('WEB-01')
    expect(screen.getByText('DB-01')).toBeInTheDocument()
  })

  describe('virtualized list', () => {
    const manyItems = Array.from({ length: 5000 }, (_, index) => `VM-${String(index).padStart(4, '0')}`)
    const viewport = () => screen.getByTestId('resource-sidebar-viewport')
    const rowTransform = (index: number) => viewport().querySelector<HTMLElement>(`[data-index="${String(index)}"]`)?.style.transform

    function renderMany(props: Partial<Parameters<typeof ResourceSidebar>[0]> = {}) {
      const view = render(<ResourceSidebar {...labels} items={manyItems} dragDataKey="vm-name" {...props} />)
      return { ...view, scrollTo: makeViewportScrollable(viewport()) }
    }

    it('renders only the visible part of a large list and reveals later items on scroll', () => {
      const { scrollTo } = renderMany()

      const rendered = screen.getAllByRole('listitem')
      expect(rendered.length).toBeGreaterThan(0)
      expect(rendered.length).toBeLessThan(200)
      expect(screen.getByText('VM-0000')).toBeInTheDocument()
      expect(screen.queryByText('VM-4999')).not.toBeInTheDocument()

      scrollTo(5000 * 40)

      expect(screen.getByText('VM-4999')).toBeInTheDocument()
      expect(screen.queryByText('VM-0000')).not.toBeInTheDocument()
    })

    it('positions rows absolutely inside a spacer sized to the whole list', () => {
      renderMany()

      const list = screen.getByRole('list', { name: 'Available resources' })
      expect(list.parentElement).toBe(viewport())
      expect(list).toHaveClass('relative')
      expect(parseFloat(list.style.height)).toBeGreaterThan(5000 * 36)
      const firstRow = screen.getAllByRole('listitem')[0]
      expect(firstRow).toHaveAttribute('data-index', '0')
      expect(firstRow).toHaveClass('absolute', 'left-0', 'top-0', 'w-full')
      expect(firstRow?.style.transform).toMatch(/^translateY\(/)
    })

    it('tells assistive technology the full list size', () => {
      renderMany()

      const firstRow = screen.getAllByRole('listitem')[0]
      expect(firstRow).toHaveAttribute('aria-setsize', '5000')
      expect(firstRow).toHaveAttribute('aria-posinset', '1')
    })

    it('searches locally across the whole dataset, not only the rendered rows', async () => {
      const user = userEvent.setup()
      renderMany({ itemLabels: { 'VM-4321': 'Payroll database' } })

      await user.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'payroll')

      expect(screen.getAllByRole('listitem')).toHaveLength(1)
      expect(screen.getByText('Payroll database')).toBeInTheDocument()
      expect(screen.getByText('VM-4321')).toBeInTheDocument()
    })

    it('renders server results without filtering them locally', () => {
      renderMany({ searchValue: 'NO-MATCH', onSearchChange: vi.fn() })

      expect(screen.getByText('VM-0000')).toBeInTheDocument()
      expect(screen.getAllByRole('listitem')[0]).toHaveAttribute('aria-setsize', '5000')
    })

    it('sets drag data and renders the item action on virtual rows', () => {
      const setData = vi.fn()
      renderMany({ renderItemAction: item => <button type="button" disabled={item === 'VM-0001'}>Add {item}</button> })

      fireEvent.dragStart(screen.getByText('VM-0002'), { dataTransfer: { setData } })

      expect(setData).toHaveBeenCalledWith('vm-name', 'VM-0002')
      expect(screen.getByRole('button', { name: 'Add VM-0001' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'Add VM-0002' })).toBeEnabled()
    })

    it('keeps the dragged row mounted while the list scrolls away from it', () => {
      const setData = vi.fn()
      const { scrollTo } = renderMany()

      fireEvent.dragStart(screen.getByText('VM-0002'), { dataTransfer: { setData } })
      scrollTo(5000 * 40)

      expect(screen.getByText('VM-4999')).toBeInTheDocument()
      expect(screen.getByText('VM-0002')).toBeInTheDocument()

      fireEvent.dragEnd(screen.getByText('VM-0002'))

      expect(screen.queryByText('VM-0002')).not.toBeInTheDocument()
    })

    it('keeps the list virtualized and unshifted under a stale refresh error', () => {
      const { unmount } = renderMany()
      const transformWithoutError = rowTransform(0)
      unmount()

      const { scrollTo } = renderMany({ error: new Error('Refresh failed') })

      const banner = screen.getByText('Latest request failed')
      expect(viewport()).not.toContainElement(banner)
      expect(screen.getAllByRole('listitem').length).toBeLessThan(200)
      expect(screen.getByText('VM-0000')).toBeInTheDocument()
      expect(rowTransform(0)).toBe(transformWithoutError)

      scrollTo(5000 * 40)

      expect(screen.getByText('VM-4999')).toBeInTheDocument()
    })

    it('scrolls back to the list start when the search changes, also under a stale error', async () => {
      const user = userEvent.setup()
      const { scrollTo } = renderMany({ error: new Error('Refresh failed') })
      scrollTo(5000 * 40)
      expect(viewport().scrollTop).toBeGreaterThan(0)

      await user.type(screen.getByRole('searchbox', { name: 'Search resources' }), 'VM-1')

      expect(viewport().scrollTop).toBe(0)
      expect(screen.getByText('VM-1000')).toBeInTheDocument()
    })

    it.each([
      ['loading', { isLoading: true }, () => screen.getByRole('status', { name: 'Loading resources' })],
      ['a blocking error', { items: [] as string[], error: new Error('Provider down') }, () => screen.getByText('Provider down')],
      ['no items', { items: [] as string[] }, () => screen.getByText('No resources')],
      ['no matches', { searchValue: 'X', onSearchChange: vi.fn(), items: [] as string[] }, () => screen.getByText('No matches')],
    ] as const)('shows the %s state inside the viewport instead of rows', (_, props, findState) => {
      renderMany(props)

      expect(within(viewport()).getByText((_content, element) => element === findState())).toBeInTheDocument()
      expect(screen.queryByRole('listitem')).not.toBeInTheDocument()
    })
  })
})
