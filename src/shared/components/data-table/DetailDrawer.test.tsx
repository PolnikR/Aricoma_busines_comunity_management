import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DetailDrawer } from './DetailDrawer'

afterEach(cleanup)

describe('DetailDrawer', () => {
  it('renders the title and body content', () => {
    render(<DetailDrawer open title="My Item" onClose={vi.fn()}><p>Body content</p></DetailDrawer>)
    expect(screen.getByText('My Item')).toBeInTheDocument()
    expect(screen.getByText('Body content')).toBeInTheDocument()
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<DetailDrawer open title="X" onClose={onClose}>body</DetailDrawer>)
    fireEvent.click(screen.getByLabelText('Close detail'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape when open', () => {
    const onClose = vi.fn()
    render(<DetailDrawer open title="X" onClose={onClose}>body</DetailDrawer>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not react to Escape when closed', () => {
    const onClose = vi.fn()
    render(<DetailDrawer open={false} title="X" onClose={onClose}>body</DetailDrawer>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('renders a footer when provided', () => {
    render(
      <DetailDrawer open title="X" onClose={vi.fn()} footer={<button type="button">Edit</button>}>
        body
      </DetailDrawer>,
    )
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
  })

  it('has no resize handle unless resizable', () => {
    render(<DetailDrawer open title="X" onClose={vi.fn()}>body</DetailDrawer>)
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
  })

  it('widens on ArrowLeft when resizable', () => {
    render(<DetailDrawer open resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    const drawer = screen.getByRole('dialog')
    expect(drawer.style.width).toBe('420px')
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(drawer.style.width).toBe('436px')
  })

  it('resizes on mouse drag when resizable', () => {
    render(<DetailDrawer open resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    const drawer = screen.getByRole('dialog')
    fireEvent.mouseDown(screen.getByRole('separator'), { clientX: 500 })
    fireEvent.mouseMove(window, { clientX: 440 })
    fireEvent.mouseUp(window)
    expect(drawer.style.width).toBe('480px')
  })

  it('resets to the default width after closing and reopening', () => {
    const { rerender } = render(<DetailDrawer open resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog').style.width).toBe('436px')

    rerender(<DetailDrawer open={false} resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    rerender(<DetailDrawer open resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    expect(screen.getByRole('dialog').style.width).toBe('420px')
  })
})
