import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createAppQueryClient } from '@/shared/query/createAppQueryClient'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGetRecoveryAppInventory } from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { RecoveryApplicationInventory } from './RecoveryApplicationInventory'

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
    data, isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetRecoveryAppInventory>)
}

function inventoryRequest() {
  const [params, options] = vi.mocked(useGetRecoveryAppInventory).mock.lastCall ?? []
  return { params, enabled: options?.query?.enabled }
}

describe('RecoveryApplicationInventory', () => {
  it('keeps cached inventory on background error, retries it and isolates a different target', async () => {
    const actual = await vi.importActual<typeof import('@/generated/query/recovery-apps/recovery-apps.gen')>('@/generated/query/recovery-apps/recovery-apps.gen')
    vi.mocked(useGetRecoveryAppInventory).mockImplementation(actual.useGetRecoveryAppInventory)
    const client = createAppQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
    let failed = false
    let name = 'cached-app'
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json(failed ? { detail: 'Unavailable' } : {
      recovery_app_id: 'app-1', recovery_app_name: name, run_id: 'run-1', compute_provider_id: 'target', recovered_datastores: [], tiers: [],
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
      view.rerender(<QueryClientProvider client={client}><RecoveryApplicationInventory runId="run-1" active application={withApplication({ target_provider_id: 'different-target' })} /></QueryClientProvider>)
      expect(screen.queryByText('updated-app')).not.toBeInTheDocument()
      expect(await screen.findByRole('alert')).toHaveTextContent('recoveryInventory.error')
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
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

  it.each(['IBM_POWER', 'ibm_power'])('does not request the VMware-only inventory for an IBM Power (%s) application', (platform) => {
    mockInventory()

    render(<RecoveryApplicationInventory runId="run-1" active application={withApplication({ platform, target_provider_id: 'ibm-power-02' })} />)

    expect(inventoryRequest().enabled).toBe(false)
    expect(screen.getByText('recoveryInventory.powerUnsupported')).toBeInTheDocument()
  })

  it('renders summary metrics and compact tier disclosures with VM rows', () => {
    vi.mocked(useGetRecoveryAppInventory).mockReturnValue({
      data: { recovery_app_id: 'app-1', recovery_app_name: 'Finance', run_id: 'run-1', compute_provider_id: 'vcenter-2', recovered_datastores: [{ datastore: 'recovered-ds', target_vdisk: 'DR_VOL01', vms: ['db-01'] }], tiers: [{ tier_name: 'Database', recovery_group_id: 'group-1', recovery_group_name: 'DB group', vms: [{ name: 'db-01', found: true, datastores: ['recovered-ds'] }] }] },
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
