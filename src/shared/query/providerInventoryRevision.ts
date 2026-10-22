import type { QueryClient } from '@tanstack/react-query'

export type ProviderInventoryRevision = Readonly<{
  providerRevision: number
  infraEpoch: number
}>

interface RevisionState {
  providers: Map<string, number>
  infraEpoch: number
}

// Validity metadata only: shared by a client's consumers, independent of query GC.
const revisions = new WeakMap<QueryClient, RevisionState>()

function revisionState(client: QueryClient): RevisionState {
  let state = revisions.get(client)
  if (!state) {
    state = { providers: new Map(), infraEpoch: 0 }
    revisions.set(client, state)
  }
  return state
}

export function getProviderInventoryRevision(client: QueryClient, providerId: string): ProviderInventoryRevision {
  const state = revisionState(client)
  return { providerRevision: state.providers.get(providerId) ?? 0, infraEpoch: state.infraEpoch }
}

export function isProviderInventoryRevisionCurrent(client: QueryClient, providerId: string, snapshot: ProviderInventoryRevision): boolean {
  const current = getProviderInventoryRevision(client, providerId)
  return current.providerRevision === snapshot.providerRevision && current.infraEpoch === snapshot.infraEpoch
}

// Omitted IDs mean the credential relationship is incomplete: invalidate all infra results.
export function invalidateProviderInventoryRevision(client: QueryClient, providerIds?: Iterable<string>): void {
  const state = revisionState(client)
  if (providerIds === undefined) {
    state.infraEpoch += 1
  } else {
    for (const id of providerIds) state.providers.set(id, (state.providers.get(id) ?? 0) + 1)
  }
}
