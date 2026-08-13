import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SnapshotPolicy, SnapshotPolicySubmitData } from '../model/snapshotPolicyTypes'
import {
  deleteSnapshotPolicy,
  fetchSnapshotPolicies,
  submitSnapshotPolicy,
} from './snapshotPoliciesApi'

const policy: SnapshotPolicy = {
  id: 'critical-15m',
  name: 'Critical — 15 min',
  description: 'Every 15 minutes, retained 3 hours.',
  level: 'critical',
  frequencyValue: 15,
  frequencyUnit: 'minutes',
  retentionValue: 3,
  retentionUnit: 'hours',
  maxSnapshots: 12,
  enabled: true,
}

const wirePolicy = {
  id: policy.id,
  name: policy.name,
  description: policy.description,
  level: policy.level,
  frequency_value: policy.frequencyValue,
  frequency_unit: policy.frequencyUnit,
  retention_value: policy.retentionValue,
  retention_unit: policy.retentionUnit,
  max_snapshots: policy.maxSnapshots,
  enabled: policy.enabled,
}

function stubFetch(payload: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(payload === null ? null : JSON.stringify(payload), { status }),
  )
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('fetchSnapshotPolicies', () => {
  it('loads, validates and normalizes snapshot policies', async () => {
    const fetchMock = stubFetch({
      snapshot_policies: [wirePolicy, { ...wirePolicy, id: 'archive', max_snapshots: null }],
    })

    await expect(fetchSnapshotPolicies()).resolves.toEqual([
      policy,
      { ...policy, id: 'archive', maxSnapshots: null },
    ])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_policies')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it('applies the generated enabled default and normalizes nullable labels', async () => {
    stubFetch({
      snapshot_policies: [{
        ...wirePolicy,
        description: null,
        level: null,
        enabled: undefined,
      }],
    })

    await expect(fetchSnapshotPolicies()).resolves.toEqual([{
      ...policy,
      description: '',
      level: '',
      enabled: true,
    }])
  })

  it.each([
    ['missing policy list', {}],
    ['invalid frequency', { snapshot_policies: [{ ...wirePolicy, frequency_value: 0 }] }],
    ['invalid unit', { snapshot_policies: [{ ...wirePolicy, frequency_unit: 'weeks' }] }],
  ])('rejects malformed responses: %s', async (_case, payload) => {
    stubFetch(payload)
    await expect(fetchSnapshotPolicies()).rejects.toBeInstanceOf(Error)
  })

  it('throws a stable error for an unsuccessful list request', async () => {
    stubFetch(null, 503)
    await expect(fetchSnapshotPolicies()).rejects.toThrow(
      'Get snapshot policies request failed with status 503',
    )
  })
})

describe('submitSnapshotPolicy', () => {
  it('maps the frontend model to the backend contract and validates the response', async () => {
    const fetchMock = stubFetch({ snapshot_policies: [wirePolicy] })
    const submitData: SnapshotPolicySubmitData = { ...policy }

    await expect(submitSnapshotPolicy(submitData)).resolves.toEqual([policy])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_policy')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(wirePolicy))
    const headers = new Headers(init.headers)
    expect(headers.get('X-User')).toBe('admin')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('rejects invalid input before calling the backend', async () => {
    const fetchMock = stubFetch({ snapshot_policies: [] })

    await expect(submitSnapshotPolicy({ ...policy, retentionValue: 0 })).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('deleteSnapshotPolicy', () => {
  it('URL-encodes policy_id and validates the returned list', async () => {
    const fetchMock = stubFetch({ snapshot_policies: [] })

    await expect(deleteSnapshotPolicy('critical/main 15m')).resolves.toEqual([])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/delete_policy?policy_id=critical%2Fmain+15m')
    expect(init.method).toBe('DELETE')
  })

  it('rejects an empty policy id without calling the backend', async () => {
    const fetchMock = stubFetch({ snapshot_policies: [] })

    await expect(deleteSnapshotPolicy('')).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
