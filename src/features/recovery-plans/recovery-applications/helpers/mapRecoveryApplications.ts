import type {
  RecoveryApplicationListItem,
  RecoveryTier,
} from '../model/recoveryApplicationTypes'
import type {
  RecoveryApplicationListPayload,
  RecoveryTierPayload,
} from '../api/schemas/recoveryApplicationsSchema'

function mapRecoveryTier(tier: RecoveryTierPayload): RecoveryTier {
  return {
    order: tier.order,
    description: tier.description,
    ...(tier.vms ? { vms: tier.vms } : {}),
    ...(tier.recovery_group ? {
      recovery_group: {
        name: tier.recovery_group.name,
        description: tier.recovery_group.description,
        vms: tier.recovery_group.vms,
        ...(tier.recovery_group.volumes ? { volumes: tier.recovery_group.volumes } : {}),
      },
    } : {}),
  }
}

export function mapRecoveryApplications(
  payload: RecoveryApplicationListPayload,
): RecoveryApplicationListItem[] {
  return payload.applications.map((record) => ({
    id: record.id,
    policySetId: record.policy_set_id,
    data: {
      application: {
        ...record.application,
        tiers: Object.fromEntries(
          Object.entries(record.application.tiers).map(([id, tier]) => [id, mapRecoveryTier(tier)]),
        ),
      },
    },
    airflowRunId: record.airflow_run_id,
    pushToOrchestrator: record.push_to_orchestrator,
  }))
}
