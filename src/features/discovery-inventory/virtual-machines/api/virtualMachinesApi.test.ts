import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VirtualMachinesQuery } from '../types'
import { applyFiltersAndPagination, fetchAllVirtualMachines, fetchVirtualMachines } from './virtualMachinesApi'

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

describe('fetchAllVirtualMachines', () => {
  it('returns all virtual machines with metrics and filter options', async () => {
    const virtualMachines = Array.from({ length: 15 }, (_, index) => (
      createVirtualMachine(index + 1)
    ))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 15, vms: virtualMachines }), { status: 200 }),
    ))

    const result = await fetchAllVirtualMachines()

    expect(result.virtualMachines).toHaveLength(15)
    expect(result.metrics).toEqual({
      total: 15,
      poweredOn: 7,
      clusters: 1,
      totalCpu: 30,
      totalMemoryGb: 60,
    })
    expect(result.filterOptions).toEqual({
      clusters: ['cluster-01'],
      powerStates: ['poweredOff', 'poweredOn'],
      connectionStates: ['connected'],
    })
  })

  it('handles empty virtual machine list', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 0, vms: [] }), { status: 200 }),
    ))

    const result = await fetchAllVirtualMachines()

    expect(result.virtualMachines).toHaveLength(0)
    expect(result.metrics.total).toBe(0)
    expect(result.metrics.poweredOn).toBe(0)
    expect(result.filterOptions.clusters).toEqual([])
  })
})

describe('applyFiltersAndPagination', () => {
  it('applies all filters and paginates correctly', async () => {
    const virtualMachines = Array.from({ length: 11 }, (_, index) => (
      createVirtualMachine(index + 1)
    ))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 11, vms: virtualMachines }), { status: 200 }),
    ))

    const allData = await fetchAllVirtualMachines()
    const filtered = applyFiltersAndPagination(allData, createQuery({
      page: 2,
      pageSize: 10,
    }))

    expect(filtered.total).toBe(11)
    expect(filtered.page).toBe(2)
    expect(filtered.pageSize).toBe(10)
    expect(filtered.pageCount).toBe(2)
    expect(filtered.items).toHaveLength(1)
    expect(filtered.metrics).toEqual(allData.metrics)
    expect(filtered.filterOptions).toEqual(allData.filterOptions)
  })

  it('filters by search term', async () => {
    const virtualMachines = [createVirtualMachine(1), createVirtualMachine(2), createVirtualMachine(3)]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 3, vms: virtualMachines }), { status: 200 }),
    ))

    const allData = await fetchAllVirtualMachines()
    const filtered = applyFiltersAndPagination(allData, createQuery({
      search: 'application-02',
      page: 1,
      pageSize: 10,
    }))

    expect(filtered.total).toBe(1)
    expect(filtered.items[0]?.id).toBe('vm-2')
  })

  it('filters by power state', async () => {
    const virtualMachines = [createVirtualMachine(1), createVirtualMachine(2), createVirtualMachine(3)]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 3, vms: virtualMachines }), { status: 200 }),
    ))

    const allData = await fetchAllVirtualMachines()
    const filtered = applyFiltersAndPagination(allData, createQuery({
      powerState: 'poweredOn',
      page: 1,
      pageSize: 10,
    }))

    expect(filtered.total).toBe(1)
    expect(filtered.items.every((vm) => vm.powerState === 'poweredOn')).toBe(true)
  })

  it('filters by cluster', async () => {
    const virtualMachines = Array.from({ length: 3 }, (_, index) => {
      const vm = createVirtualMachine(index + 1)
      if (index === 2) vm.cluster = 'cluster-02'
      return vm
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 3, vms: virtualMachines }), { status: 200 }),
    ))

    const allData = await fetchAllVirtualMachines()
    const filtered = applyFiltersAndPagination(allData, createQuery({
      cluster: 'cluster-01',
      page: 1,
      pageSize: 10,
    }))

    expect(filtered.total).toBe(2)
    expect(filtered.items.every((vm) => vm.cluster === 'cluster-01')).toBe(true)
  })

  it('combines multiple filters', async () => {
    const virtualMachines = Array.from({ length: 5 }, (_, index) => (
      createVirtualMachine(index + 1)
    ))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 5, vms: virtualMachines }), { status: 200 }),
    ))

    const allData = await fetchAllVirtualMachines()
    const filtered = applyFiltersAndPagination(allData, createQuery({
      search: 'application-02',
      powerState: 'poweredOn',
      cluster: 'cluster-01',
      page: 1,
      pageSize: 10,
    }))

    expect(filtered.total).toBe(1)
    expect(filtered.items[0]?.id).toBe('vm-2')
  })

  it('handles pagination at boundaries', async () => {
    const virtualMachines = Array.from({ length: 25 }, (_, index) => (
      createVirtualMachine(index + 1)
    ))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 25, vms: virtualMachines }), { status: 200 }),
    ))

    const allData = await fetchAllVirtualMachines()
    const lastPage = applyFiltersAndPagination(allData, createQuery({
      page: 3,
      pageSize: 10,
    }))

    expect(lastPage.page).toBe(3)
    expect(lastPage.items).toHaveLength(5)
    expect(lastPage.pageCount).toBe(3)
  })

  it('clamps page to valid range', async () => {
    const virtualMachines = Array.from({ length: 5 }, (_, index) => (
      createVirtualMachine(index + 1)
    ))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ count: 5, vms: virtualMachines }), { status: 200 }),
    ))

    const allData = await fetchAllVirtualMachines()
    const outOfRange = applyFiltersAndPagination(allData, createQuery({
      page: 999,
      pageSize: 10,
    }))

    expect(outOfRange.page).toBe(1)
    expect(outOfRange.pageCount).toBe(1)
  })
})
