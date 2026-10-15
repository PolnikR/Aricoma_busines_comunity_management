import type { ReactElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render as renderComponent, screen, cleanup, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OverviewPage } from './OverviewPage'
vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const clients: QueryClient[] = []
function render(element: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  clients.push(client)
  return renderComponent(<QueryClientProvider client={client}>{element}</QueryClientProvider>)
}
beforeEach(() => { vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(new Response(JSON.stringify({ providers: [] }))))) })
afterEach(() => { cleanup(); clients.splice(0).forEach(client => { client.clear(); }); vi.unstubAllGlobals() })
describe('approved Overview', () => {
  beforeEach(() => { window.localStorage.removeItem('abco.dashboard.kpiDensity') })
  it('keeps the four KPI and four panel composition from the approved HTML', () => {
    render(<OverviewPage />)
    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    expect(screen.getByText('Demo data')).toBeVisible()
    for (const name of ['Issues Distribution', 'Infrastructure Overview', 'Recovery Applications', 'Recovery Groups Topology']) expect(screen.getByRole('region', { name })).toBeVisible()
    expect(screen.getAllByRole('button', { name: /Recovery Groups with failed jobs|Affected replication groups|Providers with failed tests|Missing storage volumes/ })).toHaveLength(4)
    expect(screen.getByRole('button', { name: /Failed snapshot jobs/ })).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: /Replication issues/ })).toHaveTextContent('IBM Metro Mirror / Hitachi TrueCopy')
    expect(screen.getByRole('button', { name: /Replication issues/ })).toHaveTextContent('7')
    expect(screen.getByRole('button', { name: /Connection failures/ })).toHaveTextContent('4')
    expect(screen.getByRole('button', { name: /Missing volumes/ })).toHaveTextContent('5')
    expect(screen.getByRole('img', { name: /24.*16.*8/ })).toBeVisible()
    expect(screen.getByRole('img', { name: /34.*23.*11/ })).toBeVisible()
    expect(screen.getByRole('img', { name: /19 category counts/ })).toBeVisible()
    expect(screen.getByText('FlashCopy mappings (demo; not recovery points)')).toBeVisible()
    expect(screen.getByText('Groups with snapshot policy (demo)')).toBeVisible()
    expect(screen.getByRole('progressbar', { name: /VMware VMs.*Powered on/ })).toHaveAttribute('aria-valuenow', '108')
  })
  it('orders the lower panels and preserves the infrastructure design', () => {
    const { container } = render(<OverviewPage />)
    const panels = [...container.querySelectorAll('.board > .panel')]
    expect(panels).toHaveLength(4)
    expect(panels.map(panel => panel.querySelector('h2')?.textContent)).toEqual([
      'Recovery Applications', 'Recovery Groups Topology', 'Issues Distribution', 'Infrastructure Overview',
    ])
    expect(container.querySelectorAll('.board .resources > .resource')).toHaveLength(4)
    const applications = screen.getByRole('region', { name: 'Recovery Applications' })
    expect(within(applications).getByRole('meter', { name: 'VMware' })).toHaveAttribute('value', '23')
    expect(within(applications).getByRole('meter', { name: 'IBM Power' })).toHaveAttribute('max', '34')
    const topology = screen.getByRole('region', { name: 'Recovery Groups Topology' })
    expect(within(topology).getByText('Local')).toBeVisible()
    expect(within(topology).getByText('66.7%')).toBeVisible()
    expect(container.querySelectorAll('.issue-share')).toHaveLength(4)
  })
  it('uses exception-based Vercel KPI cards with red status labels and fault icons', () => {
    const { container } = render(<OverviewPage />)
    expect(container.querySelectorAll('.health-kpi')).toHaveLength(4)
    expect(container.querySelectorAll('.health-kpi-icon svg')).toHaveLength(4)
    for (const status of ['ISSUES', 'MISSING']) expect(screen.getByText(status)).toBeVisible()
    expect(screen.getByRole('button', { name: /Failed snapshot jobs/ }).querySelector('.health-kpi-icon svg')).not.toBeNull()
  })
  it('defaults to Auto, persists manual density choices and restores the last choice', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<OverviewPage />)
    const grid = screen.getByRole('region', { name: 'Key indicators' })
    expect(grid).toHaveAttribute('data-density', 'auto')
    expect(screen.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Compact' }))
    expect(grid).toHaveAttribute('data-density', 'compact')
    expect(window.localStorage.getItem('abco.dashboard.kpiDensity')).toBe('compact')
    unmount()
    render(<OverviewPage />)
    expect(screen.getByRole('region', { name: 'Key indicators' })).toHaveAttribute('data-density', 'compact')
    await user.click(screen.getByRole('button', { name: 'Spacious' }))
    expect(screen.getByRole('button', { name: 'Spacious' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Auto' }))
    expect(window.localStorage.getItem('abco.dashboard.kpiDensity')).toBe('auto')
  })
  it('explains latest scheduled group run failures', async () => {
    render(<OverviewPage />)
    await userEvent.setup().click(screen.getByRole('button', { name: /Failed snapshot jobs/ }))
    expect(screen.getByRole('dialog', { name: 'Failed snapshot jobs' })).toHaveTextContent('latest completed scheduled snapshot run')
  })

  it('compares issue shares on one scale with explicit counts and units', () => {
    render(<OverviewPage />)
    const table = screen.getByRole('table', { name: /19 category counts/ })
    expect(within(table).getByRole('columnheader', { name: 'Share' })).toBeVisible()
    expect(within(table).getByRole('columnheader', { name: 'Count' })).toBeVisible()
    const snapshot = within(table).getByRole('row', { name: /Failed snapshot jobs/ })
    expect(snapshot).toHaveTextContent('16%')
    expect(within(snapshot).getByText('3')).toBeVisible()
    expect(snapshot.querySelector('.issue-track-fill')).toHaveStyle({ width: '15.789473684210526%' })
    const replication = within(table).getByRole('row', { name: /Replication issues/ })
    expect(replication).toHaveTextContent('37%')
    expect(within(replication).getByText('7')).toBeVisible()
  })
  it('opens a local demo detail and restores focus after Escape', async () => {
    const user = userEvent.setup()
    render(<OverviewPage />)
    const opener = screen.getByRole('button', { name: /VMware VMs/ })
    await user.click(opener)
    expect(screen.getByRole('dialog', { name: 'VMware VMs' })).toHaveTextContent('Demo')
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
  it.each(['loading', 'unknown'] as const)('keeps unavailable %s signals separate from zero', async state => {
    render(<OverviewPage initialState={state} />)
    expect(screen.getAllByText('—')).toHaveLength(4)
    expect(screen.getAllByText('UNKNOWN')).toHaveLength(4)
    for (const name of ['Issues Distribution', 'Infrastructure Overview', 'Recovery Applications', 'Recovery Groups Topology']) expect(screen.getByRole('region', { name })).toBeVisible()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    expect(screen.queryByText('FlashCopy mappings (demo; not recovery points)')).not.toBeInTheDocument()
    await act(async () => { await new Promise(resolve => { window.setTimeout(resolve, 0) }) })
    expect(fetch).not.toHaveBeenCalled()
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
