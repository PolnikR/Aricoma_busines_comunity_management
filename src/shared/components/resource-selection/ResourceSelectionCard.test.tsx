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
    if (!dropZone) return

    fireEvent.drop(dropZone, {
      dataTransfer: { getData: () => 'WEB-01' },
    })
    expect(onResourceDrop).toHaveBeenCalledWith('WEB-01')

    await user.click(screen.getByRole('button', { name: 'Remove: DB-01' }))
    expect(onResourceRemove).toHaveBeenCalledWith('DB-01')
  })
})
