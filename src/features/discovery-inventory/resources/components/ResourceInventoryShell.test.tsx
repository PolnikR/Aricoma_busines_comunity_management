import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { ResourceInventoryShell } from './ResourceInventoryShell'
import { ResourceInventoryPanel } from './ResourceInventoryPanel'
import { ResourceInventoryLoading, ResourceInventoryState } from './ResourceInventoryStates'

describe('ResourceInventoryShell', () => {
  it('keeps provider navigation and the view mounted through loading, failure, cached data and empty content', () => {
    const changeView = vi.fn()
    const retry = vi.fn()
    const error = { title: 'Inventory unavailable', retryLabel: 'Retry inventory', isRetrying: false, onRetry: retry }
    const view = (state: 'loading' | 'error' | 'cached' | 'empty') => (
      <ResourceInventoryShell inventoryTitle="Resource view" tabs={(
        <Tabs
          items={[{ value: 'vm-01', label: 'VMware VMs vm-01' }, { value: 'vm-03', label: 'VMware VMs vm-03' }]}
          value="vm-01"
          onChange={changeView}
          ariaLabel="Resource views"
          appearance="embedded"
        />
      )}>
        {state === 'loading' ? <ResourceInventoryLoading ariaLabel="Loading inventory" /> : state === 'empty' ? (
          <ResourceInventoryState>No inventory records</ResourceInventoryState>
        ) : (
          <ResourceInventoryPanel
            ariaLabel="VMware inventory"
            toolbar={<button type="button">Filters</button>}
            error={error}
            hasCachedData={state === 'cached'}
            pagination={<div>Inventory pagination</div>}
          >
            <div>Cached inventory rows</div>
          </ResourceInventoryPanel>
        )}
      </ResourceInventoryShell>
    )
    const { rerender } = render(view('loading'))
    const region = screen.getByRole('region', { name: 'Resource view' })
    const navigation = within(region).getByRole('tablist', { name: 'Resource views' })
    expect(within(region).getByRole('status', { name: 'Loading inventory' })).toHaveAttribute('aria-busy', 'true')

    rerender(view('error'))
    expect(screen.getByRole('region', { name: 'Resource view' })).toBe(region)
    expect(screen.getByRole('tablist', { name: 'Resource views' })).toBe(navigation)
    expect(screen.queryByText('Cached inventory rows')).not.toBeInTheDocument()
    expect(screen.queryByText('Inventory pagination')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry inventory' }))
    expect(retry).toHaveBeenCalledOnce()
    fireEvent.click(within(navigation).getByRole('tab', { name: 'VMware VMs vm-03' }))
    expect(changeView).toHaveBeenCalledWith('vm-03')

    rerender(view('cached'))
    expect(within(region).getByText('Cached inventory rows')).toBeInTheDocument()
    expect(within(region).getByText('Inventory pagination')).toBeInTheDocument()
    expect(within(region).getByRole('alert')).toHaveTextContent('Inventory unavailable')
    expect(within(region).getByRole('button', { name: 'Filters' })).toBeInTheDocument()

    rerender(view('empty'))
    expect(screen.getByRole('region', { name: 'Resource view' })).toBe(region)
    expect(screen.getByRole('tablist', { name: 'Resource views' })).toBe(navigation)
    expect(within(region).getByText('No inventory records')).toBeInTheDocument()
  })

  it('lets the inventory shrink around its metrics and rows within the route', () => {
    render(
      <ResourceInventoryShell inventoryTitle="Inventory records" metrics={<div>Metrics</div>}>
        <div>Rows</div>
      </ResourceInventoryShell>,
    )

    const section = screen.getByRole('region', { name: 'Inventory records' })
    expect(section).toHaveClass('lg:min-h-0')
    expect(section.parentElement).toHaveClass('lg:min-h-0')
    expect(screen.getByText('Metrics')).toBeInTheDocument()
    expect(screen.getByText('Rows')).toBeInTheDocument()
  })
})
