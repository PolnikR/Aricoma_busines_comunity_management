import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DetailDrawer } from '@/shared/components/data-table'
import { HelpPopover } from './HelpPopover'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

function renderHelp(width?: 'default' | 'wide') {
  return render(
    <>
      <button type="button">Before</button>
      <HelpPopover triggerLabel="Recovery group help" title="How a recovery group works" closeLabel="Close help" {...(width ? { width } : {})}>
        <p>Resources recovered together.</p>
      </HelpPopover>
      <button type="button">Outside</button>
    </>,
  )
}

function renderInDrawer(onClose = vi.fn()) {
  render(
    <DetailDrawer
      open
      title="Group"
      closeLabel="Close detail"
      onClose={onClose}
      headerActions={<HelpPopover triggerLabel="Recovery group help" title="How a recovery group works" closeLabel="Close help">text</HelpPopover>}
    >
      body
    </DetailDrawer>,
  )
  return onClose
}

const trigger = () => screen.getByRole('button', { name: 'Recovery group help' })
const panel = () => screen.queryByRole('dialog', { name: 'How a recovery group works' })

// Fake timers drive the hover delays; fireEvent keeps those tests synchronous.
function hover(element: Element) {
  fireEvent.pointerEnter(element, { pointerType: 'mouse' })
}

function unhover(element: Element) {
  fireEvent.pointerLeave(element, { pointerType: 'mouse' })
}

function wait(ms: number) {
  act(() => { vi.advanceTimersByTime(ms) })
}

describe('HelpPopover', () => {
  it('renders a labelled trigger that is closed by default', () => {
    renderHelp()
    expect(trigger()).toHaveAttribute('aria-expanded', 'false')
    expect(trigger()).toHaveAttribute('aria-haspopup', 'dialog')
    expect(panel()).not.toBeInTheDocument()
  })

  it('opens on hover after a short delay without moving focus', () => {
    vi.useFakeTimers()
    renderHelp()
    const before = screen.getByRole('button', { name: 'Before' })
    before.focus()

    hover(trigger())
    expect(panel()).not.toBeInTheDocument()
    wait(200)

    const dialog = panel()
    expect(dialog).toHaveTextContent('Resources recovered together.')
    expect(trigger()).toHaveAttribute('aria-expanded', 'true')
    expect(trigger()).toHaveAttribute('aria-controls', dialog?.id)
    expect(before).toHaveFocus()
  })

  it('stays open while the pointer moves from the trigger into the panel and closes once it leaves both', () => {
    vi.useFakeTimers()
    renderHelp()

    hover(trigger())
    wait(200)
    unhover(trigger())
    wait(100)
    hover(screen.getByText('Resources recovered together.'))
    wait(500)
    expect(panel()).toBeInTheDocument()

    unhover(screen.getByText('Resources recovered together.'))
    wait(100)
    expect(panel()).toBeInTheDocument()
    wait(200)
    expect(panel()).not.toBeInTheDocument()
  })

  it('ignores touch hover', () => {
    vi.useFakeTimers()
    renderHelp()

    fireEvent.pointerEnter(trigger(), { pointerType: 'touch' })
    wait(500)

    expect(panel()).not.toBeInTheDocument()
  })

  it('opens on keyboard focus, stays open while focus is inside and closes when focus leaves', async () => {
    const user = userEvent.setup()
    renderHelp()
    screen.getByRole('button', { name: 'Before' }).focus()

    await user.tab()
    expect(trigger()).toHaveFocus()
    expect(panel()).toBeInTheDocument()

    await user.tab()
    expect(panel()).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Close help' })).toHaveFocus()
    expect(panel()).toBeInTheDocument()

    await user.tab()
    expect(screen.getByRole('button', { name: 'Outside' })).toHaveFocus()
    expect(panel()).not.toBeInTheDocument()
  })

  it('keeps a hover-opened panel open while it holds focus', () => {
    vi.useFakeTimers()
    renderHelp()

    hover(trigger())
    wait(200)
    act(() => { screen.getByRole('button', { name: 'Close help' }).focus() })
    unhover(trigger())
    wait(500)

    expect(panel()).toBeInTheDocument()
  })

  it('opens on click as a touch fallback and does not toggle closed on a second click', async () => {
    const user = userEvent.setup()
    renderHelp()

    fireEvent.click(trigger())
    expect(panel()).toBeInTheDocument()

    await user.click(trigger())
    expect(panel()).toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('closes with its close button, returns focus to the trigger and does not reopen from that focus', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: 'Close help' }))

    expect(panel()).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()

    await user.tab({ shift: true })
    await user.tab()
    expect(trigger()).toHaveFocus()
    expect(panel()).toBeInTheDocument()
  })

  it('closes on a pointer down outside', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(trigger())
    await user.click(screen.getByRole('button', { name: 'Outside' }))

    expect(panel()).not.toBeInTheDocument()
  })

  it('stays open on a click inside the panel', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(trigger())
    await user.click(screen.getByText('Resources recovered together.'))

    expect(panel()).toBeInTheDocument()
  })

  it('closes on Escape, keeps focus on the trigger, does not reopen and keeps the key from window listeners', async () => {
    const user = userEvent.setup()
    const windowKeydown = vi.fn()
    window.addEventListener('keydown', windowKeydown)
    renderHelp()

    await user.click(trigger())
    await user.keyboard('{Escape}')

    expect(panel()).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
    expect(windowKeydown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
    window.removeEventListener('keydown', windowKeydown)
  })

  it('returns focus to the trigger when Escape is pressed inside the panel', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(trigger())
    await user.tab()
    expect(panel()).toHaveFocus()
    await user.keyboard('{Escape}')

    expect(panel()).not.toBeInTheDocument()
    expect(trigger()).toHaveFocus()
  })

  it('closes only itself on Escape inside a DetailDrawer when opened by focus; the next Escape closes the drawer', async () => {
    const user = userEvent.setup()
    const onClose = renderInDrawer()

    await user.click(trigger())
    await user.keyboard('{Escape}')
    expect(panel()).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(trigger(), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes only itself on Escape inside a DetailDrawer when opened by hover with focus elsewhere', () => {
    vi.useFakeTimers()
    const onClose = renderInDrawer()
    const closeDetail = screen.getByRole('button', { name: 'Close detail' })
    closeDetail.focus()

    hover(trigger())
    wait(200)
    expect(panel()).toBeInTheDocument()

    fireEvent.keyDown(closeDetail, { key: 'Escape' })
    expect(panel()).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(closeDetail).toHaveFocus()

    fireEvent.keyDown(closeDetail, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps its controls inside the drawer focus trap', async () => {
    const user = userEvent.setup()
    renderInDrawer()

    await user.click(trigger())
    const drawer = screen.getByRole('dialog', { name: 'Detail' })
    expect(drawer).toContainElement(panel())

    screen.getByRole('button', { name: 'Close detail' }).focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(trigger()).toHaveFocus()
  })

  it('uses the compact width by default and the wide width on request', () => {
    renderHelp()
    fireEvent.click(trigger())
    expect(panel()).toHaveClass('w-[min(22rem,calc(100vw-2rem))]')
    cleanup()

    renderHelp('wide')
    fireEvent.click(trigger())
    expect(panel()).toHaveClass('w-[min(55rem,calc(100vw-2rem))]')
  })
})
