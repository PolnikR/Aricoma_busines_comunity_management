import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ResourceSelectionCard } from './ResourceSelectionCard'

describe('ResourceSelectionCard', () => {
  it('accepts a dropped resource and removes an existing resource', async () => {
    const user = userEvent.setup()
    const onResourceDrop = vi.fn()
    const onResourceRemove = vi.fn()
    render(
      <ResourceSelectionCard
        items={['DB-01']}
        emptyText="Drop here"
        removeLabel="Remove"
        ariaLabel="Selected resources"
        dropDataKey="vm-name"
        onResourceDrop={onResourceDrop}
        onResourceRemove={onResourceRemove}
      />,
    )

    const list = screen.getByLabelText('Selected resources')
    const dropZone = list.closest('section')
    expect(dropZone).not.toBeNull()
    expect(list).toHaveClass('custom-scrollbar', 'min-h-0', 'flex-1', 'overflow-y-auto')
    if (!dropZone) return

    fireEvent.drop(dropZone, {
      dataTransfer: { getData: () => 'WEB-01' },
    })
    expect(onResourceDrop).toHaveBeenCalledWith('WEB-01')

    await user.click(screen.getByRole('button', { name: 'Remove: DB-01' }))
    expect(onResourceRemove).toHaveBeenCalledWith('DB-01')
  })

  it('renders an accessible checkbox selection without hiding excluded resources', async () => {
    const user = userEvent.setup()
    const onResourceSelectionChange = vi.fn()

    render(
      <ResourceSelectionCard
        items={['DB-01', 'DB-02']}
        selectedItems={['DB-01']}
        emptyText="No virtual machines"
        removeLabel="Remove"
        ariaLabel="Recovery group virtual machines"
        selectionSummary="1 of 2 VMs selected"
        onResourceSelectionChange={onResourceSelectionChange}
      />,
    )

    const selectedVm = screen.getByRole('checkbox', { name: 'DB-01' })
    const excludedVm = screen.getByRole('checkbox', { name: 'DB-02' })

    expect(selectedVm).toBeChecked()
    expect(excludedVm).not.toBeChecked()
    expect(screen.getByRole('group', { name: 'Recovery group virtual machines' })).toBeInTheDocument()
    expect(screen.getByText('1 of 2 VMs selected')).toBeInTheDocument()

    await user.click(excludedVm)
    await user.click(selectedVm)

    expect(onResourceSelectionChange).toHaveBeenNthCalledWith(1, 'DB-02', true)
    expect(onResourceSelectionChange).toHaveBeenNthCalledWith(2, 'DB-01', false)
  })
})
