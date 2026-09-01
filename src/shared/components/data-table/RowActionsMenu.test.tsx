import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { RowActionsMenu } from './RowActionsMenu'

describe('RowActionsMenu', () => {
  it('renders nothing when closed', () => {
    const triggerRef = createRef<HTMLButtonElement>()
    const { container } = render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={false}
        onClose={vi.fn()}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
      />,
    )

    expect(container.querySelector('[role="menu"]')).not.toBeInTheDocument()
  })

  it('renders menu items when open', () => {
    const triggerRef = createRef<HTMLButtonElement>()
    render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={vi.fn()}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
      />,
    )

    expect(screen.getByRole('menu', { name: 'Actions menu' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeInTheDocument()
  })

  it('calls edit callback when Edit is clicked', async () => {
    const user = userEvent.setup()
    const triggerRef = createRef<HTMLButtonElement>()
    const edit = vi.fn()

    render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={vi.fn()}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={edit}
        delete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(edit).toHaveBeenCalled()
  })

  it('calls delete callback when Delete is clicked', async () => {
    const user = userEvent.setup()
    const triggerRef = createRef<HTMLButtonElement>()
    const deleteCallback = vi.fn()

    render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={vi.fn()}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={deleteCallback}
      />,
    )

    await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
    expect(deleteCallback).toHaveBeenCalled()
  })

  it('closes menu when Escape is pressed', async () => {
    const user = userEvent.setup()
    const triggerRef = createRef<HTMLButtonElement>()
    const onClose = vi.fn()

    const { rerender } = render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={onClose}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
      />,
    )

    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()

    // Re-render with open=false to verify it closes
    rerender(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={false}
        onClose={onClose}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
      />,
    )

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('closes menu when clicking outside', async () => {
    const user = userEvent.setup()
    const triggerRef = createRef<HTMLButtonElement>()
    const onClose = vi.fn()

    render(
      <>
        <div data-testid="outside">Click outside</div>
        <RowActionsMenu
          triggerRef={triggerRef}
          open={true}
          onClose={onClose}
          ariaLabel="Actions menu"
          editLabel="Edit"
          deleteLabel="Delete"
          edit={vi.fn()}
          delete={vi.fn()}
        />
      </>,
    )

    await user.click(screen.getByTestId('outside'))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders rollback menu item when provided and not disabled', () => {
    const triggerRef = createRef<HTMLButtonElement>()
    const onRollback = vi.fn()

    render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={vi.fn()}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
        rollback={{
          label: 'Rollback',
          onRollback,
          disabled: false,
        }}
      />,
    )

    expect(screen.getByRole('menuitem', { name: 'Rollback' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Rollback' })).not.toBeDisabled()
  })

  it('disables rollback menu item when disabled prop is true', () => {
    const triggerRef = createRef<HTMLButtonElement>()

    render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={vi.fn()}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
        rollback={{
          label: 'Rollback',
          onRollback: vi.fn(),
          disabled: true,
          disabledTitle: 'Not configured',
        }}
      />,
    )

    const rollbackButton = screen.getByRole('menuitem', { name: 'Rollback' })
    expect(rollbackButton).toBeDisabled()
    expect(rollbackButton).toHaveAttribute('title', 'Not configured')
  })

  it('calls rollback callback when Rollback is clicked and enabled', async () => {
    const user = userEvent.setup()
    const triggerRef = createRef<HTMLButtonElement>()
    const onRollback = vi.fn()

    render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={vi.fn()}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
        rollback={{
          label: 'Rollback',
          onRollback,
          disabled: false,
        }}
      />,
    )

    await user.click(screen.getByRole('menuitem', { name: 'Rollback' }))
    expect(onRollback).toHaveBeenCalled()
  })

  it('does not call rollback callback when disabled', async () => {
    const user = userEvent.setup()
    const triggerRef = createRef<HTMLButtonElement>()
    const onRollback = vi.fn()

    render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={vi.fn()}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
        rollback={{
          label: 'Rollback',
          onRollback,
          disabled: true,
        }}
      />,
    )

    await user.click(screen.getByRole('menuitem', { name: 'Rollback' }))
    expect(onRollback).not.toHaveBeenCalled()
  })

  it('closes menu after selecting an action', async () => {
    const user = userEvent.setup()
    const triggerRef = createRef<HTMLButtonElement>()
    const onClose = vi.fn()

    render(
      <RowActionsMenu
        triggerRef={triggerRef}
        open={true}
        onClose={onClose}
        ariaLabel="Actions menu"
        editLabel="Edit"
        deleteLabel="Delete"
        edit={vi.fn()}
        delete={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))
    expect(onClose).toHaveBeenCalled()
  })
})
