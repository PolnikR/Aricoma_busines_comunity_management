import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResourceInventoryLoading } from './ResourceInventoryStates'

describe('ResourceInventoryLoading', () => {
  it('fits the loading table to the inventory panel without horizontal scrolling', () => {
    render(<ResourceInventoryLoading ariaLabel="Loading resources" />)

    const loadingRegion = screen.getByRole('status', { name: 'Loading resources' })
    const table = within(loadingRegion).getByRole('table', { hidden: true })

    expect(table).toHaveClass('w-full', 'table-fixed')
    expect(table.parentElement).toHaveClass('min-h-0', 'overflow-hidden')
  })
})
