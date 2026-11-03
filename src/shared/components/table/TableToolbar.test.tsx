import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { TableToolbar } from './TableToolbar'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('TableToolbar', () => {
  afterEach(cleanup)

  it('renders PageHeader with title and description', () => {
    render(
      <TableToolbar
        title="Test Title"
        description="Test Description"
      />
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('shows Refresh button when onRefresh is provided', () => {
    const onRefresh = vi.fn()
    render(
      <TableToolbar
        title="Title"
        description="Description"
        onRefresh={onRefresh}
      />
    )

    const refreshBtn = screen.getByRole('button', { name: /refresh/i })
    expect(refreshBtn).toBeInTheDocument()
    fireEvent.click(refreshBtn)
    expect(onRefresh).toHaveBeenCalled()
  })

  it('shows Updating indicator when isFetching is true', () => {
    render(
      <TableToolbar
        title="Title"
        description="Description"
        isFetching={true}
      />
    )

    expect(screen.getByText('Updating')).toBeInTheDocument()
  })

  it('shows Refresh as an icon button named by its label', () => {
    render(<TableToolbar title="Title" description="Description" onRefresh={vi.fn()} refreshLabel="Reload list" />)

    const refreshBtn = screen.getByRole('button', { name: 'Reload list' })
    expect(refreshBtn).toHaveAttribute('title', 'Reload list')
    expect(refreshBtn).toHaveTextContent('')
    expect(refreshBtn).not.toHaveAttribute('aria-busy')
  })

  it('marks Refresh busy and announces Updating while fetching', () => {
    render(<TableToolbar title="Title" description="Description" isFetching onRefresh={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Refresh' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByText('Updating')).toHaveAttribute('aria-live', 'polite')
  })

  it('shows a record count next to the page title when given', () => {
    render(<TableToolbar title="Platform providers" description="Description" count={4} />)

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Platform providers4')
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('renders custom actions when provided', () => {
    render(
      <TableToolbar
        title="Title"
        description="Description"
        actions={<button>Custom Action</button>}
      />
    )

    expect(screen.getByRole('button', { name: /custom action/i })).toBeInTheDocument()
  })

  it('keeps page-header content and actions in the top-level toolbar slot', () => {
    render(
      <TableToolbar
        title="Resource inventory"
        description="Manage discovered resources"
        actions={<button type="button">Add resource</button>}
      />,
    )

    const heading = screen.getByRole('heading', { name: 'Resource inventory', level: 1 })
    const header = heading.parentElement?.parentElement
    expect(header).toContainElement(screen.getByText('Manage discovered resources'))
    expect(header).toContainElement(screen.getByRole('button', { name: 'Add resource' }))
    expect(header).toHaveClass('shrink-0')
  })
})
