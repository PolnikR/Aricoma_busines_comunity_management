import type { MutationKey, Query, QueryClient } from '@tanstack/react-query'

const inventoryEndpoints = new Set(['/get_power_vm', '/get_volumes', '/tags', '/vdisks_by_vm', '/get_volume_tree'])

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function dependentProvider(query: Query, platform: boolean): string | undefined | false {
  const key = query.queryKey
  const endpoint = key[0] === 'POST' ? key[1] : key[0]
  if (platform ? endpoint !== '/get_orchestrator_runs' : endpoint !== '/vms/search' && !inventoryEndpoints.has(String(endpoint))) return false
  const params = key[0] === 'POST' ? key[2] : key[1]
  const id = record(params).provider_id
  return typeof id === 'string' && id ? id : undefined
}

async function refreshDependents(client: QueryClient, id: string, platform: boolean, deleted: boolean) {
  const predicate = (query: Query) => {
    const provider = dependentProvider(query, platform)
    return provider !== false && (provider === undefined || provider === id)
  }
  await client.cancelQueries({ predicate })
  if (deleted) client.removeQueries({ predicate: query => dependentProvider(query, platform) === id })
  await client.invalidateQueries({ predicate })
}

export async function invalidateProviderMutation(client: QueryClient, key: MutationKey | undefined, variables: unknown) {
  if (key?.length !== 1) return
  const name = key[0]
  if (name !== 'submitProvider' && name !== 'deleteProvider' && name !== 'submitPlatformProvider' && name !== 'deletePlatformProvider') return
  const value = record(variables)
  const deleted = name === 'deleteProvider' || name === 'deletePlatformProvider'
  const id = deleted ? record(value.params).provider_id : record(value.data).id
  if (typeof id !== 'string') return
  await refreshDependents(client, id, name === 'submitPlatformProvider' || name === 'deletePlatformProvider', deleted)
}
