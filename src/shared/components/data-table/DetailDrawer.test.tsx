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

  it('lets the header action row share the drawer content axis with the close control', () => {
    render(
      <DetailDrawer
        open
        title="My Item"
        closeLabel="Close detail"
        onClose={vi.fn()}
        headerExtra={<span data-testid="header-action">Test connection</span>}
      >
        body
      </DetailDrawer>,
    )

    const action = screen.getByTestId('header-action')
    const close = screen.getByRole('button', { name: 'Close detail' })
    expect(action.parentElement?.parentElement).toContainElement(close)
  })

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<DetailDrawer open title="X" closeLabel="Close provider" onClose={onClose}>body</DetailDrawer>)
    fireEvent.click(screen.getByLabelText('Close provider'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose on Escape when open', () => {
    const onClose = vi.fn()
    render(<DetailDrawer open title="X" onClose={onClose}>body</DetailDrawer>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('moves focus inside, traps keyboard focus and restores the opener', () => {
    const opener = document.createElement('button')
    document.body.append(opener)
    opener.focus()
    const { rerender } = render(
      <DetailDrawer open={false} title="X" closeLabel="Close detail" onClose={vi.fn()}>
        <button type="button">Action</button>
      </DetailDrawer>,
    )

    rerender(
      <DetailDrawer open title="X" closeLabel="Close detail" onClose={vi.fn()}>
        <button type="button">Action</button>
      </DetailDrawer>,
    )
    const close = screen.getByRole('button', { name: 'Close detail' })
    const action = screen.getByRole('button', { name: 'Action' })
    expect(close).toHaveFocus()

    action.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(close).toHaveFocus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(action).toHaveFocus()

    rerender(
      <DetailDrawer open={false} title="X" closeLabel="Close detail" onClose={vi.fn()}>
        <button type="button">Action</button>
      </DetailDrawer>,
    )
    expect(opener).toHaveFocus()
    opener.remove()
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
    expect(drawer.style.getPropertyValue('--detail-drawer-width')).toBe('420px')
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(drawer.style.getPropertyValue('--detail-drawer-width')).toBe('436px')
  })

  it('resizes on mouse drag when resizable', () => {
    render(<DetailDrawer open resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    const drawer = screen.getByRole('dialog')
    fireEvent.mouseDown(screen.getByRole('separator'), { clientX: 500 })
    fireEvent.mouseMove(window, { clientX: 440 })
    fireEvent.mouseUp(window)
    expect(drawer.style.getPropertyValue('--detail-drawer-width')).toBe('480px')
  })

  it('resets to the default width after closing and reopening', () => {
    const { rerender } = render(<DetailDrawer open resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog').style.getPropertyValue('--detail-drawer-width')).toBe('436px')

    rerender(<DetailDrawer open={false} resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    rerender(<DetailDrawer open resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    expect(screen.getByRole('dialog').style.getPropertyValue('--detail-drawer-width')).toBe('420px')
  })
})

describe('DetailDrawer header', () => {
  it('renders meta items in order, skips falsy ones and hides the separators from assistive tech', () => {
    render(
      <DetailDrawer open title="Group" meta={['Recovery group', null, <span key="s">Active</span>, false, 'Last run: success']} onClose={vi.fn()}>
        body
      </DetailDrawer>,
    )
    const first = screen.getByText('Recovery group')
    const row = first.parentElement
    expect(row).toHaveTextContent('Recovery groupActiveLast run: success')
    expect(row?.querySelectorAll('[aria-hidden="true"]')).toHaveLength(2)
  })

  it('shows the transitional eyebrow as the first meta item', () => {
    render(<DetailDrawer open eyebrow="Selected provider" title="X" meta={['Active']} onClose={vi.fn()}>body</DetailDrawer>)
    expect(screen.getByText('Selected provider').parentElement).toHaveTextContent('Selected providerActive')
  })

  it('renders the subtitle on its own line below the meta row', () => {
    render(<DetailDrawer open title="X" meta={['Provider']} subtitle="vc-brno-01" onClose={vi.fn()}>body</DetailDrawer>)
    const subtitle = screen.getByText('vc-brno-01')
    const metaRow = screen.getByText('Provider').parentElement
    expect(subtitle).not.toBe(metaRow)
    expect(metaRow?.nextElementSibling).toBe(subtitle)
  })

  it('renders no meta row without meta, eyebrow or subtitle', () => {
    render(<DetailDrawer open title="Only title" onClose={vi.fn()}>body</DetailDrawer>)
    const header = screen.getByRole('heading', { name: 'Only title' }).parentElement?.parentElement
    expect(header?.children).toHaveLength(1)
  })

  it('places header actions in the title row before the close button and keeps them in the focus trap', () => {
    render(
      <DetailDrawer open title="X" closeLabel="Close detail" headerActions={<button type="button">Help</button>} onClose={vi.fn()}>
        body
      </DetailDrawer>,
    )
    const help = screen.getByRole('button', { name: 'Help' })
    const close = screen.getByRole('button', { name: 'Close detail' })
    const titleRow = screen.getByRole('heading', { name: 'X' }).parentElement
    expect(titleRow).toContainElement(help)
    expect(titleRow).toContainElement(close)
    expect(help.compareDocumentPosition(close) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

    close.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(help).toHaveFocus()
  })

  it('renders the close button as an icon with its label', () => {
    render(<DetailDrawer open title="X" closeLabel="Close detail" onClose={vi.fn()}>body</DetailDrawer>)
    const close = screen.getByRole('button', { name: 'Close detail' })
    expect(close).not.toHaveTextContent('✕')
    expect(close.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })

  it('calls onClose when the backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<DetailDrawer open title="X" onClose={onClose}>body</DetailDrawer>)
    const backdrop = container.querySelector('div[aria-hidden="true"]')
    if (!backdrop) throw new Error('Expected the backdrop to be rendered')
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })
})

describe('DetailDrawer resizer', () => {
  it('enables the resize handle only from lg and sizes the drawer through a CSS variable', () => {
    render(<DetailDrawer open resizable title="X" onClose={vi.fn()}>body</DetailDrawer>)
    const drawer = screen.getByRole('dialog')
    expect(screen.getByRole('separator')).toHaveClass('hidden', 'lg:block')
    expect(drawer).toHaveClass('w-[min(420px,92vw)]', 'lg:w-(--detail-drawer-width)', 'lg:max-w-[92vw]')
    expect(drawer.style.getPropertyValue('--detail-drawer-width')).toBe('420px')
    expect(drawer.style.width).toBe('')
  })

  it('keeps the fixed width and renders no handle when not resizable', () => {
    render(<DetailDrawer open title="X" onClose={vi.fn()}>body</DetailDrawer>)
    const drawer = screen.getByRole('dialog')
    expect(screen.queryByRole('separator')).not.toBeInTheDocument()
    expect(drawer).toHaveClass('w-[min(420px,92vw)]')
    expect(drawer).not.toHaveClass('lg:w-(--detail-drawer-width)')
    expect(drawer.style.getPropertyValue('--detail-drawer-width')).toBe('')
  })

  it('passes the resize label to the handle', () => {
    render(<DetailDrawer open resizable resizeLabel="Změnit šířku panelu" title="X" onClose={vi.fn()}>body</DetailDrawer>)
    expect(screen.getByRole('separator', { name: 'Změnit šířku panelu' })).toBeInTheDocument()
  })

  it('leaves a CSS-hidden resize handle out of the focus trap', () => {
    render(
      <DetailDrawer open resizable title="X" closeLabel="Close detail" onClose={vi.fn()}>
        <button type="button">Action</button>
      </DetailDrawer>,
    )
    // Below lg the handle is display:none; the browser reports it as not visible.
    Object.defineProperty(screen.getByRole('separator'), 'checkVisibility', { value: () => false })
    const close = screen.getByRole('button', { name: 'Close detail' })
    const action = screen.getByRole('button', { name: 'Action' })

    close.focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(action).toHaveFocus()
  })
})
