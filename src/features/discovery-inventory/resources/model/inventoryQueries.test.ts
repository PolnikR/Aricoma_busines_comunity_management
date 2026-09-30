import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  createFlashSystemInventorySelect,
  createPowerInventorySelect,
  fetchVmwareInventoryLive,
  flashSystemInventoryQuery,
  powerInventoryQuery,
  selectVdisks,
  tagsQuery,
  vdisksByVmQuery,
  vmwareInventoryQuery,
} from './inventoryQueries'

const signal = new AbortController().signal

function stubFetch(body: unknown) {
  const mock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(() => Promise.resolve(
    new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } }),
  ))
  vi.stubGlobal('fetch', mock)
  return mock
}

describe('discovery inventory queries', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('searches VMware inventory with the provider as param and filters as body', async () => {
    const mock = stubFetch({ count: 0, vms: [] })
    await vmwareInventoryQuery({ providerId: ' vcenter-01 ', folderName: 'Apps', tag: 'prod', namePrefix: 'WEB' }).queryFn({ signal })

    expect(mock.mock.calls[0]?.[0]).toBe('/api/vms/search?provider_id=vcenter-01')
    expect(mock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(mock.mock.calls[0]?.[1]?.body as string)).toEqual({ folder_name: 'Apps', tag: 'prod', name_prefix: 'WEB' })
  })

  it('sends force_refresh only for a live refresh', async () => {
    const mock = stubFetch({ count: 0, vms: [] })
    await fetchVmwareInventoryLive({ providerId: 'vcenter-01' })

    expect(JSON.parse(mock.mock.calls[0]?.[1]?.body as string)).toEqual({ force_refresh: true })
  })

  it('keeps vendor LPAR fields through validation for the power mapper', async () => {
    stubFetch({
      count: 1,
      counts_by_type: { LogicalPartition: 1, VirtualIOServer: 0 },
      vms: [{ lpar: { PartitionName: 'lpar-a', OperatingSystemType: 'AIX' }, vios: {} }],
    })
    const response = await powerInventoryQuery('power-01').queryFn({ signal })
    const inventory = createPowerInventorySelect('power-01')(response)

    expect(inventory.partitions[0]).toMatchObject({ partitionName: 'lpar-a', operatingSystemType: 'AIX', providerId: 'power-01' })
  })

  it('loads FlashSystem volumes for a provider and keeps vendor volume fields', async () => {
    const mock = stubFetch({ count: 1, volumes: [{ name: 'VOL-01', vendor_flag: 'x' }], pools: {}, hosts: {}, clusters: {} })
    const response = await flashSystemInventoryQuery('flash-01').queryFn({ signal })
    const inventory = createFlashSystemInventorySelect('flash-01')(response)

    expect(mock.mock.calls[0]?.[0]).toBe('/api/get_volumes?provider_id=flash-01')
    expect(inventory.resources[0]).toMatchObject({ name: 'VOL-01', providerId: 'flash-01' })
    expect(inventory.volumes[0]).toMatchObject({ vendor_flag: 'x', status: 'unknown' })
  })

  it('requests vdisks using only the VM and compute provider from the current contract', async () => {
    const mock = stubFetch({ name: 'VM-01', count_vm: 0, count_ibm: 0, vdisks: {} })
    const response = await vdisksByVmQuery('VM-01', 'vcenter-01').queryFn({ signal })

    expect(mock.mock.calls[0]?.[0]).toBe('/api/vdisks_by_vm?vm_name=VM-01&provider_id=vcenter-01')
    expect(selectVdisks(response).volumes).toEqual([])
  })

  it('loads tags for a provider', async () => {
    const mock = stubFetch({ count: 0, tags: [] })
    await tagsQuery('vcenter-01').queryFn({ signal })

    expect(mock.mock.calls[0]?.[0]).toBe('/api/tags?provider_id=vcenter-01')
  })
})
