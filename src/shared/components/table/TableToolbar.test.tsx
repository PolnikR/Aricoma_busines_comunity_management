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

  it('renders density toggle when density props are provided', () => {
    const onDensityChange = vi.fn()
    render(
      <TableToolbar
        eyebrow="Test"
        title="Title"
        description="Description"
        density="comfortable"
        onDensityChange={onDensityChange}
      />
    )

    const comfortableBtn = screen.getByRole('button', { name: 'comfortable' })
    expect(comfortableBtn).toHaveAttribute('aria-pressed', 'true')
  })

  it('does not render density toggle when density props are absent', () => {
    render(
      <TableToolbar
        eyebrow="Test"
        title="Title"
        description="Description"
      />
    )

    expect(screen.queryByRole('group', { name: 'Row density' })).not.toBeInTheDocument()
  })
})
