import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders its icon, value, label, and helper', () => {
    render(<StatCard icon={<span>Icon</span>} value="42" label="Virtual machines" helper="Inventory" />)

    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Virtual machines')).toBeInTheDocument()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
  })
})
