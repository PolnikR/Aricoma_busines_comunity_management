import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataTablePagination } from './DataTablePagination'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

afterEach(cleanup)

describe('DataTablePagination', () => {
  it('hides the rows-per-page control when only one page size is supported', () => {
    render(
      <DataTablePagination
        page={1}
        pageSize={10}
        total={22}
        pageSizeOptions={[10]}
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Showing 1-10 of 22')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: 'Rows per page' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument()
  })
})
