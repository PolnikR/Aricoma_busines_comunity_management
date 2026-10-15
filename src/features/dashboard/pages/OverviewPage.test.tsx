import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OverviewPage } from './OverviewPage'
vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
describe('approved Overview', () => {
  it('keeps the four KPI and four panel composition from the approved HTML', () => {
    render(<OverviewPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    expect(screen.getByText('Demo data')).toBeVisible()
    for (const name of ['Requires Attention', 'Recovery Groups Topology', 'Recent Activity', 'Infrastructure Overview']) expect(screen.getByRole('region', { name })).toBeVisible()
    expect(screen.getAllByRole('button', { name: /Affected applications|Replication relationships|Providers with failed tests|Affected resources/ })).toHaveLength(4)
    expect(screen.getByRole('button', { name: /Protection at risk/ })).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: /Replication issues/ })).toHaveTextContent('7')
    expect(screen.getByRole('button', { name: /Connection failures/ })).toHaveTextContent('4')
    expect(screen.getByRole('button', { name: /Inventory issues/ })).toHaveTextContent('5')
    expect(screen.getByRole('img', { name: /24.*16.*8/ })).toBeVisible()
    expect(screen.getByRole('progressbar', { name: /VMware VMs.*Powered on/ })).toHaveAttribute('aria-valuenow', '108')
  })
  it('explains protection risk without equating a failed run with unprotected apps', async () => {
    render(<OverviewPage />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Protection at risk/ }))
    expect(screen.getByRole('dialog', { name: 'Protection at risk' })).toHaveTextContent('not determined solely by failed runs')
  })
  it('opens a local demo detail and restores focus after Escape', async () => {
    const user = userEvent.setup()
    render(<OverviewPage />)
    const opener = screen.getByRole('button', { name: /VMware VM unreachable.*Details/ })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'VMware VM unreachable' })).toHaveTextContent('Demo')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })
  it('refreshes only the local fixture and leaves no live-health implication', async () => {
    render(<OverviewPage />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Refresh' }))
    expect(screen.getByText('Demo data · unchanged')).toBeVisible()
    expect(screen.getByText('Demo data')).toBeVisible()
  })
  it.each(['loading', 'unknown'] as const)('keeps unavailable %s signals separate from zero', state => {
    render(<OverviewPage initialState={state} />)
    expect(screen.getAllByText('—')).toHaveLength(4)
    for (const name of ['Requires Attention', 'Recovery Groups Topology', 'Recent Activity', 'Infrastructure Overview']) expect(screen.getByRole('region', { name })).toBeVisible()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
  })
  it('renders confirmed empty collections as zero', () => {
    render(<OverviewPage initialState="empty" />)
    expect(screen.getAllByText('0')).toHaveLength(4)
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
  })
  it('preserves available resources when a single demo provider fails', () => {
    render(<OverviewPage initialState="partial" />)
    expect(screen.getAllByRole('progressbar')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /Hitachi volumes/ })).toHaveTextContent('—')
    expect(screen.getByRole('button', { name: /VMware VMs.*128/ })).toBeVisible()
  })
})
