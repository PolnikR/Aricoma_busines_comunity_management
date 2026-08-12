import { describe, expect, it } from 'vitest'
import { applyFiltersAndPagination, getServerSideTagFilter } from './filterVirtualMachines'
import type { AllVirtualMachinesData } from './mapInventoryToVirtualMachines'
import type { VirtualMachine, VirtualMachinesQuery } from '../types/virtualMachineTypes'

function vm(name: string, tags: string[] = []): VirtualMachine {
  return {
    id: name,
    name,
    powerState: 'poweredOn',
    connectionState: 'connected',
    guestOs: 'Linux',
    hostname: `${name}.local`,
    ipAddress: '10.0.0.1',
    vcpu: 2,
    memoryGb: 4,
    host: 'host-1',
    cluster: 'cluster-1',
    datastore: 'ds-1',
    folder: '',
    vmPath: '',
    providerId: 'provider-1',
    providerType: 'VMWARE',
    diskCount: 0,
    diskCapacityGb: 0,
    vdisks: [],
    snapshotCount: 0,
    toolsStatus: 'toolsOk',
    tags,
  }
}

const data: AllVirtualMachinesData = {
  virtualMachines: [vm('DB-01', ['prod']), vm('WEB-01'), vm('DB-02', ['test'])],
  metrics: { total: 3, poweredOn: 3, clusters: 1, totalCpu: 6, totalMemoryGb: 12 },
  filterOptions: {
    clusters: ['cluster-1'],
    powerStates: ['poweredOn'],
    connectionStates: ['connected'],
  },
}

function query(overrides: Partial<VirtualMachinesQuery> = {}): VirtualMachinesQuery {
  return {
    page: 1,
    pageSize: 10,
    search: '',
    powerState: '',
    connectionState: '',
    cluster: '',
    tags: [],
    untagged: false,
    ...overrides,
  }
}

describe('applyFiltersAndPagination', () => {
  it('combines search and tag filters', () => {
    const result = applyFiltersAndPagination(data, query({ search: 'db', tags: ['prod'] }))
    expect(result.items.map(item => item.name)).toEqual(['DB-01'])
  })

  it('filters untagged VMs and clamps pages', () => {
    const result = applyFiltersAndPagination(data, query({ untagged: true, page: 99 }))
    expect(result.items.map(item => item.name)).toEqual(['WEB-01'])
    expect(result.page).toBe(1)
  })
})

describe('getServerSideTagFilter', () => {
  it('uses the API filter only when exactly one tag is selected', () => {
    expect(getServerSideTagFilter([])).toBeUndefined()
    expect(getServerSideTagFilter(['prod'])).toBe('prod')
    expect(getServerSideTagFilter(['prod', 'database'])).toBeUndefined()
  })
})
