import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PolicySet, PolicySetSubmitData } from '../model/policySetTypes'
import {
  deletePolicySet,
  fetchPolicySets,
  submitPolicySet,
} from './policySetsApi'

const policySet: PolicySet = {
  id: 'tier2-apps',
  name: 'Tier 2 applications',
  description: 'Policy set using the medium-tier, 6-hour cadence.',
  snapshotPolicyIds: ['medium-6h'],
  recoveryAppPolicyId: 'critical-daily-latest',
}

const wirePolicySet = {
  id: policySet.id,
  name: policySet.name,
  description: policySet.description,
  snapshot_policy_ids: policySet.snapshotPolicyIds,
  recovery_app_policy_id: policySet.recoveryAppPolicyId,
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

describe('fetchPolicySets', () => {
  it('loads, validates and normalizes policy sets', async () => {
    const fetchMock = stubFetch({
      policy_sets: [wirePolicySet, { ...wirePolicySet, id: 'archive', snapshot_policy_ids: ['low-24h'] }],
    })

    await expect(fetchPolicySets()).resolves.toEqual([
      policySet,
      { ...policySet, id: 'archive', snapshotPolicyIds: ['low-24h'] },
    ])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_policy_sets')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it.each([
    ['missing policy set list', {}],
    ['empty snapshot policy ids', { policy_sets: [{ ...wirePolicySet, snapshot_policy_ids: [] }] }],
    ['missing recovery app policy id', { policy_sets: [{ ...wirePolicySet, recovery_app_policy_id: '' }] }],
  ])('rejects malformed responses: %s', async (_case, payload) => {
    stubFetch(payload)
    await expect(fetchPolicySets()).rejects.toBeInstanceOf(Error)
  })

  it('throws a stable error for an unsuccessful list request', async () => {
    stubFetch(null, 503)
    await expect(fetchPolicySets()).rejects.toThrow(
      'Get policy sets request failed with status 503',
    )
  })
})

describe('submitPolicySet', () => {
  it('maps the frontend model to the backend contract and validates the response', async () => {
    const fetchMock = stubFetch({ policy_sets: [wirePolicySet] })
    const submitData: PolicySetSubmitData = { ...policySet }

    await expect(submitPolicySet(submitData)).resolves.toEqual([policySet])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_policy_set')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(wirePolicySet))
    const headers = new Headers(init.headers)
    expect(headers.get('X-User')).toBe('admin')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('rejects invalid input before calling the backend', async () => {
    const fetchMock = stubFetch({ policy_sets: [] })

    await expect(submitPolicySet({ ...policySet, snapshotPolicyIds: [] })).rejects.toBeInstanceOf(Error)
    await expect(submitPolicySet({ ...policySet, recoveryAppPolicyId: '' })).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('deletePolicySet', () => {
  it('URL-encodes policy_set_id and validates the returned list', async () => {
    const fetchMock = stubFetch({ policy_sets: [] })

    await expect(deletePolicySet('tier2/main apps')).resolves.toEqual([])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/delete_policy_set?policy_set_id=tier2%2Fmain%20apps')
    expect(init.method).toBe('DELETE')
  })

  it('rejects an empty policy set id without calling the backend', async () => {
    const fetchMock = stubFetch({ policy_sets: [] })

    await expect(deletePolicySet('')).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
