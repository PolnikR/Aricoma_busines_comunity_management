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
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByText('Filter content')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save filters' }))
    expect(onApplyFilters).toHaveBeenCalledOnce()
    expect(screen.queryByText('Filter content')).not.toBeInTheDocument()
  })

  it('keeps the filter dialog launchable while disabling mutable controls', () => {
    render(
      <DataTableToolbar
        searchValue="fixed-"
        onSearchChange={vi.fn()}
        searchDisabled
        filterControlsDisabled
        filterPanel={<input aria-label="Filter field" />}
      />,
    )

    expect(screen.getByRole('searchbox')).toBeDisabled()
    const filterButton = screen.getByRole('button', { name: 'Filters' })
    expect(filterButton).not.toBeDisabled()
    fireEvent.click(filterButton)
    expect(screen.getByRole('button', { name: 'Clear all' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled()
  })
})
