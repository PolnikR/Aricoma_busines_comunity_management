import { cleanup, render, screen } from '@testing-library/react'
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

    expect(screen.getByText('Database')).toBeInTheDocument()
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
    expect(screen.getByDisplayValue('Database')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Database server group')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Database recovery group')).toBeInTheDocument()
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

    const nameInput = screen.getByDisplayValue('Database')
    await user.clear(nameInput)
    await user.type(nameInput, 'Primary DB')

    const confirmBtn = screen.getByRole('button', { name: /confirm/i })
    await user.click(confirmBtn)

    expect(onSave).toHaveBeenCalledWith(
      'database',
      'database',
      {
        tierDescription: 'Database server group',
        recoveryGroupName: 'Primary DB',
        recoveryGroupDescription: 'Database recovery group',
      }
    )
  })

  it('requires tier and recovery-group fields before saving', async () => {
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
    expect(screen.getByText('Recovery group name is required')).toBeInTheDocument()
    expect(screen.getByText('Recovery group description is required')).toBeInTheDocument()
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
})
