import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RESOURCE_INVENTORY_MIN_HEIGHT, ResourceInventoryShell } from './ResourceInventoryShell'

describe('ResourceInventoryShell', () => {
  it('gives every Resources inventory card the short-viewport floor', () => {
    render(
      <ResourceInventoryShell inventoryTitle="Inventory records" metrics={<div>Metrics</div>}>
        <div>Rows</div>
      </ResourceInventoryShell>,
    )

    const section = screen.getByRole('region', { name: 'Inventory records' })
    expect(RESOURCE_INVENTORY_MIN_HEIGHT).toBe('lg:min-h-[480px]')
    expect(section).toHaveClass(RESOURCE_INVENTORY_MIN_HEIGHT)
    expect(section).not.toHaveClass('lg:min-h-0')
    expect(screen.getByText('Metrics')).toBeInTheDocument()
    expect(screen.getByText('Rows')).toBeInTheDocument()
  })
})
