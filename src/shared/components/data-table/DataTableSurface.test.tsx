import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTableSurface } from './DataTableSurface'

describe('DataTableSurface', () => {
  it('keeps toolbar and footer outside the vertical data viewport', () => {
    render(
      <DataTableSurface
        ariaLabel="Inventory table"
        toolbar={<button type="button">Filters</button>}
        pagination={<div>Pagination</div>}
      >
        <div>Inventory rows</div>
      </DataTableSurface>,
    )

    const surface = screen.getByRole('region', { name: 'Inventory table' })
    const dataViewport = surface.querySelector('.overflow-y-auto')

    expect(surface).toHaveClass('grid', 'grid-rows-[auto_minmax(0,1fr)_auto]', 'rounded-[20px]')
    expect(surface).not.toHaveClass('rounded-2xl')
    expect(dataViewport).toHaveClass('custom-scrollbar', 'min-h-0', 'overflow-y-auto')
    expect(dataViewport).toContainElement(screen.getByText('Inventory rows'))
    expect(dataViewport).not.toContainElement(screen.getByRole('button', { name: 'Filters' }))
    expect(dataViewport).not.toContainElement(screen.getByText('Pagination'))
  })
})
