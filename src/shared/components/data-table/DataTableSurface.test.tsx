import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTableSurface } from './DataTableSurface'
import { InventoryFrameContext } from '../inventory-shell/InventoryCompositionContext'
import { InventoryPanel } from '../inventory-shell/InventoryPanel'
import { DataTableSkeleton } from './DataTableSkeleton'

describe('DataTableSurface', () => {
  it('inherits the nearest frame through a feature wrapper and respects explicit overrides', () => {
    function FeatureContent() {
      return <InventoryPanel ariaLabel="Inherited inventory" toolbar={null}><div>Rows</div></InventoryPanel>
    }
    render(
      <InventoryFrameContext.Provider value="embedded">
        <div><FeatureContent /></div>
        <DataTableSkeleton columnCount={2} ariaLabel="Inherited loading" />
        <DataTableSurface ariaLabel="Independent inventory" toolbar={null} frame="standalone">Independent rows</DataTableSurface>
      </InventoryFrameContext.Provider>,
    )
    expect(screen.getByRole('region', { name: 'Inherited inventory' })).not.toHaveAttribute('data-table-surface')
    expect(screen.getByRole('region', { name: 'Independent inventory' })).toHaveAttribute('data-table-surface')
    expect(screen.getByRole('status', { name: 'Inherited loading' })).toHaveAttribute('aria-busy', 'true')
  })

  it.each(['standalone', 'embedded'] as const)('keeps toolbar and footer outside the vertical data viewport (%s)', (frame) => {
    render(
      <DataTableSurface
        ariaLabel="Inventory table"
        frame={frame}
        toolbar={<button type="button">Filters</button>}
        pagination={<div>Pagination</div>}
      >
        <div>Inventory rows</div>
      </DataTableSurface>,
    )

    const surface = screen.getByRole('region', { name: 'Inventory table' })
    const dataViewport = surface.querySelector('.overflow-y-auto')

    expect(surface).toHaveClass('grid', 'grid-rows-[auto_minmax(0,1fr)_auto]')
    expect(dataViewport).toHaveClass('custom-scrollbar', 'min-h-0', 'overflow-y-auto')
    expect(dataViewport).toContainElement(screen.getByText('Inventory rows'))
    expect(dataViewport).not.toContainElement(screen.getByRole('button', { name: 'Filters' }))
    expect(dataViewport).not.toContainElement(screen.getByText('Pagination'))
  })

  it('marks itself so a surrounding InventoryShell can drop its own frame', () => {
    render(
      <DataTableSurface ariaLabel="Inventory table" toolbar={null}>
        <div>Inventory rows</div>
      </DataTableSurface>,
    )

    expect(screen.getByRole('region', { name: 'Inventory table' })).toHaveAttribute('data-table-surface')
  })
})
