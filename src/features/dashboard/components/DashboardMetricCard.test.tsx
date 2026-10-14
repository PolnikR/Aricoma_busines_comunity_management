import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardMetricCard } from './DashboardMetricCard'

describe('DashboardMetricCard', () => {
  it.each(['1', '3', '10', '100', '1,000'])('keeps the full value %s in an accessible action', value => {
    render(<DashboardMetricCard title="A long operational indicator name" subtitle="Require immediate attention" context="Open issues" value={value} icon={<span />} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveTextContent(value)
    expect(screen.getByRole('button')).toHaveTextContent('A long operational indicator name')
  })
  it('distinguishes unknown from zero and exposes loading', () => {
    render(<DashboardMetricCard title="Signals" subtitle="Need review" context="Pending review" value="—" loading icon={<span />} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button')).not.toHaveTextContent('0')
  })
})
