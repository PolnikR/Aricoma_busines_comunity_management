import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { DataTableToolbar } from './DataTableToolbar'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('DataTableToolbar', () => {
  it('clears a non-empty search and returns focus to the field', () => {
    const onSearchChange = vi.fn()
    render(<DataTableToolbar searchValue="airflow" onSearchChange={onSearchChange} searchLabel="Search providers" />)

    fireEvent.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(onSearchChange).toHaveBeenCalledWith('')
    expect(screen.getByRole('searchbox', { name: 'Search providers' })).toHaveFocus()
  })

  it('offers no clear action for an empty or locked search', () => {
    const { rerender } = render(<DataTableToolbar searchValue="" onSearchChange={vi.fn()} />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()

    rerender(<DataTableToolbar searchValue="fixed-" onSearchChange={vi.fn()} searchDisabled />)
    expect(screen.queryByRole('button', { name: 'Clear search' })).not.toBeInTheDocument()
  })

  it('switches density with icon buttons that keep their accessible names', () => {
    const onDensityChange = vi.fn()
    render(<DataTableToolbar searchValue="" onSearchChange={vi.fn()} density="compact" onDensityChange={onDensityChange} />)

    const comfortable = screen.getByRole('button', { name: 'comfortable' })
    expect(comfortable).toHaveAttribute('aria-pressed', 'false')
    expect(comfortable).toHaveAttribute('title', 'Comfortable')
    expect(comfortable).toHaveTextContent('')
    expect(screen.getByRole('button', { name: 'compact' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(comfortable)
    expect(onDensityChange).toHaveBeenCalledWith('comfortable')
  })

  it('shows a count next to a quick filter segment when one is given', () => {
    render(
      <DataTableToolbar
        searchValue=""
        onSearchChange={vi.fn()}
        segments={[{ label: 'All', value: '', count: 12 }, { label: 'Airflow', value: 'AIRFLOW' }]}
        segmentValue=""
        onSegmentChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'All 12' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Airflow' })).toBeInTheDocument()
  })

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

  it('keeps the filter trigger in the toolbar and modal actions in its footer', () => {
    render(
      <DataTableToolbar
        searchValue=""
        onSearchChange={vi.fn()}
        filterPanel={<div>Filter fields</div>}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Filters' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    fireEvent.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Filters' })
    const filterFields = screen.getByText('Filter fields')
    const applyButton = screen.getByRole('button', { name: 'Apply' })
    const footer = applyButton.parentElement
    expect(dialog).toContainElement(filterFields)
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Cancel' }))
    expect(footer).toContainElement(screen.getByRole('button', { name: 'Clear all' }))
    expect(filterFields.parentElement).not.toContainElement(applyButton)
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
