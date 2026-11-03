import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { STANDARD_QUERY_OPTIONS } from '@/shared/query/cachePolicy'
import { RecoveryGroupsListPage } from '../../recovery-groups/pages/RecoveryGroupsListPage'
import { RecoveryApplicationsListPage } from '../../recovery-applications/pages/RecoveryApplicationsListPage'
import { PolicySetUsage } from './PolicySetUsage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const group = { id: 'group /+&?č', name: 'Database group', policy_set_id: 'set', provider_id_vm: 'source', vms: [], volumes: [] }
const app = { id: 'app /+&?č.json', policy_set_id: 'set', application: { name: 'Finance app', description: '', environment: 'prod', platform: 'VMWARE', tiers: {} } }
function response(data: unknown, status = 200) { return new Response(JSON.stringify(data), { status }) }
function stub(overrides: Record<string, () => Promise<Response>> = {}) {
  const bodies: Record<string, unknown> = {
    '/api/get_recovery_groups': { recovery_groups: [group] }, '/api/get_recovery_apps': { applications: [app] },
    '/api/get_policy_sets': { policy_sets: [] }, '/api/get_platform_providers': { providers: [] },
    '/api/get_providers': { providers: [{ id: 'source', name: 'Source', type: 'VMWARE', role: 'source', ipAddress: '127.0.0.1', credentialStatus: 'ok' }] },
  }
  const fetchMock = vi.fn<(url: string) => Promise<Response>>(url => {
    const path = new URL(url, 'http://localhost').pathname
    return overrides[path]?.() ?? Promise.resolve(response(bodies[path] ?? {}))
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { ...STANDARD_QUERY_OPTIONS, retry: false } } })
  const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/usage']}>
    <Routes>
      <Route path="/usage" element={<PolicySetUsage policySetId="set" />} />
      <Route path="/recovery-plans/recovery-groups" element={<RecoveryGroupsListPage />} />
      <Route path="/recovery-plans/recovery-applications" element={<RecoveryApplicationsListPage />} />
    </Routes>
  </MemoryRouter></QueryClientProvider>)
  return { ...view, client }
}
afterEach(() => { vi.unstubAllGlobals(); onlineManager.setOnline(true) })

describe('PolicySetUsage', () => {
  it.each(['Database group', 'Finance app'])('opens the actual %s detail through a real link and router', async name => {
    stub()
    setup()
    const user = userEvent.setup()
    await user.click(await screen.findByRole('link', { name: `Open detail: ${name}` }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('heading', { name })).toBeVisible()
    expect(within(dialog).getByRole('button', { name: 'Overview' })).toBeVisible()
  })

  it('distinguishes pending data from successful empty collections', async () => {
    let release: (value: Response) => void = () => { throw new Error('request not started') }
    const pending = new Promise<Response>(resolve => { release = resolve })
    stub({ '/api/get_recovery_groups': () => pending, '/api/get_recovery_apps': () => Promise.resolve(response({ applications: [] })) })
    setup()
    expect(screen.getAllByRole('status').length).toBeGreaterThan(0)
    expect(screen.queryByText('This Policy Set is not used by any Recovery Group or Recovery Application.')).not.toBeInTheDocument()
    release(response({ recovery_groups: [] }))
    expect(await screen.findByText('This Policy Set is not used by any Recovery Group or Recovery Application.')).toBeVisible()
  })

  it('keeps the successful source visible and retries only the failed source', async () => {
    let failed = true
    const fetchMock = stub({ '/api/get_recovery_apps': () => Promise.resolve(failed ? response({ detail: 'Apps unavailable' }, 503) : response({ applications: [app] })) })
    setup()
    expect(await screen.findByRole('link', { name: 'Open detail: Database group' })).toBeVisible()
    expect(await screen.findByRole('alert')).toHaveTextContent('Apps unavailable')
    expect(screen.queryByText('This Policy Set is not used by any Recovery Group or Recovery Application.')).not.toBeInTheDocument()
    failed = false
    await userEvent.click(screen.getByRole('button', { name: 'Retry Recovery Applications' }))
    expect(await screen.findByRole('link', { name: 'Open detail: Finance app' })).toBeVisible()
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/get_recovery_groups'))).toHaveLength(1)
    expect(fetchMock.mock.calls.filter(([url]) => url.includes('/get_recovery_apps'))).toHaveLength(2)
  })

  it('shows cached data with a warning after a failed refresh and no global empty claim', async () => {
    let failed = false
    stub({ '/api/get_recovery_groups': () => Promise.resolve(failed ? response({ detail: 'Groups offline' }, 503) : response({ recovery_groups: [group] })) })
    const { client } = setup()
    await screen.findByRole('link', { name: 'Open detail: Database group' })
    failed = true
    await client.invalidateQueries({ queryKey: ['/get_recovery_groups'] })
    expect(await screen.findByRole('alert')).toHaveTextContent('Groups offline')
    expect(screen.getByRole('link', { name: 'Open detail: Database group' })).toBeVisible()
    expect(screen.queryByText('This Policy Set is not used by any Recovery Group or Recovery Application.')).not.toBeInTheDocument()
  })

  it('shows paused loading while offline rather than empty results', async () => {
    const fetchMock = stub()
    onlineManager.setOnline(false)
    setup()
    await waitFor(() => { expect(screen.getAllByText('Usage check is paused. Check your connection.')).toHaveLength(2) })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText('This Policy Set is not used by any Recovery Group or Recovery Application.')).not.toBeInTheDocument()
  })
})
