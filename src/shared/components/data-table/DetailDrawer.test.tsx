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
})
