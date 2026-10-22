import { describe, expect, it } from 'vitest'
import { CleanRoomPolicyRecord, RecoveryAppPolicyRecord, SnapshotPolicyRecord } from '@/generated/query/zod'
import { createPolicyCatalog, normalizeSource, resolveReference } from './policyCatalog'
import type { PolicyCatalog, QuerySnapshot } from './policyCatalog'

const cadence = { frequency_value: 1, frequency_unit: 'days', retention_value: 1, retention_unit: 'days' }
const policies = {
  snapshot: SnapshotPolicyRecord.parse({ id: 'same-id', name: 'Snapshot', ...cadence }),
  recoveryApp: RecoveryAppPolicyRecord.parse({ id: 'same-id', name: 'Recovery', ...cadence }),
  cleanRoom: CleanRoomPolicyRecord.parse({ id: 'same-id', name: 'Clean room' }),
}
const error = new Error('Unavailable')
const policySet = { snapshot_policy_id: 'same-id', recovery_app_policy_id: 'same-id', clean_room_policy_id: 'same-id' }
const retry = async () => { /* No network in the pure model. */ }

function catalog(overrides: Partial<PolicyCatalog['sources']> = {}) {
  return createPolicyCatalog({
    snapshot: normalizeSource({ status: 'success', data: [policies.snapshot], error: null, fetchStatus: 'idle' }),
    recoveryApp: normalizeSource({ status: 'success', data: [policies.recoveryApp], error: null, fetchStatus: 'idle' }),
    cleanRoom: normalizeSource({ status: 'success', data: [policies.cleanRoom], error: null, fetchStatus: 'idle' }),
    ...overrides,
  }, retry)
}

describe('policy source and reference availability', () => {
  for (const [kind, policy] of Object.entries(policies)) {
    describe(kind, () => {
      const cases = [
        { query: { status: 'pending', data: undefined, error: null }, source: 'loading', absent: 'unknown' },
        { query: { status: 'success', data: [policy], error: null }, source: 'ready', absent: 'missing' },
        { query: { status: 'success', data: [], error: null }, source: 'empty', absent: 'missing' },
        { query: { status: 'error', data: undefined, error }, source: 'error', absent: 'unknown' },
        { query: { status: 'error', data: [policy], error }, source: 'cachedError', absent: 'unknown' },
        { query: { status: 'error', data: [], error }, source: 'cachedError', absent: 'unknown' },
      ] satisfies { query: Omit<QuerySnapshot<typeof policy>, 'fetchStatus'>; source: string; absent: string }[]

      it.each(cases)('$source with $query.data preserves reference meaning', ({ query, source, absent }) => {
        const result = normalizeSource({ ...query, fetchStatus: 'idle' })
        expect(result.status).toBe(source)
        expect(result.items).toBe(query.data)
        expect(resolveReference(result, 'absent').status).toBe(absent)
        for (const id of [null, undefined, '']) expect(resolveReference(result, id)).toEqual({ status: 'notConfigured' })
        if (query.data?.length) {
          expect(resolveReference(result, policy.id)).toEqual({
            status: 'resolved', id: policy.id, policy,
            verification: source === 'cachedError' ? 'cachedAfterError' : 'lastSuccess',
          })
        }
      })
    })
  }

  it.each(['idle', 'fetching', 'paused'] as const)('derives activity for pending and cached queries (%s)', fetchStatus => {
    const loading = normalizeSource({ status: 'pending', data: undefined, error: null, fetchStatus })
    const ready = normalizeSource({ status: 'success', data: [policies.snapshot], error: null, fetchStatus })
    expect(loading).toMatchObject({ status: 'loading', isFetching: fetchStatus === 'fetching', isRefreshing: false, isPaused: fetchStatus === 'paused' })
    expect(ready).toMatchObject({ status: 'ready', isFetching: fetchStatus === 'fetching', isRefreshing: fetchStatus === 'fetching', isPaused: fetchStatus === 'paused' })
    expect(ready).not.toHaveProperty('fetchStatus')
    expect(ready).not.toHaveProperty('isStale')
    expect(ready).not.toHaveProperty('dataUpdatedAt')
  })

  it('does not normalize policy IDs or mix kinds with the same ID', () => {
    const result = catalog()
    expect(result.resolve('snapshot', 'same-id')).toMatchObject({ policy: policies.snapshot })
    expect(result.resolve('recoveryApp', 'same-id')).toMatchObject({ policy: policies.recoveryApp })
    expect(result.resolve('cleanRoom', 'same-id')).toMatchObject({ policy: policies.cleanRoom })
    expect(result.resolve('snapshot', ' same-id').status).toBe('missing')
    expect(result.resolve('snapshot', 'SAME-ID').status).toBe('missing')
    expect(result.resolvePolicySet(policySet).summary).toBe('resolved')
  })

  it('keeps cached resolved data qualified and unknown cached absences incomplete', () => {
    const cached = normalizeSource({ status: 'error', data: [policies.snapshot], error, fetchStatus: 'idle' })
    const result = catalog({ snapshot: cached })
    expect(result.resolvePolicySet(policySet).summary).toBe('cachedError')
    expect(result.resolvePolicySet({ ...policySet, snapshot_policy_id: 'absent' })).toMatchObject({
      summary: 'incomplete', snapshot: { status: 'unknown', reason: 'cachedError' },
    })
  })

  it('prioritizes incomplete over loading and loading over cached resolved data', () => {
    const pending = normalizeSource<typeof policies.cleanRoom>({ status: 'pending', data: undefined, error: null, fetchStatus: 'paused' })
    const cached = normalizeSource({ status: 'error', data: [policies.snapshot], error, fetchStatus: 'idle' })
    const result = catalog({ snapshot: cached, cleanRoom: pending })
    expect(result.resolvePolicySet(policySet).summary).toBe('loading')
    expect(result.resolvePolicySet({ ...policySet, recovery_app_policy_id: 'absent' }).summary).toBe('incomplete')
    expect(result.resolvePolicySet({ ...policySet, recovery_app_policy_id: '' }).summary).toBe('incomplete')
    expect(result.resolvePolicySet({ ...policySet, snapshot_policy_id: 'absent' }).summary).toBe('incomplete')
    expect(catalog({ snapshot: normalizeSource({ status: 'error', data: undefined, error, fetchStatus: 'idle' }) }).resolvePolicySet(policySet).summary).toBe('incomplete')
  })
})
