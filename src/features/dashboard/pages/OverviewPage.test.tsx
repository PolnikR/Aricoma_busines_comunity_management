import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { OverviewPage } from './OverviewPage'
import { overallPreviewFixture } from '../mocks/overallPreviewFixtures'
import { selectOverallProtection } from '../model/overallPreviewMetrics'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/resources/hooks/useInitialResourcePrefetch', () => ({
  useInitialResourcePrefetch: vi.fn(),
}))

function mount() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const result = render(<QueryClientProvider client={client}><OverviewPage /></QueryClientProvider>)
  return { ...result, client }
}
afterEach(() => { cleanup(); vi.restoreAllMocks() })

describe('Overall dashboard preview', () => {
  it('places the sole vendor filter beside the shared page heading and preserves the demo date', () => {
    const { container, client } = mount()
    const heading = screen.getByRole('heading', { level: 1, name: 'Overview' })
    const header = heading.parentElement?.parentElement
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(header).toContainElement(screen.getByText('Protection, infrastructure and recovery status'))
    expect(header).toContainElement(screen.getByRole('group', { name: 'Storage vendor' }))
    expect(header).toContainElement(screen.getByText(/Oct 16, 2026/))
    expect(screen.getAllByRole('group', { name: 'Storage vendor' })).toHaveLength(1)
    expect(container.querySelector('.overall-toolbar')).toBeNull()
    client.clear()
  })

  it('renders only selected Overall content with five extracted sections and no legacy banner', () => {
    const { container, client } = mount()
    expect(screen.getByRole('group', { name: 'Storage vendor' })).toBeVisible()
    expect(screen.getByRole('region', { name: 'Key statistics' })).toBeVisible()
    for (const section of ['Protection Overview', 'Recovery Overview', 'Infrastructure Overview', 'Deployment Coverage']) {
      expect(screen.getByRole('region', { name: section })).toBeVisible()
    }
    expect(container.querySelectorAll('.overall-kpi')).toHaveLength(4)
    expect(container.querySelectorAll('.overall-recovery-tile')).toHaveLength(2)
    expect(container.querySelectorAll('.overall-resource')).toHaveLength(4)
    expect(screen.queryByText('Platform overview')).not.toBeInTheDocument()
    expect(screen.queryByText('Design preview')).not.toBeInTheDocument()
    expect(screen.queryByText('Issues Distribution')).not.toBeInTheDocument()
    expect(screen.getAllByText('SIMULATED')).toHaveLength(4)
    client.clear()
  })

  it('matches the approved illustrative totals and separates push from recovery health', () => {
    const { client } = mount()
    const metrics = screen.getByRole('region', { name: 'Key statistics' })
    expect(within(metrics).getByText('1,280')).toBeVisible()
    expect(within(metrics).getByText('13')).toBeVisible()
    const recovery = screen.getByRole('region', { name: 'Recovery Overview' })
    expect(within(recovery).getByText('24')).toBeVisible()
    expect(within(recovery).getByText('34')).toBeVisible()
    const deployment = screen.getByRole('region', { name: 'Deployment Coverage' })
    expect(within(deployment).getByRole('progressbar', { name: /VMware pushed/ })).toHaveAttribute('aria-valuenow', '18')
    expect(within(deployment).getByRole('progressbar', { name: /IBM Power pushed/ })).toHaveAttribute('aria-valuenow', '8')
    client.clear()
  })

  it('updates only the snapshot coverage filter, preserving provider and recovery totals', async () => {
    const user = userEvent.setup()
    const { client } = mount()
    const protection = screen.getByRole('region', { name: 'Protection Overview' })
    const stableSections = ['Recovery Overview', 'Infrastructure Overview', 'Deployment Coverage'].map(name => screen.getByRole('region', { name }))
    const initialContent = stableSections.map(section => section.textContent)
    await user.click(screen.getByRole('button', { name: 'IBM FlashSystem' }))
    expect(screen.getByRole('button', { name: 'IBM FlashSystem' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(protection).getByRole('img', { name: /820 with snapshots, 40 without snapshots/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Hitachi VSP' }))
    expect(within(protection).getByRole('img', { name: /460 with snapshots, 40 without snapshots/ })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'All' }))
    expect(within(protection).getByRole('img', { name: /1,280 with snapshots, 80 without snapshots/ })).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Recovery Overview' })).getByText('24')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Key statistics' })).getByText('13')).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Key statistics' })).getByText('34')).toBeVisible()
    expect(stableSections.map(section => section.textContent)).toEqual(initialContent)
    client.clear()
  })

  it('handles zero volume totals without division by zero', () => {
    const zero = { ...overallPreviewFixture, vendors: [] }
    expect(selectOverallProtection(zero, 'all')).toEqual({ withSnapshots: 0, withoutSnapshots: 0, total: 0, percent: 0 })
  })
})
