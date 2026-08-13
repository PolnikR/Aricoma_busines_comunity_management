import type {
  RecoveryAppsResponseOutput,
  RecoveryTierOutput,
} from '@/generated/api/zod.gen'
import type {
  RecoveryApplicationListItem,
  RecoveryTier,
} from '../model/recoveryApplicationTypes'

function mapRecoveryTier(tier: RecoveryTierOutput): RecoveryTier {
  return {
    order: tier.order,
    description: tier.description,
    recovery_group: {
      name: tier.recovery_group.name,
      vms: tier.recovery_group.vms,
    },
  }
}

export function mapRecoveryApplications(
  payload: RecoveryAppsResponseOutput,
): RecoveryApplicationListItem[] {
  return payload.applications.map((record) => ({
    id: record.id,
    ...(record.policy_set_id != null ? { policySetId: record.policy_set_id } : {}),
    data: {
      application: {
        ...record.application,
        tiers: Object.fromEntries(
          Object.entries(record.application.tiers).map(([id, tier]) => [id, mapRecoveryTier(tier)]),
        ),
      },
    },
    ...(record.airflow_run_id !== undefined ? { airflowRunId: record.airflow_run_id } : {}),
    ...(record.push_to_orchestrator != null
      ? { pushToOrchestrator: record.push_to_orchestrator }
      : {}),
  }))
}
