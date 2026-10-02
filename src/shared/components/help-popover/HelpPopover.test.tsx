import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DetailDrawer } from '@/shared/components/data-table'
import { HelpPopover } from './HelpPopover'

afterEach(cleanup)

function renderHelp() {
  return render(
    <>
      <HelpPopover triggerLabel="Recovery group help" title="How a recovery group works" closeLabel="Close help">
        <p>Resources recovered together.</p>
      </HelpPopover>
      <button type="button">Outside</button>
    </>,
  )
}

describe('HelpPopover', () => {
  it('renders a labelled trigger that is closed by default', () => {
    renderHelp()
    const trigger = screen.getByRole('button', { name: 'Recovery group help' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens a dialog labelled by its title on click and moves focus into it', async () => {
    const user = userEvent.setup()
    renderHelp()
    const trigger = screen.getByRole('button', { name: 'Recovery group help' })

    await user.click(trigger)
    const dialog = screen.getByRole('dialog', { name: 'How a recovery group works' })

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(trigger).toHaveAttribute('aria-controls', dialog.id)
    expect(dialog).toHaveTextContent('Resources recovered together.')
    expect(dialog).toHaveFocus()
  })

  it('closes on a second trigger click and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderHelp()
    const trigger = screen.getByRole('button', { name: 'Recovery group help' })

    await user.click(trigger)
    await user.click(trigger)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(trigger).toHaveFocus()
  })

  it('closes with its close button and returns focus to the trigger', async () => {
    const user = userEvent.setup()
    renderHelp()
    const trigger = screen.getByRole('button', { name: 'Recovery group help' })

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Close help' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('closes on a click outside', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(screen.getByRole('button', { name: 'Recovery group help' }))
    await user.click(screen.getByRole('button', { name: 'Outside' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('stays open on a click inside the panel', async () => {
    const user = userEvent.setup()
    renderHelp()

    await user.click(screen.getByRole('button', { name: 'Recovery group help' }))
    await user.click(screen.getByText('Resources recovered together.'))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('closes on Escape, returns focus and keeps the key from reaching window listeners', async () => {
    const user = userEvent.setup()
    const windowKeydown = vi.fn()
    window.addEventListener('keydown', windowKeydown)
    renderHelp()
    const trigger = screen.getByRole('button', { name: 'Recovery group help' })

    await user.click(trigger)
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(windowKeydown).not.toHaveBeenCalledWith(expect.objectContaining({ key: 'Escape' }))
    window.removeEventListener('keydown', windowKeydown)
  })

  it('closes only itself on Escape inside a DetailDrawer, the next Escape closes the drawer', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
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

    await user.click(screen.getByRole('button', { name: 'Recovery group help' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'How a recovery group works' })).not.toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.keyDown(screen.getByRole('button', { name: 'Recovery group help' }), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('keeps its controls inside the drawer focus trap', async () => {
    const user = userEvent.setup()
    render(
      <DetailDrawer
        open
        title="Group"
        closeLabel="Close detail"
        onClose={vi.fn()}
        headerActions={<HelpPopover triggerLabel="Recovery group help" title="How a recovery group works" closeLabel="Close help">text</HelpPopover>}
      >
        body
      </DetailDrawer>,
    )

    await user.click(screen.getByRole('button', { name: 'Recovery group help' }))
    const drawer = screen.getByRole('dialog', { name: 'Detail' })
    expect(drawer).toContainElement(screen.getByRole('dialog', { name: 'How a recovery group works' }))

    screen.getByRole('button', { name: 'Close detail' }).focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(screen.getByRole('button', { name: 'Recovery group help' })).toHaveFocus()
  })
})
