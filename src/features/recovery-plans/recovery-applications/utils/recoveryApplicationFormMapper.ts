import type {
  RecoveryApplicationData,
  RecoveryApplicationFormState,
  RecoveryApplicationListItem,
  RecoveryTier,
} from '../model/recoveryApplicationTypes'

function cloneTier(tier: RecoveryTier): RecoveryTier {
  return {
    ...tier,
    vms: tier.vms.map((vm) => ({ ...vm })),
  }
}

export function toRecoveryApplicationFormState(
  application: RecoveryApplicationListItem,
): RecoveryApplicationFormState {
  const data = application.data.application

  return {
    name: data.name,
    description: data.description,
    environment: data.environment,
    tiers: new Map(
      Object.entries(data.tiers).map(([id, tier]) => [id, cloneTier(tier)]),
    ),
  }
}

export function toRecoveryApplicationData(
  formState: RecoveryApplicationFormState,
): RecoveryApplicationData {
  return {
    application: {
      name: formState.name,
      description: formState.description,
      environment: formState.environment,
      platform: 'VMware vCenter ESXi',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: Object.fromEntries(
        Array.from(formState.tiers.entries()).map(([id, tier]) => [
          id,
          {
            order: tier.order,
            description: tier.description,
            recovery_group: {
              name: tier.name,
              description: tier.recoveryGroupDescription ?? tier.description,
              vms: tier.vms.map((vm) => ({ ...vm })),
            },
          },
        ]),
      ),
    },
  }
}
