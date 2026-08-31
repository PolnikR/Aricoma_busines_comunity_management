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

  it('keeps static pagination copy and skeletonizes only response counts while loading', () => {
    const { container } = render(
      <DataTablePagination
        page={1}
        pageSize={10}
        total={0}
        isLoading
        onPageChange={vi.fn()}
        onPageSizeChange={vi.fn()}
      />,
    )

    const pagination = container.firstElementChild
    const summary = screen.getByText((content, element) => element?.tagName === 'SPAN' && content.includes('Showing'))
    expect(pagination).toHaveAttribute('aria-busy', 'true')
    expect(summary).toHaveTextContent('Showing')
    expect(summary).toHaveTextContent('of')
    expect(summary).not.toHaveTextContent('0')
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThanOrEqual(5)
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled()
  })
})
