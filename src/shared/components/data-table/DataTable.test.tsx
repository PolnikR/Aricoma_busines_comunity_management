import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DataTable, type ColumnDef } from './DataTable'

interface Row {
  id: string
  name: string
  description: string
}

const columns: ColumnDef<Row>[] = [
  { id: 'name', header: 'Name', cell: row => row.name },
  { id: 'description', header: 'Description', cell: row => row.description },
]

const rows: Row[] = [
  { id: 'row-1', name: 'A very long resource name', description: 'A long description that should wrap inside the available table width.' },
]

describe('DataTable', () => {
  it('fits to its container without a horizontal scrolling surface when requested', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        rowKey={row => row.id}
        ariaLabel="Fit table"
        layout="fit"
      />,
    )

    const wrapper = screen.getByLabelText('Fit table')
    const table = within(wrapper).getByRole('table')
    expect(wrapper).toHaveClass('overflow-x-hidden')
    expect(wrapper).not.toHaveAttribute('tabindex')
    expect(table).toHaveClass('w-full', 'table-fixed')
    expect(within(table).getByRole('columnheader', { name: 'Description' })).toHaveClass('whitespace-normal', 'break-words')
  })

  it('keeps the existing scroll layout as the default', () => {
    render(<DataTable columns={columns} rows={rows} rowKey={row => row.id} ariaLabel="Scroll table" />)

    const wrapper = screen.getByLabelText('Scroll table')
    expect(wrapper).toHaveClass('overflow-x-auto')
    expect(wrapper).toHaveAttribute('tabindex', '0')
  })

  it('keeps real headers visible and skeletonizes only body values while loading', () => {
    const { container } = render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={row => row.id}
        ariaLabel="Loading resources"
        isLoading
        loadingRowCount={3}
      />,
    )

    const wrapper = screen.getByRole('status', { name: 'Loading resources' })
    const table = within(wrapper).getByRole('table')
    expect(wrapper).toHaveAttribute('aria-busy', 'true')
    expect(wrapper).not.toHaveAttribute('tabindex')
    expect(within(table).getByRole('columnheader', { name: 'Name' })).toBeVisible()
    expect(within(table).getByRole('columnheader', { name: 'Description' })).toBeVisible()
    expect(container.querySelectorAll('tbody tr')).toHaveLength(3)
    expect(container.querySelector('tbody')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByText('No records found')).not.toBeInTheDocument()
  })
})
