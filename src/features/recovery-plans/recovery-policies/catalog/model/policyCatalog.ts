import type { CleanRoomPolicyRecordOutput, PolicySetRecordOutput, RecoveryAppPolicyRecordOutput, SnapshotPolicyRecordOutput } from '@/generated/query/zod'

export interface PolicyByKind {
  snapshot: SnapshotPolicyRecordOutput
  recoveryApp: RecoveryAppPolicyRecordOutput
  cleanRoom: CleanRoomPolicyRecordOutput
}
export type PolicyKind = keyof PolicyByKind

interface CatalogActivity { isFetching: boolean; isRefreshing: boolean; isPaused: boolean }
export type CatalogSource<T> = CatalogActivity & (
  | { status: 'loading'; items: undefined; error: null }
  | { status: 'ready' | 'empty'; items: readonly T[]; error: null }
  | { status: 'error'; items: undefined; error: Error }
  | { status: 'cachedError'; items: readonly T[]; error: Error }
)
export type PolicyReference<T> =
  | { status: 'resolved'; id: string; policy: T; verification: 'lastSuccess' | 'cachedAfterError' }
  | { status: 'missing'; id: string; verification: 'lastSuccess' }
  | { status: 'notConfigured' }
  | { status: 'unknown'; id: string; reason: 'loading' | 'error' | 'cachedError' }

export interface PolicySetResolution {
  snapshot: PolicyReference<SnapshotPolicyRecordOutput>
  recoveryApp: PolicyReference<RecoveryAppPolicyRecordOutput>
  cleanRoom: PolicyReference<CleanRoomPolicyRecordOutput>
  summary: 'resolved' | 'loading' | 'incomplete' | 'cachedError'
}
export interface PolicyCatalog {
  sources: { [K in PolicyKind]: CatalogSource<PolicyByKind[K]> }
  resolve: <K extends PolicyKind>(kind: K, id: string | null | undefined) => PolicyReference<PolicyByKind[K]>
  resolvePolicySet: (policySet: Pick<PolicySetRecordOutput, 'snapshot_policy_id' | 'recovery_app_policy_id' | 'clean_room_policy_id'>) => PolicySetResolution
  retry: (kind: PolicyKind) => Promise<void>
}

export type QuerySnapshot<T> = {
  data: readonly T[] | undefined
  fetchStatus: 'idle' | 'fetching' | 'paused'
} & (
  | { status: 'pending' | 'success'; error: null }
  | { status: 'error'; error: Error }
)

export function normalizeSource<T>(query: QuerySnapshot<T>): CatalogSource<T> {
  const activity = {
    isFetching: query.fetchStatus === 'fetching',
    isRefreshing: query.data !== undefined && query.fetchStatus === 'fetching',
    isPaused: query.fetchStatus === 'paused',
  }
  if (query.status === 'error') {
    return query.data === undefined
      ? { ...activity, status: 'error', items: undefined, error: query.error }
      : { ...activity, status: 'cachedError', items: query.data, error: query.error }
  }
  if (query.data === undefined) return { ...activity, status: 'loading', items: undefined, error: null }
  return { ...activity, status: query.data.length ? 'ready' : 'empty', items: query.data, error: null }
}

export function resolveReference<T extends { id: string }>(source: CatalogSource<T>, id: string | null | undefined): PolicyReference<T> {
  if (!id) return { status: 'notConfigured' }
  const policy = source.items?.find(item => item.id === id)
  if (policy) return { status: 'resolved', id, policy, verification: source.status === 'cachedError' ? 'cachedAfterError' : 'lastSuccess' }
  if (source.status === 'ready' || source.status === 'empty') return { status: 'missing', id, verification: 'lastSuccess' }
  return { status: 'unknown', id, reason: source.status }
}

export function createPolicyCatalog(sources: PolicyCatalog['sources'], retry: PolicyCatalog['retry']): PolicyCatalog {
  const resolve: PolicyCatalog['resolve'] = (kind, id) => resolveReference<PolicyByKind[typeof kind]>(sources[kind], id)
  return {
    sources,
    resolve,
    retry,
    resolvePolicySet(policySet) {
      const snapshot = resolve('snapshot', policySet.snapshot_policy_id)
      const recoveryApp = resolve('recoveryApp', policySet.recovery_app_policy_id)
      const cleanRoom = resolve('cleanRoom', policySet.clean_room_policy_id)
      const references = [snapshot, recoveryApp, cleanRoom]
      let summary: PolicySetResolution['summary'] = 'resolved'
      if (references.some(ref => ref.status === 'missing' || ref.status === 'notConfigured' || (ref.status === 'unknown' && ref.reason !== 'loading'))) summary = 'incomplete'
      else if (references.some(ref => ref.status === 'unknown')) summary = 'loading'
      else if (references.some(ref => ref.status === 'resolved' && ref.verification === 'cachedAfterError')) summary = 'cachedError'
      return { snapshot, recoveryApp, cleanRoom, summary }
    },
  }
}
