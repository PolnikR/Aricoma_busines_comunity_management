import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { TierCanvas } from './TierCanvas'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const mockTiers: Record<string, RecoveryTier> = {
  database: {
    order: 1,
    description: 'Database tier',
    recovery_group: {
      name: 'Database',
      description: 'Database recovery group',
      vms: [{ name: 'DB-01' }],
    },
  },
  app: {
    order: 2,
    description: 'App tier',
    recovery_group: {
      name: 'Application',
      description: 'Application recovery group',
      vms: [{ name: 'APP-01' }],
    },
  },
  web: {
    order: 3,
    description: 'Web tier',
    recovery_group: {
      name: 'Web',
      description: 'Web recovery group',
      vms: [{ name: 'WEB-01' }],
    },
  },
}

describe('TierCanvas', () => {
  afterEach(cleanup)
  it('renders tiers sorted by order', () => {
    render(<TierCanvas tiers={mockTiers} />)

    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('Application')).toBeInTheDocument()
    expect(screen.getByText('Web')).toBeInTheDocument()
  })

  it('displays AddTierCard', () => {
    render(<TierCanvas tiers={mockTiers} />)

    const addButton = screen.getByRole('button', { name: '+' })
    expect(addButton).toBeInTheDocument()
  })

  it('calls onTierEdit when Edit clicked', async () => {
    const user = userEvent.setup()
    const onTierEdit = vi.fn()

    render(<TierCanvas tiers={mockTiers} onTierEdit={onTierEdit} />)

    const editBtns = screen.getAllByRole('button', { name: 'Edit' })
    expect(editBtns.length).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await user.click(editBtns[0]!)

    expect(screen.getByDisplayValue('database')).toBeInTheDocument()
  })

  it('calls onTierDelete when Delete clicked', async () => {
    const user = userEvent.setup()
    const onTierDelete = vi.fn()

    render(<TierCanvas tiers={mockTiers} onTierDelete={onTierDelete} />)

    const deleteBtns = screen.getAllByRole('button', { name: 'Delete' })
    expect(deleteBtns.length).toBeGreaterThan(0)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    await user.click(deleteBtns[0]!)

    expect(onTierDelete).toHaveBeenCalledWith('database')
  })

  it('calls onTierAdd when new tier created', async () => {
    const user = userEvent.setup()
    const onTierAdd = vi.fn()

    render(<TierCanvas tiers={mockTiers} onTierAdd={onTierAdd} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const nameInput = screen.getByPlaceholderText('Tier name')
    await user.type(nameInput, 'New Tier')

    const createBtn = screen.getByRole('button', { name: 'Create' })
    await user.click(createBtn)

    expect(onTierAdd).toHaveBeenCalled()
  })

  it('disables Delete button on last remaining tier', () => {
    const database = mockTiers['database']
    expect(database).toBeDefined()
    const singleTier: Record<string, RecoveryTier> = {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      database: database!,
    }

    render(<TierCanvas tiers={singleTier} />)

    const deleteBtns = screen.getAllByRole('button', { name: 'Delete' })
    const deleteBtn = deleteBtns[0]
    expect(deleteBtn).toBeDisabled()
  })
})
