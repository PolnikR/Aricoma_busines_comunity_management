import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { ResourceInventoryPanel } from './ResourceInventoryPanel'

describe('ResourceInventoryPanel', () => {
  it('keeps the toolbar available while replacing failed table content', () => {
    const onRetry = vi.fn()

    render(
      <ResourceInventoryPanel
        ariaLabel="Resource inventory"
        toolbar={<button type="button">Filters</button>}
        pagination={<div>Pagination</div>}
        error={{
          title: 'Inventory unavailable',
          description: 'Try another provider.',
          retryLabel: 'Retry loading',
          isRetrying: false,
          onRetry,
        }}
      >
        <div>Inventory rows</div>
      </ResourceInventoryPanel>,
    )

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Inventory unavailable')
    expect(screen.queryByText('Inventory rows')).not.toBeInTheDocument()
    expect(screen.queryByText('Pagination')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('renders table content and pagination when there is no error', () => {
    render(
      <ResourceInventoryPanel
        ariaLabel="Resource inventory"
        toolbar={<button type="button">Filters</button>}
        pagination={<div>Pagination</div>}
      >
        <div>Inventory rows</div>
      </ResourceInventoryPanel>,
    )

    expect(screen.getByText('Inventory rows')).toBeInTheDocument()
    expect(screen.getByText('Pagination')).toBeInTheDocument()
  })

  it('keeps toolbar and pagination outside a contained vertical data scrollbar', () => {
    render(
      <ResourceInventoryPanel
        ariaLabel="Resource inventory"
        toolbar={<button type="button">Filters</button>}
        pagination={<div>Pagination</div>}
      >
        <div>Inventory rows</div>
      </ResourceInventoryPanel>,
    )

    const panel = screen.getByRole('region', { name: 'Resource inventory' })
    expect(panel).toHaveClass('grid', 'grid-rows-[auto_minmax(0,1fr)_auto]', 'min-h-0', 'overflow-hidden')
    const dataRegion = panel.querySelector('.overflow-y-auto')
    expect(dataRegion).toHaveClass('custom-scrollbar', 'min-h-0', 'overflow-y-auto')
    expect(dataRegion).toContainElement(screen.getByText('Inventory rows'))
    expect(dataRegion).not.toContainElement(screen.getByRole('button', { name: 'Filters' }))
    expect(dataRegion).not.toContainElement(screen.getByText('Pagination'))
  })

  it('keeps metrics and notices outside the primary inventory surface', () => {
    render(
      <InventoryShell
        metrics={<div>Resource metrics</div>}
        notice={<div>Resource notice</div>}
        inventoryTitle="Resource inventory"
      >
        <ResourceInventoryPanel
          ariaLabel="Resource inventory table"
          toolbar={<div>Table toolbar</div>}
        >
          <div>Inventory rows</div>
        </ResourceInventoryPanel>
      </InventoryShell>,
    )

    const surface = screen.getByRole('region', { name: 'Resource inventory' })
    expect(surface).toContainElement(screen.getByRole('region', { name: 'Resource inventory table' }))
    expect(surface).not.toContainElement(screen.getByText('Resource metrics'))
    expect(surface).not.toContainElement(screen.getByText('Resource notice'))
  })
})
