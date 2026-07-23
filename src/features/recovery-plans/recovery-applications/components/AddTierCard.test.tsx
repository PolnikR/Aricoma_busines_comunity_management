import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import userEvent from '@testing-library/user-event'
import { AddTierCard } from './AddTierCard'

describe('AddTierCard', () => {
  it('renders a plus card by default', () => {
    render(<AddTierCard maxOrder={4} existingIds={['database', 'app', 'web', 'db_cluster']} />)

    expect(screen.getByText('+')).toBeInTheDocument()
  })

  it('shows form when clicked', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    expect(screen.getByPlaceholderText('Tier name')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument()
  })

  it('auto-slugifies ID as name is typed', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const nameInput = screen.getByPlaceholderText('Tier name')
    await user.type(nameInput, 'My Custom Tier')

    const idInput = screen.getByPlaceholderText('tier_id') as HTMLInputElement
    expect(idInput.value).toBe('my_custom_tier')
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

  it('disables Create if name is empty', async () => {
    const user = userEvent.setup()

    render(<AddTierCard maxOrder={4} existingIds={['database']} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const createBtn = screen.getByRole('button', { name: /create/i })
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

  it('calls onAdd with new tier data when Create clicked', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<AddTierCard maxOrder={4} existingIds={['database']} onAdd={onAdd} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const nameInput = screen.getByPlaceholderText('Tier name')
    const descInput = screen.getByPlaceholderText('Optional description')

    await user.type(nameInput, 'New Tier')
    await user.type(descInput, 'A new tier')

    const createBtn = screen.getByRole('button', { name: /create/i })
    await user.click(createBtn)

    expect(onAdd).toHaveBeenCalledWith('new_tier', {
      name: 'New Tier',
      description: 'A new tier',
      order: 5,
      vms: [],
    })
  })

  it('closes form after Create', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()

    render(<AddTierCard maxOrder={4} existingIds={['database']} onAdd={onAdd} />)

    const plusBtn = screen.getByRole('button', { name: '+' })
    await user.click(plusBtn)

    const nameInput = screen.getByPlaceholderText('Tier name')
    await user.type(nameInput, 'New Tier')

    const createBtn = screen.getByRole('button', { name: /create/i })
    await user.click(createBtn)

    expect(screen.queryByPlaceholderText('Tier name')).not.toBeInTheDocument()
    expect(screen.getByText('+')).toBeInTheDocument()
  })
})
