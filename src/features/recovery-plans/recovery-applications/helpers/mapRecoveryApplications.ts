import type {
  RecoveryAppRecordOutput,
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
      id: tier.recovery_group.id,
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
    rawRecord: record,
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

export function toRecoveryApplicationJson(
  application: RecoveryApplicationListItem,
): RecoveryAppRecordOutput | object {
  if (application.rawRecord) return application.rawRecord

  return {
    id: application.id,
    ...(application.policySetId !== undefined ? { policy_set_id: application.policySetId } : {}),
    application: application.data.application,
    ...(application.airflowRunId !== undefined ? { airflow_run_id: application.airflowRunId } : {}),
    ...(application.pushToOrchestrator !== undefined
      ? { push_to_orchestrator: application.pushToOrchestrator }
      : {}),
  }
}
