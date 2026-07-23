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
        density="compact"
        onDensityChange={vi.fn()}
      />
    )

    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('renders RowDensityToggle with correct density', () => {
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

  it('shows Refresh button when onRefresh is provided', () => {
    const onRefresh = vi.fn()
    render(
      <TableToolbar
        eyebrow="Test"
        title="Title"
        description="Description"
        density="compact"
        onDensityChange={vi.fn()}
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
        density="compact"
        onDensityChange={vi.fn()}
        isFetching={true}
      />
    )

    expect(screen.getByText('Updating')).toBeInTheDocument()
  })
})
