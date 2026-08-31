import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MetricsSkeleton, StatCard } from './StatCard'

describe('StatCard', () => {
  it('renders its icon, value, label, and helper', () => {
    render(<StatCard icon={<span>Icon</span>} value="42" label="Virtual machines" helper="Inventory" />)

    expect(screen.getByText('Icon')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Virtual machines')).toBeInTheDocument()
    expect(screen.getByText('Inventory')).toBeInTheDocument()
  })

  it('keeps static metric content visible while only the value is loading', () => {
    const { container } = render(
      <StatCard
        icon={<span>Server icon</span>}
        value="42"
        label="Discovered virtual machines"
        helper="Validated inventory"
        isLoading
      />,
    )

    expect(screen.getByText('Server icon')).toBeVisible()
    expect(screen.getByText('Discovered virtual machines')).toBeVisible()
    expect(screen.getByText('Validated inventory')).toBeVisible()
    expect(screen.queryByText('42')).not.toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveAttribute('aria-busy', 'true')
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(1)
    expect(container.querySelector('.animate-pulse')).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders four metric placeholders', () => {
    const { container } = render(<MetricsSkeleton />)

    expect(container.querySelectorAll('.min-h-20')).toHaveLength(4)
  })
})
