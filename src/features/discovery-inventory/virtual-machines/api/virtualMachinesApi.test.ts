import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VirtualMachinesQuery } from '../types'
import { fetchVirtualMachines } from './virtualMachinesApi'

function createVirtualMachine(index: number) {
  const poweredOn = index % 2 === 0

  return {
    moId: `vm-${String(index)}`,
    name: `application-${String(index).padStart(2, '0')}`,
    power_state: poweredOn ? 'poweredOn' : 'poweredOff',
    connection_state: 'connected',
    guest_os: 'Linux',
    guest_hostname: `application-${String(index)}`,
    ip_address: `10.0.0.${String(index)}`,
    vcpu: 2,
    memory_gb: 4,
    host: index <= 6 ? 'esx-01' : 'esx-02',
    cluster: 'cluster-01',
    datastore: 'datastore-01',
    folder: 'Applications',
    vdisks: [
      {
        uuid: `disk-${String(index)}`,
        label: 'Hard disk 1',
        capacity_gb: 50,
        datastore: 'datastore-01',
        file: `[datastore-01] application-${String(index)}/disk.vmdk`,
        thin_provisioned: true,
      },
    ],
    snapshot_count: 0,
    vmware_tools_status: 'toolsOk',
  }
}

function createQuery(overrides: Partial<VirtualMachinesQuery> = {}): VirtualMachinesQuery {
  return {
    search: '',
    powerState: '',
    connectionState: '',
    cluster: '',
    page: 1,
    pageSize: 10,
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchVirtualMachines', () => {
  it('preserves metrics, filter options, and table pagination', async () => {
    const virtualMachines = Array.from({ length: 11 }, (_, index) => (
      createVirtualMachine(index + 1)
    ))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 11, vms: virtualMachines }), { status: 200 }),
    ))

    const page = await fetchVirtualMachines(createQuery({ page: 2 }))

    expect(page).toMatchObject({
      total: 11,
      page: 2,
      pageSize: 10,
      pageCount: 2,
      metrics: {
        total: 11,
        poweredOn: 5,
        clusters: 1,
        totalCpu: 22,
        totalMemoryGb: 44,
      },
    })
    expect(page.items).toHaveLength(1)
    expect(page.filterOptions).toEqual({
      clusters: ['cluster-01'],
      powerStates: ['poweredOff', 'poweredOn'],
      connectionStates: ['connected'],
    })
  })

  it('applies search and infrastructure filters before pagination', async () => {
    const virtualMachines = [createVirtualMachine(1), createVirtualMachine(2)]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 2, vms: virtualMachines }), { status: 200 }),
    ))

    const page = await fetchVirtualMachines(createQuery({
      search: 'application-02',
      powerState: 'poweredOn',
      connectionState: 'connected',
      cluster: 'cluster-01',
    }))

    expect(page.total).toBe(1)
    expect(page.items[0]?.id).toBe('vm-2')
  })
})
