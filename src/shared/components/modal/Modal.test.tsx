import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

afterEach(cleanup)

  describe('Modal', () => {
  it('renders title, children and footer when open', () => {
    render(
      <Modal open title="My Modal" onClose={vi.fn()} footer={<button type="button">Cancel</button>}>
        <p>Body content</p>
      </Modal>,
    )
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('My Modal')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders nothing when closed', () => {
    render(<Modal open={false} title="My Modal" onClose={vi.fn()}><p>Body content</p></Modal>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.queryByText('Body content')).not.toBeInTheDocument()
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<Modal open title="X" onClose={onClose}>body</Modal>)
    const backdrop = document.querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop as HTMLElement)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not call onClose when the dialog body is clicked', () => {
    const onClose = vi.fn()
    render(<Modal open title="X" onClose={onClose}><p>body</p></Modal>)
    fireEvent.click(screen.getByText('body'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('does not call onClose from the backdrop when backdrop closing is disabled', () => {
    const onClose = vi.fn()
    render(<Modal open title="X" onClose={onClose} closeOnBackdrop={false}>body</Modal>)
    const backdrop = document.querySelector('[aria-hidden="true"]')
    expect(backdrop).not.toBeNull()
    fireEvent.click(backdrop as HTMLElement)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose on Escape when open', () => {
    const onClose = vi.fn()
    render(<Modal open title="X" onClose={onClose}>body</Modal>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not react to Escape when closed', () => {
    const onClose = vi.fn()
    render(<Modal open={false} title="X" onClose={onClose}>body</Modal>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
})
