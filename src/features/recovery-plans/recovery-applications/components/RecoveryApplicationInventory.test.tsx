import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGetRecoveryAppInventory } from '@/generated/query/recovery-apps/recovery-apps.gen'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'
import { RecoveryApplicationInventory } from './RecoveryApplicationInventory'

const mocks = vi.hoisted(() => ({ useProviders: vi.fn() }))

vi.mock('@/generated/query/recovery-apps/recovery-apps.gen', () => ({ useGetRecoveryAppInventory: vi.fn() }))
vi.mock('@/generated/query/providers/providers.gen', () => ({ useGetProviders: mocks.useProviders }))
vi.mock('@/hooks/useTranslation', () => ({ useTranslation: () => ({ t: (key: string) => key }) }))

const application: RecoveryApplicationListItem = {
  id: 'finance-recovery',
  data: {
    application: {
      name: 'Finance',
      environment: 'prod',
      platform: 'VMWARE',
      source_provider_id: 'vmware-vcenter-01',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {},
    },
  },
}

function vmwareProvider(id: string, role: 'source' | 'target', orchestratorConnId: string): ProviderRecord {
  return {
    id, name: id, description: '', type: 'VMWARE', role, ipAddress: '10.0.0.1',
    credentialId: 'vmware-credentials', credentialStatus: 'ok', orchestratorConnId,
  }
}

const sourceVcenter = vmwareProvider('vmware-vcenter-01', 'source', 'vcenter_default')
const targetVcenter = vmwareProvider('vmware-vcenter-02', 'target', 'vcenter_default_destination')

function mockProviders(providers: ProviderRecord[]) {
  mocks.useProviders.mockReturnValue({ data: providers, error: null, isFetching: false, refetch: vi.fn() })
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
  beforeEach(() => {
    vi.mocked(useGetRecoveryAppInventory).mockReset()
    mockProviders([sourceVcenter, targetVcenter])
  })

  it('requests the inventory from the target provider of the target connection, not the source provider', () => {
    mockInventory()

    render(<RecoveryApplicationInventory runId="run-1" active application={application} />)

    expect(inventoryRequest()).toEqual({
      params: { run_id: 'run-1', compute_provider_id: 'vmware-vcenter-02' },
      enabled: true,
    })
  })

  it.each([
    ['no target provider uses the target connection', [sourceVcenter], /No target VMWARE provider/],
    ['several target providers use the target connection', [targetVcenter, { ...targetVcenter, id: 'vmware-vcenter-04' }], /Several target VMWARE providers/],
  ])('does not request the inventory when %s', (_label, providers, message) => {
    mockProviders(providers)
    mockInventory()

    render(<RecoveryApplicationInventory runId="run-1" active application={application} />)

    expect(inventoryRequest().enabled).toBe(false)
    expect(inventoryRequest().params).not.toHaveProperty('compute_provider_id')
    expect(screen.getByText('recoveryInventory.error')).toBeInTheDocument()
    expect(screen.getByText(message)).toBeInTheDocument()
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
