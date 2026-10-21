import type { MutationKey, Query, QueryClient } from '@tanstack/react-query'
import { STANDARD_STALE_TIME_MS } from './cachePolicy'

const inventoryEndpoints = new Set(['/get_power_vm', '/get_volumes', '/tags', '/vdisks_by_vm', '/get_volume_tree'])

function record(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? value as Record<string, unknown> : {}
}

function dependentProvider(query: Query, platform: boolean): string | undefined | false {
  const key = query.queryKey
  const endpoint = key[0] === 'POST' ? key[1] : key[0]
  if (platform ? endpoint !== '/get_orchestrator_runs' : endpoint !== '/vms/search' && !inventoryEndpoints.has(String(endpoint))) return false
  const params = key[0] === 'POST' ? key[2] : key[1]
  const id = record(params)['provider_id']
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

function credentialProviders(client: QueryClient, credentialId: string, platform: boolean) {
  const endpoint = platform ? '/get_platform_providers' : '/get_providers'
  const queries = client.getQueryCache().findAll({ queryKey: [endpoint] })
  const ids = new Set<string>()
  let complete = false
  for (const query of queries) {
    const providers = record(query.state.data)['providers']
    if (!Array.isArray(providers)) continue
    const params = record(query.queryKey[1])
    if (providers.length > 0 && (platform ? params['type'] === 'all' : params['role'] === 'all') && !query.isStaleByTime(STANDARD_STALE_TIME_MS)) complete = true
    for (const value of providers) {
      const provider = record(value)
      if (provider['credentialId'] === credentialId && typeof provider['id'] === 'string') ids.add(provider['id'])
    }
  }
  return { ids, complete }
}

async function refreshCredentialDependents(client: QueryClient, credentialId: string) {
  // Capture both namespaces before provider-list refetches can replace their data.
  const infra = credentialProviders(client, credentialId, false)
  const platform = credentialProviders(client, credentialId, true)
  const predicate = (query: Query) => {
    for (const [isPlatform, scope] of [[false, infra], [true, platform]] as const) {
      const provider = dependentProvider(query, isPlatform)
      if (provider !== false && (!scope.complete || provider === undefined || scope.ids.has(provider))) return true
    }
    return false
  }
  await client.cancelQueries({ predicate })
  await Promise.all([
    client.invalidateQueries({ predicate }),
    client.invalidateQueries({ queryKey: ['/get_providers'] }),
    client.invalidateQueries({ queryKey: ['/get_platform_providers'] }),
  ])
}

export async function invalidateProviderMutation(client: QueryClient, key: MutationKey | undefined, variables: unknown) {
  if (key?.length !== 1) return
  const name = key[0]
  const value = record(variables)
  if (name === 'submitCredential' || name === 'deleteCredential') {
    const id = name === 'submitCredential' ? record(value['data'])['id'] : record(value['params'])['credential_id']
    if (typeof id === 'string') await refreshCredentialDependents(client, id)
    return
  }
  if (name !== 'submitProvider' && name !== 'deleteProvider' && name !== 'submitPlatformProvider' && name !== 'deletePlatformProvider') return
  const deleted = name === 'deleteProvider' || name === 'deletePlatformProvider'
  const id = deleted ? record(value['params'])['provider_id'] : record(value['data'])['id']
  if (typeof id !== 'string') return
  await refreshDependents(client, id, name === 'submitPlatformProvider' || name === 'deletePlatformProvider', deleted)
}
