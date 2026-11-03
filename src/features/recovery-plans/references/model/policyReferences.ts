import type { PolicySetRecord, RecoveryAppsResponse, RecoveryGroupsResponse } from '@/generated/query/zod'
import type { PolicyKind } from '../../recovery-policies/catalog/model/policyCatalog'

export interface ReferenceConsumer { id: string; name: string }
export interface PolicySetConsumers { groups: ReferenceConsumer[]; applications: ReferenceConsumer[] }

const policyFields = {
  snapshot: 'snapshot_policy_id',
  recoveryApp: 'recovery_app_policy_id',
  cleanRoom: 'clean_room_policy_id',
} as const

type PolicySetReference = Pick<PolicySetRecord, 'id' | 'name' | typeof policyFields[PolicyKind]>
type GroupReference = Pick<RecoveryGroupsResponse['recovery_groups'][number], 'id' | 'name' | 'policy_set_id'>
type AppReference = Pick<RecoveryAppsResponse['applications'][number], 'id' | 'policy_set_id'> & {
  application: Pick<RecoveryAppsResponse['applications'][number]['application'], 'name'>
}

export function findPolicyConsumers(kind: PolicyKind, policyId: string, policySets: readonly PolicySetReference[]): ReferenceConsumer[] {
  return policySets.filter(set => Boolean(policyId) && set[policyFields[kind]] === policyId)
    .map(({ id, name }) => ({ id, name }))
}

export function findPolicySetConsumers(policySetId: string, groups: readonly GroupReference[], applications: readonly AppReference[]): PolicySetConsumers {
  return {
    groups: groups.filter(group => Boolean(policySetId) && group.policy_set_id === policySetId).map(({ id, name }) => ({ id, name })),
    applications: applications.filter(app => Boolean(policySetId) && app.policy_set_id === policySetId).map(app => ({ id: app.id, name: app.application.name })),
  }
}
