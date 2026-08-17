import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { TierCard } from './TierCard'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const mockTier: RecoveryTier = {
  order: 1,
  description: 'Database server group',
  recovery_group: {
    name: 'Database',
    description: 'Database recovery group',
    vms: [],
  },
}

describe('TierCard', () => {
  afterEach(cleanup)

  it('renders tier in view mode by default', () => {
    render(
      <TierCard
        id="database"
        tier={mockTier}
        existingIds={['database']}
        canDelete={true}
      />
    )

    expect(screen.getByText('database')).toBeInTheDocument()
    expect(screen.getByText('Recovery group: Database')).toBeInTheDocument()
    expect(screen.queryByText('Database recovery group')).not.toBeInTheDocument()
    expect(screen.getByText('Database server group')).toBeInTheDocument()
  })

  it('toggles to edit mode when header clicked', async () => {
    const user = userEvent.setup()
    const onEditToggle = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={false}
        onEditToggle={onEditToggle}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const header = screen.getByRole('button', { name: /database/i })
    await user.click(header)

    expect(onEditToggle).toHaveBeenCalledWith('database')
  })

  it('shows edit form when isEditing=true', () => {
    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={true}
        existingIds={['database']}
        canDelete={true}
      />
    )

    expect(screen.getByDisplayValue('database')).toBeInTheDocument() // ID input
    expect(screen.getByDisplayValue('Database server group')).toBeInTheDocument()
  })

  it('calls onSave with new values when Confirm clicked', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={true}
        onSave={onSave}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const confirmBtn = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmBtn)

    expect(onSave).toHaveBeenCalledWith(
      'database',
      'database',
      {
        tierDescription: 'Database server group',
      }
    )
  })

  it('requires the tier description before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <TierCard
        id="database"
        tier={{ order: 1, description: 'Database server group' }}
        isEditing={true}
        onSave={onSave}
        existingIds={['database']}
        canDelete={true}
      />
    )

    await user.clear(screen.getByDisplayValue('Database server group'))
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    expect(screen.getByText('Tier description is required')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('requires ID before saving', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={true}
        onSave={onSave}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const idInput = screen.getByLabelText('ID *')
    expect(idInput).toBeRequired()
    await user.clear(idInput)
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    expect(screen.getByText('ID is required')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('rejects an ID that collides after normalization', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing
        onSave={onSave}
        existingIds={['database', 'db_cluster']}
        canDelete
      />,
    )

    const idInput = screen.getByLabelText('ID *')
    await user.clear(idInput)
    await user.type(idInput, 'DB Cluster')
    await user.click(screen.getByRole('button', { name: /confirm/i }))

    expect(screen.getByText('ID already in use')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('renders order and description without recovery group details', () => {
    render(
      <TierCard
        id="database"
        tier={{ order: 1, description: 'Database server group' }}
        existingIds={['database']}
        canDelete={true}
      />
    )

    expect(screen.getByText('database')).toBeInTheDocument()
    expect(screen.getByText('Database server group')).toBeInTheDocument()
    expect(screen.queryByText(/Recovery group:/)).not.toBeInTheDocument()
  })

  it('anchors actions to the bottom when no recovery group is assigned', () => {
    render(
      <TierCard
        id="application"
        tier={{ order: 3, description: 'Application server group' }}
        existingIds={['application']}
        canDelete
      />,
    )

    expect(screen.getByRole('button', { name: 'Edit' }).parentElement).toHaveClass('mt-auto')
  })

  it('accepts a recovery group dropped on an unassigned tier', () => {
    const onRecoveryGroupAdded = vi.fn()
    render(
      <TierCard
        id="database"
        tier={{ order: 1, description: 'Database server group' }}
        existingIds={['database']}
        canDelete
        onRecoveryGroupAdded={onRecoveryGroupAdded}
      />,
    )

    fireEvent.drop(screen.getByLabelText('Unassigned recovery group'), {
      dataTransfer: { getData: () => 'database_group' },
    })

    expect(onRecoveryGroupAdded).toHaveBeenCalledWith('database_group')
  })

  it('keeps a long VM list inside a keyboard-scrollable area', () => {
    render(
      <TierCard
        id="database"
        tier={{
          ...mockTier,
          recovery_group: {
            name: 'Database',
            description: 'Database recovery group',
            vms: Array.from({ length: 10 }, (_, index) => ({ name: `DB-${String(index + 1)}` })),
          },
        }}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const vmList = screen.getByLabelText('Database virtual machines')
    expect(vmList).toHaveClass('overflow-y-auto', 'custom-scrollbar', 'pr-2')
    expect(vmList).toHaveAttribute('tabindex', '0')
    expect(screen.getByText('DB-10')).toBeInTheDocument()
  })

  it('shows all recovery-group VMs as checkboxes and reports selection changes', async () => {
    const user = userEvent.setup()
    const onRecoveryVmSelectionChange = vi.fn()

    render(
      <TierCard
        id="database"
        tier={{
          ...mockTier,
          recovery_group: {
            name: 'Database',
            description: 'Database recovery group',
            vms: [{ name: 'DB-01' }],
          },
        }}
        recoveryGroupVms={['DB-01', 'DB-02']}
        onRecoveryVmSelectionChange={onRecoveryVmSelectionChange}
        existingIds={['database']}
        canDelete
      />,
    )

    const selectedVm = screen.getByRole('checkbox', { name: 'DB-01' })
    const excludedVm = screen.getByRole('checkbox', { name: 'DB-02' })
    expect(selectedVm).toBeChecked()
    expect(excludedVm).not.toBeChecked()
    expect(screen.getByText('1 of 2 VMs selected')).toBeInTheDocument()

    const recoveryGroupTitle = screen.getByText('Recovery group: Database')
    expect(recoveryGroupTitle.tagName).toBe('P')
    expect(recoveryGroupTitle).toHaveClass('truncate', 'whitespace-nowrap', 'font-normal')
    expect(screen.getByRole('group', { name: 'Database virtual machines' }).closest('section'))
      .toHaveClass('h-52', 'min-h-52')

    await user.click(excludedVm)
    await user.click(selectedVm)

    expect(onRecoveryVmSelectionChange).toHaveBeenNthCalledWith(1, 'DB-02', true)
    expect(onRecoveryVmSelectionChange).toHaveBeenNthCalledWith(2, 'DB-01', false)
  })

  it('calls onCancel when Cancel clicked', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        isEditing={true}
        onCancel={onCancel}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelBtn)

    expect(onCancel).toHaveBeenCalled()
  })

  it('disables Delete button when canDelete=false', () => {
    render(
      <TierCard
        id="database"
        tier={mockTier}
        existingIds={['database']}
        canDelete={false}
      />
    )

    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    expect(deleteBtn).toBeDisabled()
  })

  it('calls onDelete when Delete clicked', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        onDelete={onDelete}
        existingIds={['database']}
        canDelete={true}
      />
    )

    const deleteBtn = screen.getByRole('button', { name: /delete/i })
    await user.click(deleteBtn)

    expect(onDelete).toHaveBeenCalledWith('database')
  })

  it('removes only the assigned recovery group from the tier', async () => {
    const user = userEvent.setup()
    const onRecoveryGroupRemoved = vi.fn()

    render(
      <TierCard
        id="database"
        tier={mockTier}
        onRecoveryGroupRemoved={onRecoveryGroupRemoved}
        existingIds={['database']}
        canDelete
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Remove recovery group' }))

    expect(onRecoveryGroupRemoved).toHaveBeenCalledOnce()
  })
})
