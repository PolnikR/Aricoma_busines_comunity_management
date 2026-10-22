import type { QueryClient } from '@tanstack/react-query'

export type ProviderInventoryRevision = Readonly<{
  providerRevision: number
  infraEpoch: number
}>

interface RevisionState {
  providers: Map<string, number>
  infraEpoch: number
  lifecycle: Map<string, { deleted: boolean }>
  listeners: Map<string, Set<() => void>>
}

// Client-local result validity and explicit deletion, independent of query GC.
const revisions = new WeakMap<QueryClient, RevisionState>()

function revisionState(client: QueryClient): RevisionState {
  let state = revisions.get(client)
  if (!state) {
    state = { providers: new Map(), infraEpoch: 0, lifecycle: new Map(), listeners: new Map() }
    revisions.set(client, state)
  }
  return state
}

export function isProviderInventoryDeleted(client: QueryClient, providerId: string | undefined): boolean {
  return providerId !== undefined && (revisionState(client).lifecycle.get(providerId)?.deleted ?? false)
}

export function subscribeProviderInventoryDeleted(client: QueryClient, providerId: string | undefined, listener: () => void): () => void {
  if (providerId === undefined) return () => undefined
  const state = revisionState(client)
  let listeners = state.listeners.get(providerId)
  if (!listeners) {
    listeners = new Set()
    state.listeners.set(providerId, listeners)
  }
  const subscription = listeners
  subscription.add(listener)
  return () => {
    subscription.delete(listener)
    if (subscription.size === 0 && state.listeners.get(providerId) === subscription) state.listeners.delete(providerId)
  }
}

// Entry identity orders only successful infra provider operations. Credential
// revisions must not supersede a pending recreate or clear a known deletion.
export function beginProviderInventoryMutation(client: QueryClient, providerId: string, deleted: boolean) {
  const state = revisionState(client)
  const previousDeleted = isProviderInventoryDeleted(client, providerId)
  const entry = { deleted: deleted || previousDeleted }
  state.lifecycle.set(providerId, entry)
  const notify = () => { state.listeners.get(providerId)?.forEach(listener => { listener() }) }
  if (entry.deleted !== previousDeleted) notify()
  const isCurrent = () => state.lifecycle.get(providerId) === entry
  return {
    isCurrent,
    complete: () => {
      // Recreate becomes observable only after its cancellation/invalidation.
      if (!deleted && isCurrent() && entry.deleted) {
        entry.deleted = false
        notify()
      }
    },
  }
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
