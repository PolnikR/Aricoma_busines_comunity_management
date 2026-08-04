import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { AddTierCard } from './AddTierCard'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

describe('AddTierCard', () => {
  afterEach(cleanup)
  it('renders a plus card by default', () => {
    render(<AddTierCard maxOrder={4} existingIds={['database', 'app', 'web', 'db_cluster']} />)

    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('shows form when clicked', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    expect(screen.getByPlaceholderText('Tier description')).toBeInTheDocument()
  })

  it('allows manually editing the ID', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const idInput = screen.getByPlaceholderText('tier_id')
    await user.clear(idInput)
    await user.type(idInput, 'custom_id')

    expect((idInput as HTMLInputElement).value).toBe('custom_id')
  })

  it('disables Create while required fields are empty', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const createBtn = screen.getByRole('button', { name: /create/i })
    expect(screen.getByLabelText('ID *')).toBeRequired()
    expect(createBtn).toBeDisabled()
  })

  it('disables Create if ID is duplicate', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const idInput = screen.getByPlaceholderText('tier_id')
    await user.clear(idInput)
    await user.type(idInput, 'database')

    const createBtn = screen.getByRole('button', { name: /create/i })
    expect(createBtn).toBeDisabled()
  })

  it('disables Create if the normalized ID is duplicate', async () => {
    const user = userEvent.setup()
    render(<AddTierCard maxOrder={4} existingIds={['db_cluster']} />)

    await user.click(screen.getByRole('button', { name: '+' }))
    await user.type(screen.getByPlaceholderText('Tier description'), 'Cluster tier')
    const idInput = screen.getByPlaceholderText('tier_id')
    await user.clear(idInput)
    await user.type(idInput, 'DB Cluster')

    expect(screen.getByRole('button', { name: /create/i })).toBeDisabled()
  })

  it('calls onAdd with new tier data when Create clicked', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<AddTierCard maxOrder={4} existingIds={['database']} onAdd={onAdd} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const tierDescriptionInput = screen.getByPlaceholderText('Tier description')

    await user.type(screen.getByPlaceholderText('tier_id'), 'New Tier')
    await user.type(tierDescriptionInput, 'A new tier')

    const createBtn = screen.getByRole('button', { name: /create/i })
    await user.click(createBtn)

    expect(onAdd).toHaveBeenCalledWith('new_tier', {
      description: 'A new tier',
      order: 5,
    })
  })

  it('closes form after Create', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<AddTierCard maxOrder={4} existingIds={['database']} onAdd={onAdd} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const tierDescriptionInput = screen.getByPlaceholderText('Tier description')
    await user.type(screen.getByPlaceholderText('tier_id'), 'New Tier')
    await user.type(tierDescriptionInput, 'A new tier')

    const createBtn = screen.getByRole('button', { name: /create/i })
    await user.click(createBtn)

    expect(screen.queryByPlaceholderText('Tier description')).not.toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
  })
})
