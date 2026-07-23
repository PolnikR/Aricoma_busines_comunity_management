import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConfirmDialog } from './ConfirmDialog'

afterEach(cleanup)

  describe('ConfirmDialog', () => {
  it('renders title, message and labels when open', () => {
    render(
      <ConfirmDialog
        open
        title="Delete provider"
        message="Are you sure?"
        confirmLabel="Delete"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText('Delete provider')).toBeInTheDocument()
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<ConfirmDialog open={false} title="X" message="Y" onConfirm={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('fires onConfirm and onCancel', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog open title="X" message="Y" confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).toHaveBeenCalledOnce()
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('styles the confirm button as danger', () => {
    render(
      <ConfirmDialog open title="X" message="Y" confirmLabel="Delete" tone="danger" onConfirm={vi.fn()} onCancel={vi.fn()} />,
    )
    expect(screen.getByRole('button', { name: 'Delete' }).className).toContain('bg-red-600')
  })

  it('disables buttons and shows the loading label while loading', () => {
    render(
      <ConfirmDialog
        open
        title="X"
        message="Y"
        confirmLabel="Delete"
        loadingLabel="Deleting…"
        isLoading
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled()
  })
})
