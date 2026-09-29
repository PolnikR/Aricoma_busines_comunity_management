import type { SnapshotPoliciesResponse, SnapshotPolicyRecord } from '@/generated/query/zod'

export const selectSnapshotPolicies = (response: SnapshotPoliciesResponse): SnapshotPolicyRecord[] => response.snapshot_policies
