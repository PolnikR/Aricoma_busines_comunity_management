import { afterEach, describe, expect, it, vi } from 'vitest'
import type {
  RecoveryAppPolicy,
  RecoveryAppPolicySubmitData,
} from '../model/recoveryAppPolicyTypes'
import {
  deleteRecoveryAppPolicy,
  fetchRecoveryAppPolicies,
  submitRecoveryAppPolicy,
} from './recoveryAppPoliciesApi'

const policy: RecoveryAppPolicy = {
  id: 'high-weekly-timerange',
  name: 'High - Weekly DR Test',
  description: 'Weekly recovery test using a snapshot no older than 2 hours.',
  level: 'high',
  frequencyValue: 7,
  frequencyUnit: 'days',
  retentionValue: 1,
  retentionUnit: 'days',
  bootVerify: true,
  snapshotSelectionMode: 'time_range',
  snapshotMaxAgeValue: 2,
  snapshotMaxAgeUnit: 'hours',
  snapshotTargetTime: null,
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
  boot_verify: policy.bootVerify,
  snapshot_selection_mode: policy.snapshotSelectionMode,
  snapshot_max_age_value: policy.snapshotMaxAgeValue,
  snapshot_max_age_unit: policy.snapshotMaxAgeUnit,
  snapshot_target_time: policy.snapshotTargetTime,
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

describe('fetchRecoveryAppPolicies', () => {
  it('loads, validates and normalizes the complete policy response', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [wirePolicy] })

    await expect(fetchRecoveryAppPolicies()).resolves.toEqual([policy])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/get_recovery_app_policies')
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
  })

  it.each([
    ['missing policy list', {}],
    ['invalid selection mode', { recovery_app_policies: [{ ...wirePolicy, snapshot_selection_mode: 'oldest' }] }],
    ['invalid nullable age', { recovery_app_policies: [{ ...wirePolicy, snapshot_max_age_value: 0 }] }],
  ])('rejects malformed responses: %s', async (_case, payload) => {
    stubFetch(payload)
    await expect(fetchRecoveryAppPolicies()).rejects.toBeInstanceOf(Error)
  })

  it('throws a stable error for an unsuccessful list request', async () => {
    stubFetch(null, 503)
    await expect(fetchRecoveryAppPolicies()).rejects.toThrow(
      'Get recovery app policies request failed with status 503',
    )
  })
})

describe('submitRecoveryAppPolicy', () => {
  it('maps the frontend model to the backend contract and validates the response', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [wirePolicy] })
    const submitData: RecoveryAppPolicySubmitData = { ...policy }

    await expect(submitRecoveryAppPolicy(submitData)).resolves.toEqual([policy])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_recovery_app_policy')
    expect(init.method).toBe('POST')
    expect(init.body).toBe(JSON.stringify(wirePolicy))
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('rejects invalid input before calling the backend', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [] })

    await expect(
      submitRecoveryAppPolicy({ ...policy, snapshotMaxAgeValue: 0 }),
    ).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('deleteRecoveryAppPolicy', () => {
  it('URL-encodes policy_id and validates the returned list', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [] })

    await expect(deleteRecoveryAppPolicy('high/main weekly')).resolves.toEqual([])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/delete_recovery_app_policy?policy_id=high%2Fmain%20weekly')
    expect(init.method).toBe('DELETE')
  })

  it('rejects an empty policy id without calling the backend', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [] })

    await expect(deleteRecoveryAppPolicy('')).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
