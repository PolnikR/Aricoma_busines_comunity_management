import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DashboardMetricCard } from './DashboardMetricCard'

describe('DashboardMetricCard', () => {
  it.each(['1', '3', '10', '100', '1,000'])('keeps the full value %s in an accessible action', value => {
    render(<DashboardMetricCard code="01" category="PROTECTION" title="A long operational indicator name" subtitle="Require immediate attention" context="Open issues" status="FAILED" signalStatus="issue" tone="error" value={value} loading={false} icon={<span />} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveTextContent(value)
    expect(screen.getByRole('button')).toHaveTextContent('A long operational indicator name')
  })
  it('distinguishes unknown from zero and exposes loading', () => {
    render(<DashboardMetricCard code="02" category="REPLICATION" title="Signals" subtitle="Need review" context="Pending review" status="UNKNOWN" signalStatus="unknown" tone="warning" value="—" loading icon={<span />} onClick={vi.fn()} />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('button').querySelector('.health-kpi-number')).toHaveTextContent('—')
  })
})
