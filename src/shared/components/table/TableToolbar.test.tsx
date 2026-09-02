import { render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { TableToolbar } from './TableToolbar'

describe('TableToolbar', () => {
  afterEach(cleanup)

  it('renders PageHeader with title, eyebrow, and description', () => {
    render(
      <TableToolbar
        eyebrow="Test"
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
        eyebrow="Test"
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
        eyebrow="Test"
        title="Title"
        description="Description"
        isFetching={true}
      />
    )

    expect(screen.getByText('Updating')).toBeInTheDocument()
  })

  it('renders custom actions when provided', () => {
    render(
      <TableToolbar
        eyebrow="Test"
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
        eyebrow="Resources"
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
