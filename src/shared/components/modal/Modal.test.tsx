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

  it('separates the dialog surface from the backdrop with the semantic border', () => {
    render(<Modal open title="My Modal" onClose={vi.fn()}>Body content</Modal>)

    expect(screen.getByRole('dialog')).toHaveClass('border', 'border-border')
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

  it('moves focus into the dialog and traps Tab navigation', () => {
    const opener = document.createElement('button')
    opener.textContent = 'Open'
    document.body.append(opener)
    opener.focus()
    render(
      <Modal open title="Focusable modal" onClose={vi.fn()}>
        <button type="button">First</button>
        <button type="button">Last</button>
      </Modal>,
    )

    const dialog = screen.getByRole('dialog', { name: 'Focusable modal' })
    const first = screen.getByRole('button', { name: 'First' })
    const last = screen.getByRole('button', { name: 'Last' })
    expect(document.activeElement).toBe(first)
    last.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    opener.remove()
  })

  it('restores focus to the opener when the dialog closes', () => {
    const onClose = vi.fn()
    const opener = document.createElement('button')
    opener.type = 'button'
    opener.textContent = 'Open'
    document.body.append(opener)
    opener.focus()
    const { rerender } = render(<Modal open={false} title="Focusable modal" onClose={onClose}>Body</Modal>)
    rerender(
      <Modal open title="Focusable modal" onClose={onClose}>
        <button type="button">Close</button>
      </Modal>,
    )
    rerender(<Modal open={false} title="Focusable modal" onClose={onClose}>Body</Modal>)
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
})
