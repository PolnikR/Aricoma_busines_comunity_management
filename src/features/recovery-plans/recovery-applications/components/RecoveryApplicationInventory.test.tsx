import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createAppQueryClient } from '@/shared/query/createAppQueryClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGetRecoveryAppInventory } from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { RecoveryApplicationInventory } from './RecoveryApplicationInventory'
import { RecoveryAppInventoryResponse } from '@/generated/query/zod'

vi.mock('@/generated/query/recovery-apps/recovery-apps.gen', () => ({ useGetRecoveryAppInventory: vi.fn() }))
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const application: RecoveryApplicationListItem = {
  id: 'finance-recovery',
  data: {
    application: {
      name: 'Finance',
      environment: 'prod',
      platform: 'VMWARE',
      source_provider_id: 'vmware-vcenter-01',
      target_provider_id: 'vmware-vcenter-02',
      tiers: {},
    },
  },
}

function withApplication(changes: Partial<RecoveryApplicationListItem['data']['application']>): RecoveryApplicationListItem {
  return { ...application, data: { application: { ...application.data.application, ...changes } } }
}

function mockInventory(data?: unknown) {
  vi.mocked(useGetRecoveryAppInventory).mockReturnValue({
    data: data === undefined ? undefined : RecoveryAppInventoryResponse.parse(data), isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetRecoveryAppInventory>)
}

function inventoryRequest() {
  const [params, options] = vi.mocked(useGetRecoveryAppInventory).mock.lastCall ?? []
  return { params, enabled: options?.query?.enabled }
}

describe('RecoveryApplicationInventory', () => {
  it.each([
    ['vmware', 'target'], ['vmware', 'run'], ['ibm_power', 'target'], ['ibm_power', 'run'],
  ])('keeps cached %s inventory on background error, retries it and isolates a different %s', async (platform, changed) => {
    const actual = await vi.importActual<typeof import('@/generated/query/recovery-apps/recovery-apps.gen')>('@/generated/query/recovery-apps/recovery-apps.gen')
    vi.mocked(useGetRecoveryAppInventory).mockImplementation(actual.useGetRecoveryAppInventory)
    const client = createAppQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
    let failed = false
    let name = 'cached-app'
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json(failed ? { detail: 'Unavailable' } : {
      recovery_app_id: 'app-1', recovery_app_name: name, run_id: 'run-1', compute_provider_id: 'target', recovered_datastores: [], tiers: [], platform,
    }, { status: failed ? 503 : 200 })))
    const view = render(<QueryClientProvider client={client}><RecoveryApplicationInventory runId="run-1" active application={application} /></QueryClientProvider>)
    try {
      await screen.findByText('cached-app')
      failed = true
      await act(async () => { await client.refetchQueries() })
      expect(await screen.findByRole('alert')).toHaveTextContent('recoveryInventory.refreshFailed')
      expect(screen.getByText('cached-app')).toBeInTheDocument()
      failed = false
      name = 'updated-app'
      fireEvent.click(screen.getByRole('button', { name: 'buttons.retry' }))
      await screen.findByText('updated-app')
      await waitFor(() => { expect(screen.queryByRole('alert')).not.toBeInTheDocument() })
      failed = true
      view.rerender(<QueryClientProvider client={client}><RecoveryApplicationInventory runId={changed === 'run' ? 'run-2' : 'run-1'} active application={withApplication({ target_provider_id: changed === 'target' ? 'different-target' : 'vmware-vcenter-02' })} /></QueryClientProvider>)
      expect(screen.queryByText('updated-app')).not.toBeInTheDocument()
      expect(await screen.findByRole('alert')).toHaveTextContent('recoveryInventory.error')
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it.each(['IBM_POWER', 'ibm_power'])('performs the real GET for %s with the stored target ID and preserves partial data', async platform => {
    const actual = await vi.importActual<typeof import('@/generated/query/recovery-apps/recovery-apps.gen')>('@/generated/query/recovery-apps/recovery-apps.gen')
    vi.mocked(useGetRecoveryAppInventory).mockImplementation(actual.useGetRecoveryAppInventory)
    const client = createAppQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(Response.json({
      recovery_app_id: 'power', recovery_app_name: 'Partial Power inventory', run_id: 'run-power', compute_provider_id: 'target-hmc',
      platform: 'ibm_power', recovered_datastores: [], warnings: ['Storage unavailable <script>unsafe</script>'],
      tiers: [{ tier_name: 'Power tier', recovery_group_id: 'rg', recovery_group_name: 'Power group', vms: [{ name: 'db01', found: false, ownership: 'unknown' }] }],
      recovered_hosts: [{ host: 'retained-host', active_ports: null, volumes: [] }],
    })))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<QueryClientProvider client={client}><RecoveryApplicationInventory runId="run-power" active application={withApplication({ platform, target_provider_id: 'target-hmc' })} /></QueryClientProvider>)
    try {
      await screen.findByText('Partial Power inventory')
      expect(fetchMock).toHaveBeenCalledOnce()
      const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit]
      const params = new URL(url, 'http://localhost').searchParams
      expect(params.get('run_id')).toBe('run-power')
      expect(params.get('compute_provider_id')).toBe('target-hmc')
      expect(options.method).toBe('GET')
      const warnings = screen.getByRole('region', { name: 'recoveryInventory.warnings' })
      expect(warnings).toHaveTextContent('Storage unavailable <script>unsafe</script>')
      expect(warnings.querySelector('script')).toBeNull()
      expect(screen.getByText('Power tier')).toBeInTheDocument()
      expect(screen.getByText('retained-host')).toBeInTheDocument()
      expect(screen.queryByText('recoveryInventory.recoveredDatastores')).not.toBeInTheDocument()
      const metric = screen.getByText('recoveryInventory.power.hosts', { selector: 'span' }).parentElement
      expect(metric).toHaveTextContent('1')
      expect(screen.queryByText('recoveryInventory.error')).not.toBeInTheDocument()
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it.each([
    { active: false, runId: 'run-1', target: 'target-hmc' },
    { active: true, runId: null, target: 'target-hmc' },
    { active: true, runId: 'run-1', target: null },
  ])('does not fetch Power inventory without active/run/target prerequisites: %j', async ({ active, runId, target }) => {
    const actual = await vi.importActual<typeof import('@/generated/query/recovery-apps/recovery-apps.gen')>('@/generated/query/recovery-apps/recovery-apps.gen')
    vi.mocked(useGetRecoveryAppInventory).mockImplementation(actual.useGetRecoveryAppInventory)
    const client = createAppQueryClient()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<QueryClientProvider client={client}><RecoveryApplicationInventory runId={runId} active={active} application={withApplication({ platform: 'IBM_POWER', target_provider_id: target })} /></QueryClientProvider>)
    try {
      await act(async () => { await Promise.resolve() })
      expect(fetchMock).not.toHaveBeenCalled()
      if (!runId) expect(screen.getByText('recoveryInventory.noRun')).toBeInTheDocument()
      else if (!target) expect(screen.getByRole('alert')).toHaveTextContent('recoveryInventory.error')
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it('shows loading before the initial inventory response arrives', () => {
    vi.mocked(useGetRecoveryAppInventory).mockReturnValue({
      data: undefined, isLoading: true, isFetching: true, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetRecoveryAppInventory>)
    render(<RecoveryApplicationInventory runId="run-1" active application={application} />)
    expect(screen.getByText('recoveryInventory.loading')).toBeInTheDocument()
  })

  it.each([400, 502])('shows the backend reason and retries an initial Power HTTP %s failure', async status => {
    const actual = await vi.importActual<typeof import('@/generated/query/recovery-apps/recovery-apps.gen')>('@/generated/query/recovery-apps/recovery-apps.gen')
    vi.mocked(useGetRecoveryAppInventory).mockImplementation(actual.useGetRecoveryAppInventory)
    const client = createAppQueryClient()
    client.setDefaultOptions({ queries: { retry: false } })
    let failed = true
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json(failed ? { detail: 'Power target validation failed' } : {
      recovery_app_id: 'power', recovery_app_name: 'Retried inventory', run_id: 'run-1', compute_provider_id: 'target-hmc',
      platform: 'ibm_power', recovered_datastores: [], tiers: [],
    }, { status: failed ? status : 200 })))
    const view = render(<QueryClientProvider client={client}><RecoveryApplicationInventory runId="run-1" active application={withApplication({ platform: 'IBM_POWER', target_provider_id: 'target-hmc' })} /></QueryClientProvider>)
    try {
      expect(await screen.findByRole('alert')).toHaveTextContent('recoveryInventory.error')
      expect(screen.getByRole('alert')).toHaveTextContent('Power target validation failed')
      failed = false
      fireEvent.click(screen.getByRole('button', { name: 'buttons.retry' }))
      await screen.findByText('Retried inventory')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it('keeps unsupported response platforms in the technical view instead of VMware', () => {
    mockInventory({ recovery_app_id: 'app', recovery_app_name: 'Other inventory', run_id: 'run-1', compute_provider_id: 'target', platform: 'future', recovered_datastores: [], tiers: [] })
    render(<RecoveryApplicationInventory runId="run-1" active application={application} />)
    expect(screen.getByRole('status')).toHaveTextContent('recoveryInventory.unknownPlatform')
    expect(screen.queryByText('recoveryInventory.recoveredDatastores')).not.toBeInTheDocument()
    expect(within(screen.getByLabelText('recoveryInventory.showTechnicalJson')).getByText('common.responseBody')).toBeInTheDocument()
  })

  beforeEach(() => {
    vi.mocked(useGetRecoveryAppInventory).mockReset()
  })

  it('requests the inventory from the stored target provider, not the source provider', () => {
    mockInventory()

    render(<RecoveryApplicationInventory runId="run-1" active application={application} />)

    expect(inventoryRequest()).toEqual({
      params: { run_id: 'run-1', compute_provider_id: 'vmware-vcenter-02' },
      enabled: true,
    })
  })

  it.each([undefined, null])('does not request the inventory when target_provider_id is %s', (targetProviderId) => {
    mockInventory()

    render(<RecoveryApplicationInventory runId="run-1" active application={withApplication({ target_provider_id: targetProviderId })} />)

    expect(inventoryRequest().enabled).toBe(false)
    expect(inventoryRequest().params).not.toHaveProperty('compute_provider_id')
    expect(screen.getByText('recoveryInventory.error')).toBeInTheDocument()
    expect(screen.getByText(/no target provider stored/)).toBeInTheDocument()
  })

  it.each(['IBM_POWER', 'ibm_power'])('requests inventory for an IBM Power (%s) application', (platform) => {
    mockInventory()

    render(<RecoveryApplicationInventory runId="run-1" active application={withApplication({ platform, target_provider_id: 'ibm-power-02' })} />)

    expect(inventoryRequest()).toEqual({ params: { run_id: 'run-1', compute_provider_id: 'ibm-power-02' }, enabled: true })
  })

  it('renders summary metrics and compact tier disclosures with VM rows', () => {
    vi.mocked(useGetRecoveryAppInventory).mockReturnValue({
      data: RecoveryAppInventoryResponse.parse({ recovery_app_id: 'app-1', recovery_app_name: 'Finance', run_id: 'run-1', compute_provider_id: 'vcenter-2', recovered_datastores: [{ datastore: 'recovered-ds', target_vdisk: 'DR_VOL01', vms: ['db-01'] }], tiers: [{ tier_name: 'Database', recovery_group_id: 'group-1', recovery_group_name: 'DB group', vms: [{ name: 'db-01', found: true, datastores: ['recovered-ds'] }] }] }),
      isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetRecoveryAppInventory>)

    render(<RecoveryApplicationInventory runId="run-1" active application={application} />)
    expect(screen.getByText('recoveryInventory.tiers')).toBeInTheDocument()
    expect(screen.getByText('recoveryInventory.virtualMachines')).toBeInTheDocument()
    expect(screen.getByText('Database')).toBeInTheDocument()
    expect(screen.getByText('db-01')).toBeInTheDocument()
    expect(screen.getByText('recoveryInventory.recoveredDatastores')).toBeInTheDocument()
    expect(screen.getByText(/DR_VOL01/)).toBeInTheDocument()
    expect(screen.getAllByText(/recovered-ds/)).toHaveLength(3)
    expect(screen.getByLabelText('recoveryInventory.showTechnicalJson')).toBeInTheDocument()
    expect(document.querySelectorAll('details')).toHaveLength(2)
  })
})
