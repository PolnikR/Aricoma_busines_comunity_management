import { describe, expect, it } from 'vitest'
import { SnapshotPoliciesResponse, SnapshotPolicy, SnapshotPolicyRecord, SubmitPolicyBody } from '@/generated/query/zod'

const legacyPolicy = {
  id: 'hourly', name: 'Hourly', frequency_value: 1, frequency_unit: 'hours',
  retention_value: 1, retention_unit: 'days',
}

describe.each([
  ['SnapshotPolicy', SnapshotPolicy],
  ['SnapshotPolicyRecord', SnapshotPolicyRecord],
  ['SubmitPolicyBody', SubmitPolicyBody],
] as const)('%s FlashCopy contract', (_name, schema) => {
  it('defaults legacy records to zero', () => {
    expect(schema.parse(legacyPolicy).flashcopy_copy_rate).toBe(0)
  })

  it.each([0, 50, 150])('preserves valid rate %s', rate => {
    expect(schema.parse({ ...legacyPolicy, flashcopy_copy_rate: rate }).flashcopy_copy_rate).toBe(rate)
  })

  it.each([-1, 151, 10.5])('rejects invalid rate %s', rate => {
    expect(schema.safeParse({ ...legacyPolicy, flashcopy_copy_rate: rate }).success).toBe(false)
  })
})

describe('SnapshotPoliciesResponse FlashCopy contract', () => {
  it('defaults legacy records to zero', () => {
    expect(SnapshotPoliciesResponse.parse({ snapshot_policies: [legacyPolicy] }).snapshot_policies[0]?.flashcopy_copy_rate).toBe(0)
  })

  it.each([0, 50, 150])('preserves valid rate %s', rate => {
    const result = SnapshotPoliciesResponse.parse({ snapshot_policies: [{ ...legacyPolicy, flashcopy_copy_rate: rate }] })
    expect(result.snapshot_policies[0]?.flashcopy_copy_rate).toBe(rate)
  })

  it.each([-1, 151, 10.5])('rejects invalid rate %s', rate => {
    expect(SnapshotPoliciesResponse.safeParse({ snapshot_policies: [{ ...legacyPolicy, flashcopy_copy_rate: rate }] }).success).toBe(false)
  })
})
