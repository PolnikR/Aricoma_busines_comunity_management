import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ResourceInventoryLoading, ResourceInventoryState } from './ResourceInventoryStates'

describe('ResourceInventoryLoading', () => {
  it('fits the loading table to the inventory panel without horizontal scrolling', () => {
    render(<ResourceInventoryLoading ariaLabel="Loading resources" />)

    const loadingRegion = screen.getByRole('status', { name: 'Loading resources' })
    const table = within(loadingRegion).getByRole('table', { hidden: true })

    expect(loadingRegion).toHaveClass(
      'flex-1',
      'min-h-0',
    )
    expect(loadingRegion).not.toHaveClass('border', 'shadow-sm', 'overflow-hidden')
    expect(loadingRegion).toHaveAttribute('aria-busy', 'true')
    expect(table).toHaveClass('w-full', 'table-fixed')
    expect(table.parentElement).toHaveClass('min-h-0', 'overflow-hidden')
  })

  it('fills the view content area for empty and fatal states without another card', () => {
    render(<ResourceInventoryState><div>Inventory state</div></ResourceInventoryState>)

    const state = screen.getByText('Inventory state').closest('section')
    expect(state).toHaveClass(
      'flex-1',
      'min-w-0',
      'min-h-0',
      'flex',
      'items-center',
      'justify-center',
    )
    expect(state).not.toHaveClass('border', 'shadow-sm', 'overflow-hidden')
  })
})
