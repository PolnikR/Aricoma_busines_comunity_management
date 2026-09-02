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
      'overflow-hidden',
      '!rounded-[20px]',
      'border',
      'border-border',
      'bg-surface',
      'shadow-sm',
    )
    expect(table).toHaveClass('w-full', 'table-fixed')
    expect(table.parentElement).toHaveClass('min-h-0', 'overflow-hidden')
  })

  it('uses the canonical primary-surface geometry for empty and fatal states', () => {
    render(<ResourceInventoryState><div>Inventory state</div></ResourceInventoryState>)

    const state = screen.getByText('Inventory state').closest('section')
    expect(state).toHaveClass(
      'flex-1',
      'min-w-0',
      'min-h-0',
      'grid',
      'grid-rows-[auto_minmax(0,1fr)_auto]',
      'overflow-hidden',
      'rounded-[20px]',
      'border',
      'border-border',
      'bg-surface',
      'shadow-sm',
    )
    expect(state).not.toHaveClass('rounded-2xl')
  })
})
