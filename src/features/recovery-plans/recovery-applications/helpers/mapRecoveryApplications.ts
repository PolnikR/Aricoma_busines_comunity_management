import type {
  OrchestrationStateOutput,
  RecoveryAppRecordOutput,
  RecoveryAppsResponseOutput,
  RecoveryTierOutput,
} from '@/generated/query/zod'
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
    ...(record.orchestration?.run_id !== undefined ? { airflowRunId: record.orchestration.run_id } : {}),
    ...(record.orchestration?.pushed != null
      ? { pushToOrchestrator: record.orchestration.pushed }
      : {}),
    ...(record.orchestration?.provider_id !== undefined
      ? { orchestrationProviderId: record.orchestration.provider_id }
      : {}),
  }))
}

function toOrchestrationState(application: RecoveryApplicationListItem): OrchestrationStateOutput | null {
  const orchestration: OrchestrationStateOutput = {
    ...(application.airflowRunId !== undefined ? { run_id: application.airflowRunId } : {}),
    ...(application.pushToOrchestrator !== undefined ? { pushed: application.pushToOrchestrator } : {}),
    ...(application.orchestrationProviderId !== undefined
      ? { provider_id: application.orchestrationProviderId }
      : {}),
  }
  return Object.keys(orchestration).length > 0 ? orchestration : null
}

export function toRecoveryApplicationJson(
  application: RecoveryApplicationListItem,
): RecoveryAppRecordOutput | object {
  if (application.rawRecord) return application.rawRecord

  const orchestration = toOrchestrationState(application)
  return {
    id: application.id,
    ...(application.policySetId !== undefined ? { policy_set_id: application.policySetId } : {}),
    application: application.data.application,
    ...(orchestration ? { orchestration } : {}),
  }
}
