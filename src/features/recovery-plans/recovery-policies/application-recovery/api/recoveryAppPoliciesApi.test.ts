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

const latestPolicy: RecoveryAppPolicy = {
  id: 'critical-daily-latest',
  name: 'Critical - Daily DR Test',
  description: 'Daily recovery test using the newest available snapshot.',
  level: 'critical',
  frequencyValue: 1,
  frequencyUnit: 'days',
  retentionValue: 4,
  retentionUnit: 'hours',
  bootVerify: true,
  snapshotSelectionMode: 'latest',
  snapshotMaxAgeValue: null,
  snapshotMaxAgeUnit: null,
  snapshotTargetTime: null,
  enabled: true,
}

const latestWirePolicy = {
  id: latestPolicy.id,
  name: latestPolicy.name,
  description: latestPolicy.description,
  level: latestPolicy.level,
  frequency_value: latestPolicy.frequencyValue,
  frequency_unit: latestPolicy.frequencyUnit,
  retention_value: latestPolicy.retentionValue,
  retention_unit: latestPolicy.retentionUnit,
  boot_verify: latestPolicy.bootVerify,
  snapshot_selection_mode: latestPolicy.snapshotSelectionMode,
  snapshot_max_age_value: latestPolicy.snapshotMaxAgeValue,
  snapshot_max_age_unit: latestPolicy.snapshotMaxAgeUnit,
  snapshot_target_time: latestPolicy.snapshotTargetTime,
  enabled: latestPolicy.enabled,
}

const exactTimePolicy: RecoveryAppPolicy = {
  ...latestPolicy,
  id: 'medium-monthly-exacttime',
  name: 'Medium - Monthly DR Test',
  description: 'Monthly recovery test using the snapshot closest to 02:00.',
  level: 'medium',
  frequencyValue: 30,
  retentionValue: 2,
  retentionUnit: 'days',
  snapshotSelectionMode: 'exact_time',
  snapshotTargetTime: '02:00',
}

const exactTimeWirePolicy = {
  ...latestWirePolicy,
  id: exactTimePolicy.id,
  name: exactTimePolicy.name,
  description: exactTimePolicy.description,
  level: exactTimePolicy.level,
  frequency_value: exactTimePolicy.frequencyValue,
  retention_unit: exactTimePolicy.retentionUnit,
  retention_value: exactTimePolicy.retentionValue,
  snapshot_selection_mode: exactTimePolicy.snapshotSelectionMode,
  snapshot_target_time: exactTimePolicy.snapshotTargetTime,
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
    const submitData: RecoveryAppPolicySubmitData = {
      id: policy.id,
      name: policy.name,
      description: policy.description,
      level: policy.level,
      frequencyValue: policy.frequencyValue,
      frequencyUnit: policy.frequencyUnit,
      retentionValue: policy.retentionValue,
      retentionUnit: policy.retentionUnit,
      bootVerify: policy.bootVerify,
      snapshotSelectionMode: 'time_range',
      snapshotMaxAgeValue: 2,
      snapshotMaxAgeUnit: 'hours',
      enabled: policy.enabled,
    }

    await expect(submitRecoveryAppPolicy(submitData)).resolves.toEqual([policy])

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/submit_recovery_app_policy')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body as string)).toEqual({
      id: policy.id, name: policy.name, description: policy.description, level: policy.level,
      frequency_value: 7, frequency_unit: 'days', retention_value: 1, retention_unit: 'days',
      boot_verify: true, snapshot_selection_mode: 'time_range', snapshot_max_age_value: 2,
      snapshot_max_age_unit: 'hours', enabled: true,
    })
    expect(new Headers(init.headers).get('X-User')).toBe('admin')
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json')
  })

  it('omits all mode-specific fields for latest selection', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [latestWirePolicy] })
    const submitData = {
      id: latestPolicy.id,
      name: latestPolicy.name,
      description: latestPolicy.description,
      level: latestPolicy.level,
      frequencyValue: latestPolicy.frequencyValue,
      frequencyUnit: latestPolicy.frequencyUnit,
      retentionValue: latestPolicy.retentionValue,
      retentionUnit: latestPolicy.retentionUnit,
      bootVerify: latestPolicy.bootVerify,
      snapshotSelectionMode: latestPolicy.snapshotSelectionMode,
      enabled: latestPolicy.enabled,
    } as unknown as RecoveryAppPolicySubmitData

    await expect(submitRecoveryAppPolicy(submitData)).resolves.toEqual([latestPolicy])

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      id: latestPolicy.id, name: latestPolicy.name, description: latestPolicy.description, level: latestPolicy.level,
      frequency_value: 1, frequency_unit: 'days', retention_value: 4, retention_unit: 'hours',
      boot_verify: true, snapshot_selection_mode: 'latest', enabled: true,
    })
  })

  it('sends only target time for exact-time selection', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [exactTimeWirePolicy] })
    const submitData = {
      id: exactTimePolicy.id,
      name: exactTimePolicy.name,
      description: exactTimePolicy.description,
      level: exactTimePolicy.level,
      frequencyValue: exactTimePolicy.frequencyValue,
      frequencyUnit: exactTimePolicy.frequencyUnit,
      retentionValue: exactTimePolicy.retentionValue,
      retentionUnit: exactTimePolicy.retentionUnit,
      bootVerify: exactTimePolicy.bootVerify,
      snapshotSelectionMode: exactTimePolicy.snapshotSelectionMode,
      snapshotTargetTime: exactTimePolicy.snapshotTargetTime,
      enabled: exactTimePolicy.enabled,
    } as unknown as RecoveryAppPolicySubmitData

    await expect(submitRecoveryAppPolicy(submitData)).resolves.toEqual([exactTimePolicy])

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(init.body as string)).toEqual({
      id: exactTimePolicy.id, name: exactTimePolicy.name, description: exactTimePolicy.description, level: exactTimePolicy.level,
      frequency_value: 30, frequency_unit: 'days', retention_value: 2, retention_unit: 'days',
      boot_verify: true, snapshot_selection_mode: 'exact_time', snapshot_target_time: '02:00', enabled: true,
    })
  })

  it('rejects invalid input before calling the backend', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [] })

    await expect(
      submitRecoveryAppPolicy({ ...policy, snapshotMaxAgeValue: 0 } as unknown as RecoveryAppPolicySubmitData),
    ).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects unsupported max_age mode before calling the backend', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [] })

    await expect(
      submitRecoveryAppPolicy({ ...latestPolicy, snapshotSelectionMode: 'max_age' } as unknown as RecoveryAppPolicySubmitData),
    ).rejects.toBeInstanceOf(Error)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('rejects mode-specific fields that do not belong to latest', async () => {
    const fetchMock = stubFetch({ recovery_app_policies: [] })

    await expect(
      submitRecoveryAppPolicy({
        ...latestPolicy,
        snapshotMaxAgeValue: 2,
        snapshotMaxAgeUnit: 'hours',
        snapshotTargetTime: '02:00',
      } as unknown as RecoveryAppPolicySubmitData),
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
