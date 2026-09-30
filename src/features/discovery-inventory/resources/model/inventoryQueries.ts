import { getGetPowerVmQueryKey, getPowerVm } from '@/generated/query/ibm-power/ibm-power.gen'
import { getGetVdisksByVmQueryKey, getVdisksByVm } from '@/generated/query/discovery/discovery.gen'
import { getGetVolumesQueryKey, getVolumes } from '@/generated/query/storage-volumes/storage-volumes.gen'
import {
  getGetTagsQueryKey,
  getPostVmsSearchQueryKey,
  getTags,
  postVmsSearch,
} from '@/generated/query/vcenter-inventory/vcenter-inventory.gen'
import type {
  PowerVmsResponse,
  TagsResponse,
  VdisksByVmResponse,
  VdisksByVmResponseOutput,
  VmSearchFilter,
  VmsResponse,
  VmsResponseOutput,
  VolumesResponse,
  VolumesResponseOutput,
} from '@/generated/query/zod'
import { mapFlashSystemInventory } from '../helpers/mapFlashSystemInventory'
import { mapPowerInventory } from '../helpers/mapPowerInventory'
import { mapTags } from '../helpers/mapTags'
import { mapVdisks } from '../helpers/mapVmStorageVolumes'
import { mapVmwareInventory } from '../helpers/mapVmwareInventory'

// Query definitions for the discovery inventory, built only from generated
// fetchers and query keys. The cache holds the validated wire response; the
// mapping to UI inventories runs as `select`. validatingMutator returns the
// parsed Output shape, so the selects read the generated *Output types.

export interface VmwareInventorySearch {
  providerId?: string
  folderName?: string
  tag?: string
  namePrefix?: string
}

export function normalizeVmwareInventorySearch(search: VmwareInventorySearch = {}): VmwareInventorySearch {
  const normalized: VmwareInventorySearch = {}
  for (const field of ['providerId', 'folderName', 'tag', 'namePrefix'] as const) {
    const trimmed = search[field]?.trim()
    if (trimmed) normalized[field] = trimmed
  }
  return normalized
}

function vmwareSearchRequest(search: VmwareInventorySearch, forceRefresh = false) {
  const normalized = normalizeVmwareInventorySearch(search)
  const body: VmSearchFilter = {
    ...(normalized.folderName ? { folder_name: normalized.folderName } : {}),
    ...(normalized.tag ? { tag: normalized.tag } : {}),
    ...(normalized.namePrefix ? { name_prefix: normalized.namePrefix } : {}),
    ...(forceRefresh ? { force_refresh: true } : {}),
  }
  const params = normalized.providerId ? { provider_id: normalized.providerId } : undefined
  return { body, params }
}

export function vmwareInventoryQuery(search: VmwareInventorySearch) {
  const { body, params } = vmwareSearchRequest(search)
  return {
    queryKey: getPostVmsSearchQueryKey(body, params),
    queryFn: ({ signal }: { signal: AbortSignal }) => postVmsSearch(body, params, { signal }),
  }
}

// A live refresh bypasses the backend cache; its result is stored under the
// regular (non-forced) key of the same search.
export function fetchVmwareInventoryLive(search: VmwareInventorySearch) {
  const { body, params } = vmwareSearchRequest(search, true)
  return postVmsSearch(body, params)
}

export const selectVmwareInventory = (response: VmsResponse) => mapVmwareInventory(response as VmsResponseOutput)

export function powerInventoryQuery(providerId?: string) {
  const params = providerId ? { provider_id: providerId } : undefined
  return {
    queryKey: getGetPowerVmQueryKey(params),
    queryFn: ({ signal }: { signal: AbortSignal }) => getPowerVm(params, { signal }),
  }
}

export const createPowerInventorySelect = (providerId?: string) =>
  (response: PowerVmsResponse) => mapPowerInventory(response, providerId)

export function flashSystemInventoryQuery(providerId?: string) {
  const params = providerId ? { provider_id: providerId } : undefined
  return {
    queryKey: getGetVolumesQueryKey(params),
    queryFn: ({ signal }: { signal: AbortSignal }) => getVolumes(params, { signal }),
  }
}

export const createFlashSystemInventorySelect = (providerId?: string) =>
  (response: VolumesResponse) => mapFlashSystemInventory(response as VolumesResponseOutput, providerId)

export function vdisksByVmQuery(vmName: string, providerId?: string) {
  const params = {
    vm_name: vmName,
    ...(providerId ? { provider_id: providerId } : {}),
  }
  return {
    queryKey: getGetVdisksByVmQueryKey(params),
    queryFn: ({ signal }: { signal: AbortSignal }) => getVdisksByVm(params, { signal }),
  }
}

export const selectVdisks = (response: VdisksByVmResponse) => mapVdisks(response as VdisksByVmResponseOutput)

export function tagsQuery(providerId: string) {
  const params = { provider_id: providerId }
  return {
    queryKey: getGetTagsQueryKey(params),
    queryFn: ({ signal }: { signal: AbortSignal }) => getTags(params, { signal }),
  }
}

export const selectTags = (response: TagsResponse) => mapTags(response)
