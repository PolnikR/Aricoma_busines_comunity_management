import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResourceInventoryShell } from './ResourceInventoryShell'

describe('ResourceInventoryShell', () => {
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
