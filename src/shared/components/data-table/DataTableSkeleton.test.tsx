import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTableSkeleton } from './DataTableSkeleton'

describe('DataTableSkeleton', () => {
  it('renders the requested table shape and accessible loading state', () => {
    render(<DataTableSkeleton columnCount={4} rowCount={3} ariaLabel="Loading providers" />)

    const skeleton = screen.getByRole('status', { name: 'Loading providers' })
    expect(skeleton).toHaveAttribute('aria-busy', 'true')

    const table = within(skeleton).getByRole('table', { hidden: true })
    expect(within(table).getAllByRole('columnheader', { hidden: true })).toHaveLength(4)
    expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(4)
  })

  it('can omit the toolbar and pagination', () => {
    render(
      <DataTableSkeleton
        columnCount={2}
        showToolbar={false}
        showPagination={false}
      />,
    )

    const skeleton = screen.getByRole('status')
    expect(skeleton.children).toHaveLength(1)
    expect(within(skeleton).getAllByRole('columnheader', { hidden: true })).toHaveLength(2)
  })
})
