import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTableToolbar } from './DataTableToolbar'

describe('DataTableToolbar', () => {
  it('initializes and applies a filter panel with custom labels', () => {
    const onFilterOpen = vi.fn()
    const onApplyFilters = vi.fn()
    render(
      <DataTableToolbar
        searchValue=""
        onSearchChange={vi.fn()}
        filterPanel={<div>Filter content</div>}
        filterButtonLabel="Open filters"
        applyLabel="Save filters"
        onFilterOpen={onFilterOpen}
        onApplyFilters={onApplyFilters}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Open filters' }))
    expect(onFilterOpen).toHaveBeenCalledOnce()
    expect(screen.getByText('Filter content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save filters' }))
    expect(onApplyFilters).toHaveBeenCalledOnce()
    expect(screen.queryByText('Filter content')).not.toBeInTheDocument()
  })
})
