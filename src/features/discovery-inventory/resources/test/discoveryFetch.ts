import { vi } from 'vitest'

// Stubs the real fetch for the discovery inventory endpoints. Each endpoint is
// routed to a vi.fn named after the former API function, called with the same
// arguments (provider id, or the camelCase VMware search), so tests keep their
// assertions while the generated hooks and validatingMutator run for real. A
// handler returns the wire payload; the defaults are empty inventories.

export interface VmwareSearchCall {
  providerId?: string
  folderName?: string
  tag?: string
  namePrefix?: string
  forceRefresh?: boolean
}

export const emptyVolumesResponse = { count: 0, volumes: [], pools: {}, hosts: {}, clusters: {} }
export const emptyPowerResponse = { count: 0, counts_by_type: { LogicalPartition: 0, VirtualIOServer: 0 }, vms: [] }
export const emptyVmsResponse = { count: 0, vms: [] }

export function createDiscoveryFetchHandlers() {
  return {
    fetchFlashSystemInventory: vi.fn<(providerId?: string) => unknown>(() => emptyVolumesResponse),
    fetchPowerInventory: vi.fn<(providerId?: string) => unknown>(() => emptyPowerResponse),
    fetchVmwareInventory: vi.fn<(search: VmwareSearchCall) => unknown>(() => emptyVmsResponse),
  }
}

export type DiscoveryFetchHandlers = ReturnType<typeof createDiscoveryFetchHandlers>

function json(body: unknown) {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } })
}

export function installDiscoveryFetch(handlers: DiscoveryFetchHandlers) {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost')
    const providerId = url.searchParams.get('provider_id') ?? undefined
    switch (url.pathname) {
      case '/api/get_volumes':
        return json(await handlers.fetchFlashSystemInventory(providerId))
      case '/api/get_power_vm':
        return json(await handlers.fetchPowerInventory(providerId))
      case '/api/vms/search': {
        const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as Record<string, unknown>
        const search: VmwareSearchCall = {
          ...(providerId ? { providerId } : {}),
          ...(typeof body['folder_name'] === 'string' ? { folderName: body['folder_name'] } : {}),
          ...(typeof body['tag'] === 'string' ? { tag: body['tag'] } : {}),
          ...(typeof body['name_prefix'] === 'string' ? { namePrefix: body['name_prefix'] } : {}),
          ...(body['force_refresh'] === true ? { forceRefresh: true } : {}),
        }
        return json(await handlers.fetchVmwareInventory(search))
      }
      default:
        throw new Error(`unexpected fetch: ${input}`)
    }
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}
